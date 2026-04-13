// POST /api/tickets/:id/implement — start implementation, create PR, or mark manual
// GET  /api/tickets/:id/implement — get task status or diff

import { db } from "@/lib/db";
import { tickets, tasks, repos, workspace, pats, jobs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decryptPat } from "@/lib/crypto";
import { AzureDevOpsClient } from "@/lib/azure-devops/client";
import { gitExec, claudeExecStreaming, withRepoLock } from "@/lib/claude-cli";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const KB_ROOT = path.join(process.cwd(), "..", "kb");
const REPOS_DIR = path.join(KB_ROOT, "repos");

// ─── Types ───────────────────────────────────────────────────────

interface FileDiff {
  path: string;
  status: "added" | "modified" | "deleted";
  hunks: { oldStart: number; newStart: number; lines: string[] }[];
}

// ─── GET ──────────────────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  // Diff request — return stored diff from DB
  if (action === "diff") {
    const taskId = parseInt(url.searchParams.get("taskId") ?? "0", 10);
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) return Response.json({ files: [] });

    const files = task.diff ? JSON.parse(task.diff) : [];
    return Response.json({ files });
  }

  // Live diff — read from temp file on disk (during in-progress tasks)
  if (action === "live-diff") {
    const taskId = parseInt(url.searchParams.get("taskId") ?? "0", 10);
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    if (!task || !task.repoId) return Response.json({ files: [], live: false });

    const [repo] = await db.select().from(repos).where(eq(repos.id, task.repoId));
    if (!repo) return Response.json({ files: [], live: false });

    const livePath = path.join(REPOS_DIR, repo.name, ".devcycle-live-diff.json");
    if (!fs.existsSync(livePath)) return Response.json({ files: [], live: true });

    try {
      const data = JSON.parse(fs.readFileSync(livePath, "utf8"));
      return Response.json({ files: data.files ?? [], live: true, ts: data.ts });
    } catch {
      return Response.json({ files: [], live: true });
    }
  }

  // Job status — return progress + label for a task's running job
  if (action === "job-status") {
    const taskId = parseInt(url.searchParams.get("taskId") ?? "0", 10);
    const jobRows = await db.select().from(jobs).where(
      and(eq(jobs.relatedId, taskId), eq(jobs.type, "implement"))
    );
    // Get the most recent job
    const job = jobRows.sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!job) return Response.json({ progress: 0, label: "Queued..." });

    let label = "Working...";
    let errorType: string | undefined;
    if (job.meta) {
      try {
        const meta = JSON.parse(job.meta);
        label = meta.label ?? label;
        errorType = meta.errorType;
      } catch { /* ignore */ }
    }

    return Response.json({
      progress: job.progress ?? 0,
      label,
      status: job.status,
      error: job.error,
      errorType,
    });
  }

  // Default: return status
  const taskRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.ticketId, ticketId));
  const status = taskRows.every((t) => t.status === "done")
    ? "done"
    : taskRows.some((t) => t.status === "in-progress")
    ? "running"
    : "idle";

  return Response.json({ status, tasks: taskRows });
}

// ─── POST ─────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  const body = await request.json();
  const { action, taskId, force } = body as {
    action: "start" | "manual" | "create-pr";
    taskId?: number;
    force?: boolean;
  };

  if (action === "start" && taskId) {
    return handleStart(ticketId, taskId, force);
  }

  if (action === "manual" && taskId) {
    await db
      .update(tasks)
      .set({ implementedManually: 1, status: "done", updatedAt: Date.now() })
      .where(eq(tasks.id, taskId));
    return Response.json({ ok: true });
  }

  if (action === "create-pr" && taskId) {
    return handleCreatePR(ticketId, taskId);
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}

// ─── Start implementation (background job) ────────────────────────

