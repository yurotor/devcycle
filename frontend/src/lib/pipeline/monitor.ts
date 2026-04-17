// Pipeline Monitor Service
//
// Orchestrates polling of Jenkins builds for tasks that have PRs.
// Handles: PR-to-build matching, stage discovery, status updates,
// merge detection (ADO), autoDeploy tracking, and auto-done logic.

import { db } from "../db";
import { pipelineRuns, pipelineStages, tasks, tickets, repos, workspace, pats } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  createJenkinsClientForHost,
  JenkinsError,
  type JenkinsStage,
  type JenkinsBuildSummary,
} from "../jenkins/client";
import { getJobMapping } from "../jenkins/job-mapper";
import { AzureDevOpsClient } from "../azure-devops/client";
import { decryptPat } from "../crypto";
import { analyzeFailure } from "./analyzer";

// ─── Types ───────────────────────────────────────────────────────

export type PipelineStatus = "pending" | "running" | "success" | "failure" | "aborted";

export interface PipelineRunWithStages {
  id: number;
  taskId: number;
  pipelineType: string;
  status: PipelineStatus;
  jenkinsUrl: string | null;
  jenkinsBuildNumber: number | null;
  stages: {
    id: number;
    stageName: string;
    stageOrder: number;
    status: string;
    durationMs: number | null;
  }[];
  failureAnalysis: {
    summary: string;
    issueType: "code" | "infrastructure" | "unknown";
    suggestedFix: string | null;
  } | null;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface TaskPipelineStatus {
  taskId: number;
  prNumber: number | null;
  prMerged: boolean;
  pullRequest: PipelineRunWithStages | null;
  autoDeploy: PipelineRunWithStages | null;
}

// ─── Query helpers ───────────────────────────────────────────────

/**
 * Get pipeline status for all tasks of a ticket.
 */
export function getTicketPipelineStatus(ticketId: number): TaskPipelineStatus[] {
  const ticketTasks = db
    .select()
    .from(tasks)
    .where(eq(tasks.ticketId, ticketId))
    .all();

  return ticketTasks
    .filter((t) => t.prNumber !== null)
    .map((task) => {
      const runs = db
        .select()
        .from(pipelineRuns)
        .where(eq(pipelineRuns.taskId, task.id))
        .all();

      const prRun = runs.find((r) => r.pipelineType === "pullRequest") ?? null;
      const adRun = runs.find((r) => r.pipelineType === "autoDeploy") ?? null;

      return {
        taskId: task.id,
        prNumber: task.prNumber,
        prMerged: adRun !== null, // autoDeploy tracking means PR was merged
        pullRequest: prRun ? enrichRunWithStages(prRun) : null,
        autoDeploy: adRun ? enrichRunWithStages(adRun) : null,
      };
    });
}

function enrichRunWithStages(
  run: typeof pipelineRuns.$inferSelect
): PipelineRunWithStages {
  const stages = db
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.pipelineRunId, run.id))
    .all()
    .sort((a, b) => a.stageOrder - b.stageOrder);

  let failureAnalysis = null;
  if (run.failureAnalysis) {
    try {
      failureAnalysis = JSON.parse(run.failureAnalysis);
    } catch { /* ignore */ }
  }

  return {
    id: run.id,
    taskId: run.taskId,
    pipelineType: run.pipelineType,
    status: run.status as PipelineStatus,
    jenkinsUrl: run.jenkinsUrl,
    jenkinsBuildNumber: run.jenkinsBuildNumber,
    stages: stages.map((s) => ({
      id: s.id,
      stageName: s.stageName,
      stageOrder: s.stageOrder,
      status: s.status,
      durationMs: s.durationMs,
    })),
    failureAnalysis,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
  };
}

// ─── Monitoring lifecycle ────────────────────────────────────────

/**
 * Start monitoring a task's pullRequest pipeline.
 * Called after a PR is created.
 */
