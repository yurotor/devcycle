import { db } from "../db";
import { nrInsights, nrConnections, elasticConnections, logInsights } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { ElasticClient } from "../elastic/client";
import { decryptPat } from "../crypto";
import { complete, isAIAvailable } from "../anthropic";
import fs from "fs";
import path from "path";

interface CrossRefData {
  elasticErrors: Array<{ template: string; count: number; severity: string }>;
  elasticSamples: Array<Record<string, unknown>>;
  kbContext: string;
}

export async function crossReference(
  insightId: number
): Promise<CrossRefData> {
  const insight = db.select().from(nrInsights).where(eq(nrInsights.id, insightId)).get();
  if (!insight) throw new Error("Insight not found");

  const conn = db.select().from(nrConnections).where(eq(nrConnections.id, insight.connectionId)).get();
  if (!conn) throw new Error("Connection not found");

  const result: CrossRefData = { elasticErrors: [], elasticSamples: [], kbContext: "" };

  // Pull Elastic logs for same workspace + recent timeframe
  const elasticConns = db
    .select()
    .from(elasticConnections)
    .where(eq(elasticConnections.workspaceId, conn.workspaceId))
    .all();

  for (const ec of elasticConns) {
    try {
      const apiKey = decryptPat(ec.apiKeyEncrypted, ec.apiKeyIv);
      const client = new ElasticClient(ec.url, apiKey);

      // Get recent error patterns from Elastic
      const relatedInsights = db
        .select()
        .from(logInsights)
        .where(
          and(
            eq(logInsights.connectionId, ec.id),
            eq(logInsights.environment, ec.environment ?? "production")
          )
        )
        .all()
        .filter((i) => i.status === "active" && (i.severity === "warning" || i.severity === "critical"))
        .slice(0, 10);

      result.elasticErrors = relatedInsights.map((i) => ({
        template: i.messageTemplate ?? i.exceptionClassName ?? "unknown",
        count: i.count,
        severity: i.severity,
      }));

      // Fetch recent error samples
      const env = ec.environment ?? "production";
      const samples = await client.fetchSample(ec.indexPattern, {
        bool: {
          filter: [
            { term: { "data_stream.namespace": env } },
            { term: { logLevel: "Error" } },
            { range: { "@timestamp": { gte: "now-10m" } } },
          ],
        },
      }, 5);

      result.elasticSamples = samples.map((s) => s._source);
    } catch (err) {
      console.error("[nr-analyzer] Elastic cross-ref failed:", (err as Error).message);
    }
  }

  // Pull KB context
  const kbRoot = path.join(process.cwd(), "..", "kb", "workspaces", String(conn.workspaceId));
  const wikiDir = path.join(kbRoot, "wiki");

  if (fs.existsSync(wikiDir)) {
    try {
      const files = fs.readdirSync(wikiDir, { recursive: true })
        .map(String)
        .filter((f) => f.endsWith(".md"))
        .slice(0, 5);

      const appNameLower = insight.appName.toLowerCase();
      const relevant = files.filter((f) => {
        const content = fs.readFileSync(path.join(wikiDir, f), "utf-8").toLowerCase();
        return content.includes(appNameLower) || content.includes("service") || content.includes("architecture");
      });

      for (const f of relevant.slice(0, 3)) {
        const content = fs.readFileSync(path.join(wikiDir, f), "utf-8");
        result.kbContext += `\n--- ${f} ---\n${content.slice(0, 2000)}\n`;
      }
    } catch { /* KB read is best-effort */ }
  }

  // Store cross-ref data
  db.update(nrInsights)
    .set({ crossRefData: JSON.stringify(result), updatedAt: Date.now() })
    .where(eq(nrInsights.id, insightId))
    .run();

  return result;
}

