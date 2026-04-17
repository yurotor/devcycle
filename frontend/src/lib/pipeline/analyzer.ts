// Pipeline Failure Analyzer
//
// Pulls failed stage/build logs from Jenkins or ADO and uses Claude to analyze failures.
// Returns structured analysis with: summary, issue type, suggested fix.

import { db } from "../db";
import { pipelineRuns, pipelineStages, tasks, repos, workspace, pats } from "../db/schema";
import { eq } from "drizzle-orm";
import { createJenkinsClientForHost } from "../jenkins/client";
import { AzureDevOpsClient } from "../azure-devops/client";
import { decryptPat } from "../crypto";
import { complete, isAIAvailable } from "../anthropic";

// ─── Types ───────────────────────────────────────────────────────

export interface FailureAnalysis {
  summary: string;
  issueType: "code" | "infrastructure" | "unknown";
  suggestedFix: string | null;
}

// ─── Analysis ────────────────────────────────────────────────────

/**
 * Analyze a failed pipeline run.
 * 1. Finds the failed stage
 * 2. Pulls its log from Jenkins
 * 3. Sends to Claude for analysis
 * 4. Stores the result on the pipeline run
 */
export async function analyzeFailure(pipelineRunId: number, { force = false }: { force?: boolean } = {}): Promise<FailureAnalysis> {
  const run = db
    .select()
    .from(pipelineRuns)
    .where(eq(pipelineRuns.id, pipelineRunId))
    .get();

  if (!run) throw new Error(`Pipeline run ${pipelineRunId} not found`);
  if (run.status !== "failure") throw new Error("Pipeline run is not in failure state");

  // Check if already analyzed (skip if force re-analysis requested)
  if (!force && run.failureAnalysis) {
    try {
      return JSON.parse(run.failureAnalysis) as FailureAnalysis;
    } catch { /* re-analyze */ }
  }

  // No Jenkins build → CI failed in ADO before reaching Jenkins. Fetch ADO logs.
  if (!run.jenkinsBuildNumber) {
    const analysis = await analyzeAdoFailure(run);
    persistAnalysis(pipelineRunId, analysis);
    return analysis;
  }

  // Find the failed stage
  const stages = db
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.pipelineRunId, pipelineRunId))
    .all()
    .sort((a, b) => a.stageOrder - b.stageOrder);

  const failedStage = stages.find((s) => s.status === "failure");
  if (!failedStage) {
    const fallback: FailureAnalysis = {
      summary: "Pipeline failed but no specific failed stage was identified.",
      issueType: "unknown",
      suggestedFix: null,
    };
    persistAnalysis(pipelineRunId, fallback);
    return fallback;
  }

  // Pull stage log from Jenkins
  let stageLog = "";
  const client = createJenkinsClientForHost(run.jenkinsHost);

  // Try wfapi stage log first
  if (failedStage.stageNodeId) {
    try {
      stageLog = await client.getStageLog(
        run.jenkinsJobPath,
        run.jenkinsBuildNumber,
        failedStage.stageNodeId
      );
    } catch (err) {
      console.warn(
        `[analyzer] Could not fetch stage log for node ${failedStage.stageNodeId}:`,
        (err as Error).message
      );
    }
  }

  // If stage log is empty, fall back to full console output
  if (!stageLog.trim()) {
    try {
      const fullLog = await client.getConsoleOutput(
        run.jenkinsJobPath,
        run.jenkinsBuildNumber
      );
      // Take the last portion — errors are usually near the end
      stageLog = fullLog;
    } catch (err) {
      console.warn(
        `[analyzer] Could not fetch console output:`,
        (err as Error).message
      );
    }
  }

  // Extract the most relevant error sections from the log
  const truncatedLog = extractErrorContext(stageLog, 4000);

  // Run AI analysis
  const analysis = await runAIAnalysis(
    failedStage.stageName,
    truncatedLog,
    run.pipelineType
  );

  // Persist to DB
  persistAnalysis(pipelineRunId, analysis);

  return analysis;
}

/**
 * Extract error-relevant lines from a build log.
 * Grabs lines containing ERROR, WARN, FAILED, etc. plus surrounding context.
 * Falls back to the tail of the log if no error patterns found.
 */
function extractErrorContext(log: string, maxChars: number): string {
  if (log.length <= maxChars) return log;

  const lines = log.split("\n");
  const errorPattern = /\b(ERROR|FAILED|FAILURE|FATAL|Exception|Error:|npm ERR!|exit code [1-9]|leaks found)/i;
  const ignorePattern = /^(\s+at\s|Caused by:|\.java:|\.\.\.\s*\d+\s*more)/;

  // Collect indices of error lines
  const errorIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (errorPattern.test(lines[i]) && !ignorePattern.test(lines[i])) {
      errorIndices.push(i);
    }
  }

  if (errorIndices.length === 0) {
    // No error patterns found — return tail
    return `...(truncated)\n${log.slice(-maxChars)}`;
  }

  // Take context around each error line (2 before, 2 after), dedup
  const selectedLines = new Set<number>();
  for (const idx of errorIndices) {
    for (let j = Math.max(0, idx - 2); j <= Math.min(lines.length - 1, idx + 2); j++) {
      selectedLines.add(j);
    }
  }

  // Build result from selected lines in order, prioritizing the END of the log
  // (the actual failure cause is almost always near the tail)
  const sorted = [...selectedLines].sort((a, b) => a - b);

  // Measure total size; if it fits, use everything
  let totalLen = 0;
  for (const idx of sorted) {
    totalLen += lines[idx].length + 1;
  }

  // If all selected lines fit, use them all
  if (totalLen <= maxChars) {
    const parts: string[] = [];
    let lastIdx = -2;
    for (const idx of sorted) {
      if (idx > lastIdx + 1) parts.push("...");
      parts.push(lines[idx]);
      lastIdx = idx;
    }
    return parts.join("\n");
  }

  // Otherwise, fill from the end so the actual failure isn't truncated
  const reverseParts: string[] = [];
  let lastIdx = lines.length + 1;
  let usedLen = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const idx = sorted[i];
    const line = lines[idx];
    if (usedLen + line.length > maxChars) break;
    if (idx < lastIdx - 1) reverseParts.push("...");
    reverseParts.push(line);
    usedLen += line.length;
    lastIdx = idx;
  }
  if (reverseParts.length > 0) reverseParts.push("...(earlier errors truncated)");
  reverseParts.reverse();
  const parts = reverseParts;
  totalLen = usedLen;

  return parts.join("\n");
}