async function handleStart(ticketId: number, taskId: number, force?: boolean) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) return Response.json({ error: "Ticket not found" }, { status: 404 });

  // Need a repo to implement against
  if (!task.repoId) {
    return Response.json({ error: "Task has no repo assigned. Edit the task to assign a repository." }, { status: 400 });
  }

  const [repo] = await db.select().from(repos).where(eq(repos.id, task.repoId));
  if (!repo) return Response.json({ error: "Repo not found" }, { status: 404 });

  const [ws] = await db.select().from(workspace).limit(1);
  if (!ws) return Response.json({ error: "Workspace not configured" }, { status: 404 });

  // Check repo is cloned
  const repoDir = path.join(REPOS_DIR, repo.name);
  if (!fs.existsSync(path.join(repoDir, ".git"))) {
    return Response.json({ error: `Repo "${repo.name}" is not cloned. Run a scan first.` }, { status: 400 });
  }

  // Check no job already running for this task (with stale detection)
  const existingJobs = await db.select().from(jobs).where(
    and(eq(jobs.relatedId, taskId), eq(jobs.type, "implement"), eq(jobs.status, "running"))
  );
  const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  for (const ej of existingJobs) {
    if (force || Date.now() - ej.updatedAt > STALE_THRESHOLD) {
      // Job is stale or forced — mark as failed so we can retry
      await db.update(jobs).set({ status: "failed", error: force ? "Force restart" : "Timed out (stale)", updatedAt: Date.now() }).where(eq(jobs.id, ej.id));
    } else {
      return Response.json({ ok: true, jobId: ej.id, status: "already_running" });
    }
  }

  // Reset task if it was left in-progress from a stale job
  await db.update(tasks).set({ status: "pending", updatedAt: Date.now() }).where(eq(tasks.id, taskId));

  // Create job row
  const now = Date.now();
  const [job] = await db.insert(jobs).values({
    workspaceId: ws.id,
    type: "implement",
    status: "running",
    relatedId: taskId,
    progress: 0,
    createdAt: now,
    updatedAt: now,
  }).returning();

  // Mark task in-progress
  await db.update(tasks).set({ status: "in-progress", updatedAt: now }).where(eq(tasks.id, taskId));

  // Fire-and-forget (with crash safety net)
  runImplementInBackground(taskId, ticketId, job.id, repo, ticket).catch(async (err) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[implement] Background implementation crashed:", msg);
    // Safety net: reset task + job if the outer catch didn't fire
    try {
      await db.update(tasks).set({ status: "pending", updatedAt: Date.now() }).where(eq(tasks.id, taskId));
      await db.update(jobs).set({ status: "failed", error: `Crash: ${msg.slice(0, 400)}`, updatedAt: Date.now() }).where(eq(jobs.id, job.id));
    } catch { /* best effort */ }
  });

  return Response.json({ ok: true, jobId: job.id });
}

// ─── Background implementation ────────────────────────────────────