export function startPullRequestMonitoring(taskId: number, repoId: number): void {
  const mapping = getJobMapping(repoId, "pullRequest");
  if (!mapping) {
    console.warn(`[monitor] No pullRequest job mapping for repoId=${repoId}`);
    return;
  }

  // Check if monitoring already exists
  const existing = db
    .select()
    .from(pipelineRuns)
    .where(
      and(
        eq(pipelineRuns.taskId, taskId),
        eq(pipelineRuns.pipelineType, "pullRequest")
      )
    )
    .get();

  if (existing) return;

  const now = Date.now();
  db.insert(pipelineRuns)
    .values({
      taskId,
      repoId,
      pipelineType: "pullRequest",
      jenkinsHost: mapping.jenkinsHost,
      jenkinsJobPath: mapping.jenkinsJobPath,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

/**
 * Start monitoring a task's autoDeploy pipeline.
 * Called when PR merge is detected.
 */
export function startAutoDeployMonitoring(taskId: number, repoId: number): void {
  const mapping = getJobMapping(repoId, "autoDeploy");
  if (!mapping) {
    console.warn(`[monitor] No autoDeploy job mapping for repoId=${repoId}`);
    return;
  }

  const existing = db
    .select()
    .from(pipelineRuns)
    .where(
      and(
        eq(pipelineRuns.taskId, taskId),
        eq(pipelineRuns.pipelineType, "autoDeploy")
      )
    )
    .get();

  if (existing) return;

  const now = Date.now();
  db.insert(pipelineRuns)
    .values({
      taskId,
      repoId,
      pipelineType: "autoDeploy",
      jenkinsHost: mapping.jenkinsHost,
      jenkinsJobPath: mapping.jenkinsJobPath,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

// ─── Polling logic ───────────────────────────────────────────────

/**
 * Poll all active pipeline runs and update their status.
 * Also checks for PR merges to start autoDeploy monitoring.
 * This is the main polling function called on a 30s interval.
 */
export async function pollActivePipelines(): Promise<void> {
  // Poll active Jenkins builds
  // Poll runs that are active OR have no stages yet (need to fetch stage data)
  const activeRuns = db
    .select()
    .from(pipelineRuns)
    .where(inArray(pipelineRuns.status, ["pending", "running"]))
    .all();

  // Also check for runs that finished but have no stages (missed stage fetch)
  const runsNeedingStages = db
    .select()
    .from(pipelineRuns)
    .where(inArray(pipelineRuns.status, ["success", "failure", "aborted"]))
    .all()
    .filter((run) => {
      if (!run.jenkinsBuildNumber) return false;
      const stageCount = db
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.pipelineRunId, run.id))
        .all().length;
      return stageCount === 0;
    });

  // Check ADO build policy status FIRST — if ADO CI failed, no point hitting Jenkins
  await checkAdoBuildPolicies(activeRuns);

  // Re-fetch active runs after ADO check (some may have been marked as failed)
  const stillActiveRuns = db
    .select()
    .from(pipelineRuns)
    .where(inArray(pipelineRuns.status, ["pending", "running"]))
    .all();

  const allRunsToProcess = [...stillActiveRuns, ...runsNeedingStages];

  if (allRunsToProcess.length > 0) {
    await Promise.allSettled(
      allRunsToProcess.map((run) => pollSingleRun(run))
    );
  }

  // Staleness check: if a run has been pending for > 10 min with no Jenkins build,
  // mark as failed and fetch real ADO build logs for analysis (skip policy status —
  // it already failed us during normal polling).
  const STALE_THRESHOLD_MS = 10 * 60 * 1000;
  const now = Date.now();
  const stalePendingRuns = db
    .select()
    .from(pipelineRuns)
    .where(inArray(pipelineRuns.status, ["pending"]))
    .all()
    .filter((r) => !r.jenkinsBuildNumber && now - r.updatedAt > STALE_THRESHOLD_MS);

  for (const run of stalePendingRuns) {
    console.log(`[monitor] Run ${run.id} stuck pending for >${STALE_THRESHOLD_MS / 60000}min — marking as failed`);
    db.update(pipelineRuns)
      .set({ status: "failure", finishedAt: now, updatedAt: now })
      .where(eq(pipelineRuns.id, run.id))
      .run();

    // analyzeFailure handles both ADO and Jenkins failures
    analyzeFailure(run.id).catch((err) =>
      console.error(`[monitor] Stale run ${run.id} analysis failed:`, (err as Error).message)
    );
  }

  // Check for PR merges (to start autoDeploy monitoring)
  await checkMergedPRsInternal();

  // Check auto-done conditions after polling
  checkAutoDone();
}

/**
 * Get an authenticated ADO client, or null if credentials are unavailable.
 */
async function getAdoClient(): Promise<AzureDevOpsClient | null> {
  const ws = db.select().from(workspace).limit(1).get();
  if (!ws) return null;
  const pat = db
    .select()
    .from(pats)
    .where(eq(pats.service, "azure"))
    .get();
  if (!pat) return null;

  let decrypted: string;
  try { decrypted = decryptPat(pat.encryptedPat, pat.iv); } catch { return null; }
  return new AzureDevOpsClient(ws.azureOrgUrl, decrypted);
}

/**
 * Check ADO build policy evaluations for pending PR runs.
 * If ADO CI itself failed (before reaching Jenkins), mark the run as failed.
 * If ADO CI passed, mark as running (Jenkins build should appear soon).
 */
async function checkAdoBuildPolicies(
  activeRuns: (typeof pipelineRuns.$inferSelect)[]
): Promise<void> {
  // Only check pullRequest runs that are pending and have no Jenkins build yet
  const pendingPrRuns = activeRuns.filter(
    (r) => r.pipelineType === "pullRequest" && r.status === "pending" && !r.jenkinsBuildNumber
  );
  if (pendingPrRuns.length === 0) return;

  const adoClient = await getAdoClient();
  if (!adoClient) return;

  for (const run of pendingPrRuns) {
    const task = db.select().from(tasks).where(eq(tasks.id, run.taskId)).get();
    if (!task?.prNumber || !task.repoId) continue;
    const repo = db.select().from(repos).where(eq(repos.id, task.repoId)).get();
    if (!repo) continue;

    try {
      const policyStatus = await adoClient.getPrBuildPolicyStatus(repo.project, task.prNumber);

      if (policyStatus === "rejected") {
        console.log(`[monitor] ADO CI failed for PR #${task.prNumber} (task ${task.id}) — marking pipeline as failed`);
        const now = Date.now();
        db.update(pipelineRuns)
          .set({
            status: "failure",
            finishedAt: now,
            updatedAt: now,
          })
          .where(eq(pipelineRuns.id, run.id))
          .run();

        // analyzeFailure handles ADO log fetching when no Jenkins build exists
        analyzeFailure(run.id).catch((err) =>
          console.error(`[monitor] ADO failure analysis failed for run ${run.id}:`, (err as Error).message)
        );
      } else if (policyStatus === "approved") {
        // ADO gate passed — Jenkins pullRequest build should appear soon
        db.update(pipelineRuns)
          .set({ status: "running", updatedAt: Date.now() })
          .where(eq(pipelineRuns.id, run.id))
          .run();
        console.log(`[monitor] ADO gate passed for PR #${task.prNumber} (task ${task.id}) — waiting for Jenkins build`);
      }
      // "running" or "none" — leave as pending but touch updatedAt so staleness check doesn't fire
      db.update(pipelineRuns)
        .set({ updatedAt: Date.now() })
        .where(eq(pipelineRuns.id, run.id))
        .run();
    } catch (err) {
      // Silently skip — ADO may be temporarily unavailable
      console.warn(`[monitor] ADO policy check failed for PR #${task?.prNumber}:`, (err as Error).message?.slice(0, 100));
    }
  }
}

/**
 * Internal merge detection using ADO client.
 */
async function checkMergedPRsInternal(): Promise<void> {
  const adoClient = await getAdoClient();
  if (!adoClient) return;

  // Find tasks that have PRs + pullRequest monitoring but no autoDeploy monitoring yet
  const allTasks = db.select().from(tasks).all().filter((t) => t.prNumber !== null && t.repoId !== null);

  for (const task of allTasks) {
    // Skip if autoDeploy monitoring already exists
    const adRun = db
      .select()
      .from(pipelineRuns)
      .where(
        and(
          eq(pipelineRuns.taskId, task.id),
          eq(pipelineRuns.pipelineType, "autoDeploy")
        )
      )
      .get();
    if (adRun) continue;

    // Get repo info for ADO API call
    const repo = db.select().from(repos).where(eq(repos.id, task.repoId!)).get();
    if (!repo?.adoId) continue;

    try {
      const status = await adoClient.getPullRequestStatus(
        repo.project,
        repo.adoId,
        task.prNumber!
      );

      if (status === "completed") {
        startAutoDeployMonitoring(task.id, task.repoId!);
        console.log(
          `[monitor] PR #${task.prNumber} merged — started autoDeploy monitoring for task ${task.id}`
        );
      }
    } catch (err) {
      // Silently skip — PR may not exist yet or ADO may be temporarily unavailable
    }
  }
}

async function pollSingleRun(
  run: typeof pipelineRuns.$inferSelect
): Promise<void> {
  // pullRequest runs go through ADO CI first — only hit Jenkins once we have a build number
  // (ADO "approved" → status set to "running" → findMatchingBuild links the Jenkins build)
  if (run.pipelineType === "pullRequest" && run.status === "pending" && !run.jenkinsBuildNumber) {
    return; // ADO check handles this, not Jenkins
  }

  try {
    const client = createJenkinsClientForHost(run.jenkinsHost);

    if (!run.jenkinsBuildNumber) {
      // Looking for a matching build (autoDeploy pending, or pullRequest after ADO passed)
      await findMatchingBuild(run, client);
    } else {
      // Build found — track stages
      await updateBuildStatus(run, client);
    }
  } catch (err) {
    const msg = (err as Error).message ?? "";

    if (err instanceof JenkinsError && (msg.includes("<!DOCTYPE") || msg.includes("<html"))) {
      console.warn(
        `[monitor] Jenkins returned HTML for run ${run.id} — job/build not found on ${run.jenkinsHost}`
      );
      return;
    }

    console.error(
      `[monitor] Error polling run ${run.id} (${run.pipelineType}):`,
      msg.slice(0, 200)
    );
  }
}

async function findMatchingBuild(
  run: typeof pipelineRuns.$inferSelect,
  client: ReturnType<typeof createJenkinsClientForHost>
): Promise<void> {
  const task = db.select().from(tasks).where(eq(tasks.id, run.taskId)).get();
  if (!task?.prNumber) return;

  let match: JenkinsBuildSummary | null = null;

  if (run.pipelineType === "pullRequest") {
    match = await client.findBuildByPrNumber(run.jenkinsJobPath, task.prNumber);
  } else if (run.pipelineType === "autoDeploy") {
    match = await client.findLatestBuild(run.jenkinsJobPath, run.createdAt);
  }

  if (match) {
    linkBuildToRun(run, match);

    // If the build is already finished, fetch its stages immediately
    if (!match.building) {
      const updatedRun = db.select().from(pipelineRuns).where(eq(pipelineRuns.id, run.id)).get();
      if (updatedRun) {
        await updateBuildStatus(updatedRun, client);
      }
    }
  }
}

function linkBuildToRun(
  run: typeof pipelineRuns.$inferSelect,
  build: JenkinsBuildSummary
): void {
  // After fix-and-repush, minBuildNumber is set to skip the old failed build.
  // Only accept builds newer than the threshold.
  if (run.minBuildNumber && build.number <= run.minBuildNumber) {
    return;
  }

  const now = Date.now();
  const status: PipelineStatus = build.building
    ? "running"
    : build.result === "SUCCESS"
    ? "success"
    : build.result === "FAILURE"
    ? "failure"
    : build.result === "ABORTED"
    ? "aborted"
    : "running";

  db.update(pipelineRuns)
    .set({
      jenkinsBuildNumber: build.number,
      jenkinsUrl: build.url,
      status,
      startedAt: now,
      finishedAt: !build.building ? now : null,
      updatedAt: now,
    })
    .where(eq(pipelineRuns.id, run.id))
    .run();
}

async function updateBuildStatus(
  run: typeof pipelineRuns.$inferSelect,
  client: ReturnType<typeof createJenkinsClientForHost>
): Promise<void> {
  if (!run.jenkinsBuildNumber) return;

  // Fetch stages from wfapi
  const wfapi = await client.getBuildStages(
    run.jenkinsJobPath,
    run.jenkinsBuildNumber
  );

  // Update stages
  updateStages(run.id, wfapi.stages);

  // Determine overall status
  const status = mapWfApiStatus(wfapi.status);
  const isTerminal = ["success", "failure", "aborted"].includes(status);
  const now = Date.now();

  db.update(pipelineRuns)
    .set({
      status,
      finishedAt: isTerminal ? now : null,
      updatedAt: now,
    })
    .where(eq(pipelineRuns.id, run.id))
    .run();

  // Auto-analyze on failure
  if (status === "failure" && run.status !== "failure") {
    analyzeFailure(run.id).catch((err) =>
      console.error(`[monitor] Auto-analysis failed for run ${run.id}:`, (err as Error).message)
    );
  }
}

function updateStages(pipelineRunId: number, jenkinsStages: JenkinsStage[]): void {
  // Delete existing stages and re-insert (simpler than upsert for SQLite)
  db.delete(pipelineStages)
    .where(eq(pipelineStages.pipelineRunId, pipelineRunId))
    .run();

  for (let i = 0; i < jenkinsStages.length; i++) {
    const s = jenkinsStages[i];
    db.insert(pipelineStages)
      .values({
        pipelineRunId,
        stageNodeId: s.id,
        stageName: s.name,
        stageOrder: i,
        status: mapStageStatus(s.status),
        durationMs: s.durationMillis,
      })
      .run();
  }
}

function mapWfApiStatus(status: string): PipelineStatus {
  switch (status) {
    case "SUCCESS":
      return "success";
    case "FAILED":
      return "failure";
    case "ABORTED":
      return "aborted";
    case "IN_PROGRESS":
    case "PAUSED_PENDING_INPUT":
      return "running";
    default:
      return "running";
  }
}

function mapStageStatus(status: string): string {
  switch (status) {
    case "SUCCESS":
      return "success";
    case "FAILED":
      return "failure";
    case "ABORTED":
      return "aborted";
    case "IN_PROGRESS":
      return "running";
    case "PAUSED_PENDING_INPUT":
      return "paused";
    case "NOT_EXECUTED":
      return "pending";
    default:
      return "pending";
  }
}

// ─── Auto-done ───────────────────────────────────────────────────

/**
 * Check if any tickets should auto-advance to "done".
 * Condition: all tasks with PRs have autoDeploy pipelines that succeeded.
 */
function checkAutoDone(): void {
  // Get all tickets in "implement" phase
  const implementTickets = db
    .select()
    .from(tickets)
    .where(eq(tickets.phase, "implement"))
    .all();

  for (const ticket of implementTickets) {
    const ticketTasks = db
      .select()
      .from(tasks)
      .where(eq(tasks.ticketId, ticket.id))
      .all();

    // Only consider tasks that have PRs
    const tasksWithPrs = ticketTasks.filter((t) => t.prNumber !== null);
    if (tasksWithPrs.length === 0) continue;

    // Check if all tasks' autoDeploy pipelines succeeded
    const allDeployed = tasksWithPrs.every((task) => {
      const adRun = db
        .select()
        .from(pipelineRuns)
        .where(
          and(
            eq(pipelineRuns.taskId, task.id),
            eq(pipelineRuns.pipelineType, "autoDeploy")
          )
        )
        .get();
      return adRun?.status === "success";
    });

    if (allDeployed) {
      const now = Date.now();
      db.update(tickets)
        .set({ phase: "done", updatedAt: now })
        .where(eq(tickets.id, ticket.id))
        .run();
      console.log(`[monitor] Ticket ${ticket.jiraKey} auto-advanced to done`);
    }
  }
}

// ─── Polling manager (singleton interval) ────────────────────────

let pollInterval: ReturnType<typeof setInterval> | null = null;

export function startPolling(intervalMs: number = 30_000): void {
  if (pollInterval) return;
  console.log(`[monitor] Starting pipeline polling every ${intervalMs / 1000}s`);

  // Retroactively start monitoring for tasks that already have PRs
  retroactiveStartMonitoring();

  pollInterval = setInterval(() => {
    pollActivePipelines().catch((err) =>
      console.error("[monitor] Poll error:", err)
    );
  }, intervalMs);
  // Run immediately
  pollActivePipelines().catch((err) =>
    console.error("[monitor] Initial poll error:", err)
  );
}

/**
 * Start monitoring for tasks that already have PRs but no pipeline runs.
 * This handles the case where PRs were created before pipeline monitoring was set up.
 */
function retroactiveStartMonitoring(): void {
  const tasksWithPrs = db
    .select()
    .from(tasks)
    .all()
    .filter((t) => t.prNumber !== null && t.repoId !== null);

  for (const task of tasksWithPrs) {
    const existingRun = db
      .select()
      .from(pipelineRuns)
      .where(eq(pipelineRuns.taskId, task.id))
      .get();

    if (!existingRun) {
      startPullRequestMonitoring(task.id, task.repoId!);
      console.log(`[monitor] Retroactively started monitoring for task ${task.id} (PR #${task.prNumber})`);
    }
  }
}

export function stopPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log("[monitor] Stopped pipeline polling");
  }
}

export function isPolling(): boolean {
  return pollInterval !== null;
}
