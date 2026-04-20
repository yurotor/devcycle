import { db } from "../db";
import { logInsights, elasticConnections } from "../db/schema";
import { eq } from "drizzle-orm";
import { ElasticClient } from "./client";
import { decryptPat } from "../crypto";
import { complete, isAIAvailable } from "../anthropic";

function getClientForConnection(
  conn: typeof elasticConnections.$inferSelect
): ElasticClient {
  const apiKey = decryptPat(conn.apiKeyEncrypted, conn.apiKeyIv);
  return new ElasticClient(conn.url, apiKey);
}

export async function diagnose(insightId: number): Promise<string> {
  const insight = db
    .select()
    .from(logInsights)
    .where(eq(logInsights.id, insightId))
    .get();

  if (!insight) throw new Error("Insight not found");

  if (!isAIAvailable()) return "AI not configured";

  const conn = db
    .select()
    .from(elasticConnections)
    .where(eq(elasticConnections.id, insight.connectionId))
    .get();

  if (!conn) return "Connection not found";

  const client = getClientForConnection(conn);

  // Fetch 3 sample log entries
  const pattern = insight.messageTemplate ?? insight.exceptionClassName ?? "";
  const filterField = insight.type === "exception"
    ? "exceptions.ClassName"
    : "messageTemplate.keyword";

  const samples = await client.fetchSample(conn.indexPattern, {
    bool: {
      filter: [
        { term: { [filterField]: pattern } },
        { term: { "data_stream.namespace": insight.environment } },
      ],
    },
  }, 3);

  const sampleText = samples
    .map((s, i) => `Sample ${i + 1}:\n${JSON.stringify(s._source, null, 2)}`)
    .join("\n\n");

  const system = `You are a log analysis expert. Analyze error patterns and provide structured diagnosis.

Respond in EXACTLY this JSON format (no markdown, no code fences):
{
  "category": "data retrieval failure" or "timeout" or "configuration error" or "authentication" or "null reference" or "resource exhaustion" or "other",
  "severity": "low" or "medium" or "high" or "critical",
  "rootCause": "One or two sentences explaining the likely root cause"
}`;

  const response = await complete(
    [{
      role: "user",
      content: `Analyze this error pattern:\n\nPattern: ${pattern}\nCount: ${insight.count} occurrences in last 5 minutes\nRate: ${insight.currentRate}/5min\n\n${sampleText}`,
    }],
    { system, maxTokens: 1024 }
  );

  let diagnosisText: string;
  try {
    const parsed = JSON.parse(response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim());
    diagnosisText = `[${parsed.category}] ${parsed.rootCause}`;

    // Store samples for UI
    db.update(logInsights)
      .set({
        diagnosis: diagnosisText,
        sampleData: JSON.stringify(samples.map((s) => s._source)),
        updatedAt: Date.now(),
      })
      .where(eq(logInsights.id, insightId))
      .run();
  } catch {
    diagnosisText = response.slice(0, 500);
    db.update(logInsights)
      .set({ diagnosis: diagnosisText, updatedAt: Date.now() })
      .where(eq(logInsights.id, insightId))
      .run();
  }

  return diagnosisText;
}

export async function suggestFix(insightId: number): Promise<{
  fixSuggestion: string;
  fixPrd: string;
}> {
  const insight = db
    .select()
    .from(logInsights)
    .where(eq(logInsights.id, insightId))
    .get();

  if (!insight) throw new Error("Insight not found");
  if (!isAIAvailable()) throw new Error("AI not configured");

  const conn = db
    .select()
    .from(elasticConnections)
    .where(eq(elasticConnections.id, insight.connectionId))
    .get();

  if (!conn) throw new Error("Connection not found");

  const client = getClientForConnection(conn);

  // Fetch 5 samples + stack traces
  const pattern = insight.messageTemplate ?? insight.exceptionClassName ?? "";
  const filterField = insight.type === "exception"
    ? "exceptions.ClassName"
    : "messageTemplate.keyword";

  const samples = await client.fetchSample(conn.indexPattern, {
    bool: {
      filter: [
        { term: { [filterField]: pattern } },
        { term: { "data_stream.namespace": insight.environment } },
      ],
    },
  }, 5);

  const sampleText = samples
    .map((s, i) => `Sample ${i + 1}:\n${JSON.stringify(s._source, null, 2)}`)
    .join("\n\n");

  // Extract file paths from stack traces for KB lookup
  const stackTraces = samples
    .map((s) => {
      const src = s._source as Record<string, unknown>;
      const exceptions = src.exceptions as Array<{ StackTraceString?: string; Message?: string }> | undefined;
      return exceptions?.map((e) => e.StackTraceString).filter(Boolean).join("\n") ?? "";
    })
    .filter(Boolean)
    .join("\n\n");

  // Load relevant source from KB if stack traces have file paths
  let sourceContext = "";
  if (stackTraces && conn.repoId) {
    const fs = await import("fs");
    const path = await import("path");
    const kbRoot = path.join(process.cwd(), "..", "kb", "workspaces", String(conn.workspaceId));

    // Extract file paths from stack traces
    const filePathRegex = /(?:at\s+\S+\s+in\s+|at\s+)([A-Za-z]:\\[^\s:]+|\/[^\s:]+)/g;
    const filePaths = new Set<string>();
    let match;
    while ((match = filePathRegex.exec(stackTraces)) !== null) {
      filePaths.add(match[1]);
    }

    // Try to find matching files in KB raw analysis
    const rawDir = path.join(kbRoot, "raw");
    if (fs.existsSync(rawDir)) {
      const analysisFiles = fs.readdirSync(rawDir, { recursive: true })
        .filter((f) => String(f).endsWith("analysis.json"))
        .slice(0, 3);

      for (const af of analysisFiles) {
        try {
          const content = fs.readFileSync(path.join(rawDir, String(af)), "utf-8");
          sourceContext += `\n--- KB Analysis: ${af} ---\n${content.slice(0, 2000)}\n`;
        } catch { /* skip */ }
      }
    }
  }

  const system = `You are a senior software engineer analyzing production errors and suggesting fixes.

Given error samples, stack traces, and optionally source code context from the knowledge base, provide:
1. A specific fix description with file/method/change guidance
2. A mini PRD suitable for automated implementation

Respond in EXACTLY this JSON format (no markdown, no code fences):
{
  "fixSuggestion": "Detailed description of the fix: which file, which method, what to change and why",
  "fixPrd": "# Fix: <title>\\n\\n## Problem\\n<what's broken>\\n\\n## Solution\\n<specific changes>\\n\\n## Files to modify\\n- <file paths>\\n\\n## Acceptance criteria\\n- [ ] <criteria>"
}`;

  const response = await complete(
    [{
      role: "user",
      content: `Error pattern: ${pattern}\nDiagnosis: ${insight.diagnosis ?? "Not yet diagnosed"}\nCount: ${insight.count}\n\n${sampleText}\n\nStack traces:\n${stackTraces || "None available"}\n\n${sourceContext ? `Source context from KB:\n${sourceContext}` : ""}`,
    }],
    { system, maxTokens: 4096 }
  );

  const cleaned = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned) as { fixSuggestion: string; fixPrd: string };

  db.update(logInsights)
    .set({
      fixSuggestion: parsed.fixSuggestion,
      fixPrd: parsed.fixPrd,
      sampleData: JSON.stringify(samples.map((s) => s._source)),
      updatedAt: Date.now(),
    })
    .where(eq(logInsights.id, insightId))
    .run();

  return parsed;
}