async function runImplementInBackground(
  taskId: number,
  ticketId: number,
  jobId: number,
  repo: { id: number; name: string; project: string; defaultBranch: string },
  ticket: { jiraKey: string; title: string; description: string | null; prdPath: string | null }
) {
  const repoDir = path.join(REPOS_DIR, repo.name);
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) return;

  const slug = (task.title ?? "task")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const branchName = `${ticket.jiraKey}/${slug}`.replace(/-$/, "");
  const defaultBranch = repo.defaultBranch || "main";

  const liveDiffPath = path.join(repoDir, ".devcycle-live-diff.json");

  const updateJob = async (updates: { status?: string; progress?: number; error?: string; meta?: string }) => {
    await db.update(jobs).set({
      ...updates,
      updatedAt: Date.now(),
    }).where(eq(jobs.id, jobId));
  };

  const cleanupLiveDiff = () => {
    try { fs.unlinkSync(liveDiffPath); } catch { /* ignore */ }
  };

  const snapshotLiveDiff = async () => {
    try {
      const raw = await gitExec(["diff", "--unified=3"], { cwd: repoDir });
      const staged = await gitExec(["diff", "--cached", "--unified=3"], { cwd: repoDir });
      const combined = [staged, raw].filter(Boolean).join("\n");
      const files = parseUnifiedDiff(combined);
      fs.writeFileSync(liveDiffPath, JSON.stringify({ files, ts: Date.now() }));
    } catch {
      // git diff can fail mid-edit — ignore
    }
  };

  // ── Phase-based progress tracking ──
  // Phases: Reading (10-40%), Editing (40-75%), Verifying (75-85%)
  // Within each phase, asymptotic smoothing: new = current + (ceiling - current) * 0.4
  const READ_TOOLS = new Set(["Read", "Grep", "Glob", "Bash"]);
  const WRITE_TOOLS = new Set(["Edit", "Write"]);
  type Phase = "reading" | "editing" | "verifying";
  const PHASE_RANGES: Record<Phase, { floor: number; ceiling: number; label: string }> = {
    reading:   { floor: 10, ceiling: 40, label: "Reading codebase..." },
    editing:   { floor: 40, ceiling: 75, label: "Editing files..." },
    verifying: { floor: 75, ceiling: 85, label: "Verifying changes..." },
  };
  let currentPhase: Phase = "reading";
  let currentProgress = 20; // starts at 20 after branch creation
  let hasSeenWrite = false;

  // Throttle DB writes to at most once per second
  let lastDbWrite = 0;
  let pendingUpdate: { progress: number; label: string } | null = null;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flushProgress = async () => {
    if (!pendingUpdate) return;
    const update = pendingUpdate;
    pendingUpdate = null;
    lastDbWrite = Date.now();
    await updateJob({ progress: Math.round(update.progress), meta: JSON.stringify({ label: update.label }) });
  };

  const throttledProgressUpdate = (progress: number, label: string) => {
    pendingUpdate = { progress, label };
    const elapsed = Date.now() - lastDbWrite;
    if (elapsed >= 1000) {
      flushProgress().catch(() => {});
    } else if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        flushProgress().catch(() => {});
      }, 1000 - elapsed);
    }
  };

  const onToolUse = (toolName: string, _toolInput: unknown) => {
    // Determine phase transition
    if (!hasSeenWrite && WRITE_TOOLS.has(toolName)) {
      hasSeenWrite = true;
      currentPhase = "editing";
      currentProgress = PHASE_RANGES.editing.floor;
      // Snapshot diff when files are written
      snapshotLiveDiff().catch(() => {});
    } else if (hasSeenWrite && toolName === "Bash") {
      currentPhase = "verifying";
      if (currentProgress < PHASE_RANGES.verifying.floor) {
        currentProgress = PHASE_RANGES.verifying.floor;
      }
    }

    // Snapshot live diff on every write tool
    if (WRITE_TOOLS.has(toolName)) {
      snapshotLiveDiff().catch(() => {});
    }

    // Asymptotic progress within current phase
    const range = PHASE_RANGES[currentPhase];
    currentProgress = currentProgress + (range.ceiling - currentProgress) * 0.4;
    throttledProgressUpdate(currentProgress, range.label);
  };

  try {
    console.log(`[implement] Task ${taskId}: acquiring repo lock for ${repo.name}...`);
    await withRepoLock(repo.name, async () => {
      console.log(`[implement] Task ${taskId}: lock acquired. Preparing repo...`);
      // Ensure we're on the default branch with a clean state
      try {
        await gitExec(["checkout", defaultBranch], { cwd: repoDir });
        await gitExec(["clean", "-fd"], { cwd: repoDir });
        await gitExec(["checkout", "--", "."], { cwd: repoDir });
      } catch {
        // May fail if repo is in a weird state — continue anyway
      }

      // Delete branch if it exists (retry scenario)
      try {
        // Force checkout default branch first in case we're on the target branch
        await gitExec(["checkout", defaultBranch], { cwd: repoDir });
        await gitExec(["branch", "-D", branchName], { cwd: repoDir });
        console.log(`[implement] Task ${taskId}: deleted existing branch ${branchName}`);
      } catch {
        // Branch doesn't exist — fine
      }

      // Create feature branch
      console.log(`[implement] Task ${taskId}: creating branch ${branchName}...`);
      await gitExec(["checkout", "-b", branchName], { cwd: repoDir });
      await updateJob({ progress: 10, meta: JSON.stringify({ label: "Creating branch..." }) });

      // Load context for Claude
      const prdContent = loadPRD(ticket);
      const synthesisContext = loadSynthesisOverview();

      const prompt = `You are implementing a code change in this repository.

## Task
**${task.title}**
${task.description || ""}

## Ticket
**${ticket.jiraKey}: ${ticket.title}**
${ticket.description || ""}

## PRD
${prdContent}

## System Context
${synthesisContext}

## Instructions
- Make minimal, targeted changes to implement this task
- Follow existing code patterns and conventions in the repository
- Do NOT modify unrelated files
- If the repo has tests, add or update tests for your changes
- Do NOT commit your changes — just edit the files`;

      // Let Claude implement the changes (streaming for real-time progress)
      await updateJob({ progress: 20, meta: JSON.stringify({ label: "Claude analyzing codebase..." }) });
      console.log(`[implement] Task ${taskId}: starting Claude CLI (streaming) in ${repo.name} (branch: ${branchName})...`);

      try {
        await claudeExecStreaming(prompt, {
          cwd: repoDir,
          addDirs: [KB_ROOT],
          model: "sonnet",
          maxBudget: 2.00,
          timeoutMs: 600_000,
          systemPrompt: "You are a senior developer implementing a specific task. Read the existing code to understand patterns and conventions before making changes. Make targeted, minimal edits.",
          onToolUse,
        });
      } finally {
        if (flushTimer) clearTimeout(flushTimer);
        await flushProgress();
        // One final snapshot after Claude finishes
        await snapshotLiveDiff();
      }

      await updateJob({ progress: 80, meta: JSON.stringify({ label: "Committing changes..." }) });

      // Stage and commit changes (exclude our temp file)
      cleanupLiveDiff();
      await gitExec(["add", "-A"], { cwd: repoDir });

      // Check if there are actually changes to commit
      const statusOutput = await gitExec(["status", "--porcelain"], { cwd: repoDir });
      if (!statusOutput.trim()) {
        const noChangesErr = new Error("Claude completed analysis but made no file changes. The task may already be done or may need clarification.");
        (noChangesErr as Error & { errorType: string }).errorType = "no_changes";
        throw noChangesErr;
      }

      await gitExec(
        ["-c", "user.name=DevCycle", "-c", "user.email=devcycle@noreply", "commit", "-m", `${ticket.jiraKey}: ${task.title}`],
        { cwd: repoDir }
      );

      // Capture the diff
      const rawDiff = await gitExec(["diff", "HEAD~1", "--unified=5"], { cwd: repoDir });
      const fileDiffs = parseUnifiedDiff(rawDiff);

      await updateJob({ progress: 95, meta: JSON.stringify({ label: "Capturing diff..." }) });

      // Store results
      await db.update(tasks).set({
        diff: JSON.stringify(fileDiffs),
        branchName,
        status: "done",
        updatedAt: Date.now(),
      }).where(eq(tasks.id, taskId));

      cleanupLiveDiff();
      await updateJob({ status: "done", progress: 100, meta: JSON.stringify({ label: "Done" }) });
      console.log(`[implement] Task ${taskId} completed — ${fileDiffs.length} files changed`);
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const errorType = (err as Error & { errorType?: string })?.errorType ?? "unknown";
    console.error(`[implement] Task ${taskId} failed:`, msg);

    // Clean up: return to default branch
    try {
      await gitExec(["checkout", defaultBranch], { cwd: repoDir });
      await gitExec(["branch", "-D", branchName], { cwd: repoDir });
    } catch {
      // Best effort cleanup
    }

    cleanupLiveDiff();
    await db.update(tasks).set({ status: "pending", updatedAt: Date.now() }).where(eq(tasks.id, taskId));
    await updateJob({ status: "failed", error: msg.slice(0, 500), meta: JSON.stringify({ label: "Failed", errorType }) });
  }
}

// ─── Create PR (git push + Azure DevOps API) ─────────────────────

async function handleCreatePR(ticketId: number, taskId: number) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });
  if (!task.branchName) return Response.json({ error: "No branch — run implementation first" }, { status: 400 });
  if (!task.repoId) return Response.json({ error: "No repo assigned" }, { status: 400 });

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) return Response.json({ error: "Ticket not found" }, { status: 404 });

  const [repo] = await db.select().from(repos).where(eq(repos.id, task.repoId));
  if (!repo) return Response.json({ error: "Repo not found" }, { status: 404 });

  const [ws] = await db.select().from(workspace).limit(1);
  if (!ws) return Response.json({ error: "Workspace not configured" }, { status: 404 });

  const [pat] = await db.select().from(pats).where(
    and(eq(pats.workspaceId, ws.id), eq(pats.service, "azure"))
  );
  if (!pat) return Response.json({ error: "No Azure PAT configured" }, { status: 400 });

  const decryptedPat = decryptPat(pat.encryptedPat, pat.iv);
  const repoDir = path.join(REPOS_DIR, repo.name);

  try {
    // Parse org URL for clone URL construction
    const orgUrl = new URL(ws.azureOrgUrl);
    const orgPath = orgUrl.pathname.split("/").filter(Boolean)[0] || "";
    const cloneUrl = `https://${decryptedPat}@dev.azure.com/${orgPath}/${encodeURIComponent(repo.project)}/_git/${encodeURIComponent(repo.name)}`;

    // Unshallow if needed (shallow clones can't push)
    try {
      await gitExec(["fetch", "--unshallow"], { cwd: repoDir });
    } catch {
      // Already unshallow or fetch failed — continue
    }

    // Set remote URL with PAT and push
    await gitExec(["remote", "set-url", "origin", cloneUrl], { cwd: repoDir });
    await gitExec(["push", "-u", "origin", task.branchName], { cwd: repoDir, timeout: 60_000 });

    // Create PR via Azure DevOps API
    const client = new AzureDevOpsClient(ws.azureOrgUrl, decryptedPat);
    const defaultBranch = repo.defaultBranch || "main";

    const pr = await client.createPullRequest(repo.project, repo.adoId ?? repo.name, {
      title: `${ticket.jiraKey}: ${task.title}`,
      description: `Implements task: ${task.title}\n\n${task.description || ""}`,
      sourceBranch: task.branchName,
      targetBranch: defaultBranch,
    });

    // Build web URL
    const prUrl = `${ws.azureOrgUrl}/${encodeURIComponent(repo.project)}/_git/${encodeURIComponent(repo.name)}/pullrequest/${pr.pullRequestId}`;

    await db.update(tasks).set({
      prUrl,
      prNumber: pr.pullRequestId,
      updatedAt: Date.now(),
    }).where(eq(tasks.id, taskId));

    return Response.json({
      ok: true,
      pr: { number: pr.pullRequestId, url: prUrl, title: `${ticket.jiraKey}: ${task.title}` },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[implement] Create PR failed for task ${taskId}:`, msg);
    return Response.json({ error: msg.slice(0, 300) }, { status: 500 });
  }
}

// ─── Load PRD content ─────────────────────────────────────────────

function loadPRD(ticket: { prdPath: string | null }): string {
  if (!ticket.prdPath) return "(No PRD available)";
  const fullPath = path.join(KB_ROOT, ticket.prdPath);
  if (!fs.existsSync(fullPath)) return "(PRD file not found)";
  try {
    return fs.readFileSync(fullPath, "utf8");
  } catch {
    return "(Failed to read PRD)";
  }
}

// ─── Load system synthesis overview ───────────────────────────────

function loadSynthesisOverview(): string {
  const synthPath = path.join(KB_ROOT, "raw", "system-synthesis.json");
  if (!fs.existsSync(synthPath)) return "";
  try {
    const synth = JSON.parse(fs.readFileSync(synthPath, "utf8"));
    const parts: string[] = [];
    if (synth.systemOverview) parts.push(synth.systemOverview);
    if (synth.serviceMap?.length) {
      parts.push("### Services\n" + synth.serviceMap.map((s: { repo: string; role: string }) =>
        `- **${s.repo}**: ${s.role}`
      ).join("\n"));
    }
    return parts.join("\n\n");
  } catch {
    return "";
  }
}

// ─── Unified diff parser ──────────────────────────────────────────

function parseUnifiedDiff(raw: string): FileDiff[] {
  const files: FileDiff[] = [];
  if (!raw.trim()) return files;

  const diffBlocks = raw.split(/^diff --git /m).filter(Boolean);

  for (const block of diffBlocks) {
    // Extract file path from "a/path b/path" header
    const headerMatch = block.match(/^a\/(.+?) b\/(.+)/m);
    if (!headerMatch) continue;
    const filePath = headerMatch[2];

    // Determine file status
    let status: FileDiff["status"] = "modified";
    if (block.includes("new file mode")) status = "added";
    else if (block.includes("deleted file mode")) status = "deleted";

    // Parse hunks
    const hunks: FileDiff["hunks"] = [];
    const hunkRegex = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@.*$/gm;
    let match: RegExpExecArray | null;
    const hunkPositions: { oldStart: number; newStart: number; startIdx: number }[] = [];

    while ((match = hunkRegex.exec(block)) !== null) {
      hunkPositions.push({
        oldStart: parseInt(match[1], 10),
        newStart: parseInt(match[2], 10),
        startIdx: match.index + match[0].length,
      });
    }

    for (let i = 0; i < hunkPositions.length; i++) {
      const hp = hunkPositions[i];
      const endIdx = i + 1 < hunkPositions.length
        ? block.lastIndexOf("\n@@", hunkPositions[i + 1].startIdx)
        : block.length;
      const hunkBody = block.slice(hp.startIdx, endIdx);
      const lines = hunkBody.split("\n").filter((l) =>
        l.startsWith("+") || l.startsWith("-") || l.startsWith(" ")
      );

      if (lines.length > 0) {
        hunks.push({ oldStart: hp.oldStart, newStart: hp.newStart, lines });
      }
    }

    files.push({ path: filePath, status, hunks });
  }

  return files;
}