export async function analyzeInsight(insightId: number): Promise<string> {
  const insight = db.select().from(nrInsights).where(eq(nrInsights.id, insightId)).get();
  if (!insight) throw new Error("Insight not found");
  if (!isAIAvailable()) return "AI not configured";

  const crossRef = await crossReference(insightId);

  const metricLabels: Record<string, string> = {
    error_rate: "Error Rate",
    latency_p95: "P95 Latency",
    slow_db: "Slow DB Queries",
  };

  const elasticContext = crossRef.elasticErrors.length > 0
    ? `\nRelated Elastic Log Errors:\n${crossRef.elasticErrors.map((e) => `- ${e.template} (${e.count} hits, ${e.severity})`).join("\n")}`
    : "\nNo related Elastic log errors found.";

  const sampleContext = crossRef.elasticSamples.length > 0
    ? `\nRecent Error Samples:\n${crossRef.elasticSamples.slice(0, 3).map((s, i) => `Sample ${i + 1}: ${JSON.stringify(s, null, 2)}`).join("\n")}`
    : "";

  const system = `You are an APM analysis expert. Given NewRelic metrics, Elastic log context, and service documentation, provide root cause analysis.

Respond in EXACTLY this JSON format (no markdown, no code fences):
{
  "rootCause": "1-3 sentences explaining likely root cause",
  "nextSteps": ["step 1", "step 2", "step 3"],
  "nrqlQueries": ["helpful NRQL for further investigation"],
  "confidence": "high" or "medium" or "low"
}`;

  const userMessage = `Analyze this APM anomaly:

Service: ${insight.appName}
Metric: ${metricLabels[insight.metricType] ?? insight.metricType}
${insight.metricLabel ? `Endpoint/Query: ${insight.metricLabel}` : ""}
Current Value: ${insight.currentValue}
Baseline Value: ${insight.baselineValue}
Ratio: ${insight.baselineValue > 0 ? (insight.currentValue / insight.baselineValue).toFixed(1) : "N/A"}x
Severity: ${insight.severity}
${elasticContext}
${sampleContext}
${crossRef.kbContext ? `\nService Documentation:\n${crossRef.kbContext}` : ""}`;

  const response = await complete(
    [{ role: "user", content: userMessage }],
    { system, maxTokens: 2048 }
  );

  let diagnosis: string;
  try {
    const parsed = JSON.parse(response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim());
    diagnosis = `[${parsed.confidence}] ${parsed.rootCause}`;

    db.update(nrInsights)
      .set({
        diagnosis,
        updatedAt: Date.now(),
      })
      .where(eq(nrInsights.id, insightId))
      .run();
  } catch {
    diagnosis = response.slice(0, 500);
    db.update(nrInsights)
      .set({ diagnosis, updatedAt: Date.now() })
      .where(eq(nrInsights.id, insightId))
      .run();
  }

  return diagnosis;
}

export async function suggestFix(insightId: number): Promise<{
  fixSuggestion: string;
  fixPrd: string;
}> {
  const insight = db.select().from(nrInsights).where(eq(nrInsights.id, insightId)).get();
  if (!insight) throw new Error("Insight not found");
  if (!isAIAvailable()) throw new Error("AI not configured");

  let crossRef: CrossRefData;
  if (insight.crossRefData) {
    crossRef = JSON.parse(insight.crossRefData);
  } else {
    crossRef = await crossReference(insightId);
  }

  const system = `You are a senior software engineer analyzing APM anomalies and suggesting fixes.

Given metrics, log context, and service docs, provide:
1. A specific fix description
2. A mini PRD for automated implementation

Respond in EXACTLY this JSON format (no markdown, no code fences):
{
  "fixSuggestion": "Detailed description of the fix",
  "fixPrd": "# Fix: <title>\\n\\n## Problem\\n<what's broken>\\n\\n## Solution\\n<specific changes>\\n\\n## Acceptance criteria\\n- [ ] <criteria>"
}`;

  const userMessage = `APM Anomaly requiring fix:

Service: ${insight.appName}
Metric: ${insight.metricType}
${insight.metricLabel ? `Endpoint/Query: ${insight.metricLabel}` : ""}
Current: ${insight.currentValue}, Baseline: ${insight.baselineValue}
Diagnosis: ${insight.diagnosis ?? "Not yet diagnosed"}

Elastic Errors: ${JSON.stringify(crossRef.elasticErrors)}
Error Samples: ${JSON.stringify(crossRef.elasticSamples.slice(0, 2))}
${crossRef.kbContext ? `\nService Docs:\n${crossRef.kbContext}` : ""}`;

  const response = await complete(
    [{ role: "user", content: userMessage }],
    { system, maxTokens: 4096 }
  );

  const cleaned = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned) as { fixSuggestion: string; fixPrd: string };

  db.update(nrInsights)
    .set({
      fixSuggestion: parsed.fixSuggestion,
      fixPrd: parsed.fixPrd,
      updatedAt: Date.now(),
    })
    .where(eq(nrInsights.id, insightId))
    .run();

  return parsed;
}