async function runAIAnalysis(
  stageName: string,
  stageLog: string,
  pipelineType: string
): Promise<FailureAnalysis> {
  if (!isAIAvailable() || !stageLog.trim()) {
    return {
      summary: `The "${stageName}" stage failed. ${stageLog ? "See the Jenkins log for details." : "No log available."}`,
      issueType: "unknown",
      suggestedFix: null,
    };
  }

  const system = `You are a CI/CD pipeline failure analyst. Analyze the Jenkins build log and provide a concise diagnosis.

Respond in EXACTLY this JSON format (no markdown, no code fences):
{
  "summary": "One or two sentences explaining what went wrong and why",
  "issueType": "code" or "infrastructure" or "unknown",
  "suggestedFix": "Specific actionable suggestion, or null if unclear"
}

Guidelines for issueType:
- "code": compilation errors, test failures, lint errors, type errors — things that can be fixed by changing the source code
- "infrastructure": deployment failures, network issues, permission denied, resource limits, Docker/ECS errors, DB connection issues
- "unknown": unclear from the log

This is a ${pipelineType} pipeline. The failed stage is "${stageName}".`;

  try {
    const response = await complete(
      [{ role: "user", content: `Analyze this Jenkins build failure log:\n\n${stageLog}` }],
      { system, maxTokens: 1024 }
    );

    // Parse JSON response
    const cleaned = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned) as FailureAnalysis;

    // Validate shape
    if (
      typeof parsed.summary === "string" &&
      ["code", "infrastructure", "unknown"].includes(parsed.issueType)
    ) {
      return parsed;
    }
  } catch (err) {
    console.warn("[analyzer] AI analysis failed:", (err as Error).message);
  }

  // Fallback if AI fails
  return {
    summary: `The "${stageName}" stage failed. Check the Jenkins log for details.`,
    issueType: "unknown",
    suggestedFix: null,
  };
}

/**
 * Fetch ADO build logs and analyze — used when CI failed before reaching Jenkins.
 */
async function analyzeAdoFailure(
  run: typeof pipelineRuns.$inferSelect
): Promise<FailureAnalysis> {
  const task = db.select().from(tasks).where(eq(tasks.id, run.taskId)).get();
  if (!task?.prNumber || !task.repoId) {
    return { summary: "ADO CI failed but task/PR info is missing.", issueType: "unknown", suggestedFix: null };
  }

  const repo = db.select().from(repos).where(eq(repos.id, task.repoId)).get();
  if (!repo?.project) {
    return { summary: "ADO CI failed but repo info is missing.", issueType: "unknown", suggestedFix: null };
  }

  // Get ADO client
  const ws = db.select().from(workspace).limit(1).get();
  if (!ws) return { summary: "ADO CI failed. No workspace configured.", issueType: "unknown", suggestedFix: null };
  const pat = db.select().from(pats).where(eq(pats.service, "azure")).get();
  if (!pat) return { summary: "ADO CI failed. No Azure PAT configured.", issueType: "unknown", suggestedFix: null };

  let decrypted: string;
  try { decrypted = decryptPat(pat.encryptedPat, pat.iv); } catch {
    return { summary: "ADO CI failed. Could not decrypt Azure PAT.", issueType: "unknown", suggestedFix: null };
  }
  const adoClient = new AzureDevOpsClient(ws.azureOrgUrl, decrypted);

  // Fetch build logs
  let logText = "";
  try {
    const buildId = await adoClient.getPrBuildId(repo.project, task.prNumber);
    if (buildId) {
      const timeline = await adoClient.getBuildTimeline(repo.project, buildId);
      const failedRecords = timeline.records
        .filter((r) => r.result === "failed" && r.log?.id)
        .sort((a, b) => a.order - b.order);

      const logParts: string[] = [];
      for (const record of failedRecords.slice(0, 3)) {
        try {
          const log = await adoClient.getBuildLog(repo.project, buildId, record.log!.id);
          logParts.push(`=== ${record.name} ===\n${log}`);
        } catch (logErr) {
          console.warn(`[analyzer] Failed to fetch log for ${record.name}:`, (logErr as Error).message);
        }
      }
      logText = logParts.join("\n\n");
    }
  } catch (err) {
    console.warn(`[analyzer] Could not fetch ADO build logs for PR #${task.prNumber}:`, (err as Error).message);
  }

  const truncatedLog = extractErrorContext(logText, 4000);
  return runAIAnalysis("ADO CI Build", truncatedLog, "pullRequest");
}

function persistAnalysis(pipelineRunId: number, analysis: FailureAnalysis): void {
  db.update(pipelineRuns)
    .set({
      failureAnalysis: JSON.stringify(analysis),
      updatedAt: Date.now(),
    })
    .where(eq(pipelineRuns.id, pipelineRunId))
    .run();
}
