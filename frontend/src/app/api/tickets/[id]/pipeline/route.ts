import { NextRequest, NextResponse } from "next/server";
import {
  getTicketPipelineStatus,
  startPullRequestMonitoring,
  startAutoDeployMonitoring,
  pollActivePipelines,
  startPolling,
  isPolling,
} from "@/lib/pipeline/monitor";
import { analyzeFailure } from "@/lib/pipeline/analyzer";
import { db } from "@/lib/db";
import { tasks, pipelineRuns } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createJenkinsClientForHost } from "@/lib/jenkins/client";
import { ensureMappingsPopulated } from "@/lib/jenkins/job-mapper";

// GET /api/tickets/[id]/pipeline?action=status
// Returns pipeline status for all tasks of a ticket.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = Number(id);
  const action = req.nextUrl.searchParams.get("action") ?? "status";

  // Ensure job mappings are populated and polling is running
  await ensureMappingsPopulated();
  if (!isPolling()) {
    startPolling();
  }

  if (action === "status") {
    const statuses = getTicketPipelineStatus(ticketId);
    return NextResponse.json({ statuses });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// POST /api/tickets/[id]/pipeline
// Actions: start-monitoring, rerun, trigger-poll
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = Number(id);
  const body = await req.json();
  const action = body.action as string;

  // Ensure mappings exist for POST actions too
  await ensureMappingsPopulated();

  if (action === "start-monitoring") {
    const { taskId } = body;
    const task = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.ticketId, ticketId)))
      .get();

    if (!task || !task.prNumber || !task.repoId) {
      return NextResponse.json(
        { error: "Task not found or missing PR/repo" },
        { status: 400 }
      );
    }

    startPullRequestMonitoring(taskId, task.repoId);

    // Ensure polling is running
    if (!isPolling()) {
      startPolling();
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "rerun") {
    const { pipelineRunId } = body;
    const run = db
      .select()
      .from(pipelineRuns)
      .where(eq(pipelineRuns.id, pipelineRunId))
      .get();

    if (!run || !run.jenkinsBuildNumber) {
      return NextResponse.json(
        { error: "Pipeline run not found or no build to rerun" },
        { status: 400 }
      );
    }

    try {
      const client = createJenkinsClientForHost(run.jenkinsHost);
      await client.rebuildBuild(run.jenkinsJobPath, run.jenkinsBuildNumber);

      // Reset the run to pending so it picks up the new build
      const now = Date.now();
      db.update(pipelineRuns)
        .set({
          status: "pending",
          jenkinsBuildNumber: null,
          jenkinsUrl: null,
          failureAnalysis: null,
          startedAt: null,
          finishedAt: null,
          updatedAt: now,
        })
        .where(eq(pipelineRuns.id, run.id))
        .run();

      return NextResponse.json({ ok: true });
    } catch (err) {
      return NextResponse.json(
        { error: `Rerun failed: ${(err as Error).message}` },
        { status: 500 }
      );
    }
  }

  if (action === "trigger-poll") {
    // Manually trigger a poll cycle
    await pollActivePipelines();
    const statuses = getTicketPipelineStatus(ticketId);
    return NextResponse.json({ ok: true, statuses });
  }

  if (action === "analyze") {
    const { pipelineRunId, force } = body;
    try {
      const analysis = await analyzeFailure(pipelineRunId, { force: !!force });
      return NextResponse.json({ ok: true, analysis });
    } catch (err) {
      return NextResponse.json(
        { error: `Analysis failed: ${(err as Error).message}` },
        { status: 500 }
      );
    }
  }

  if (action === "fix-and-repush") {
    const { pipelineRunId } = body;
    const run = db
      .select()
      .from(pipelineRuns)
      .where(eq(pipelineRuns.id, pipelineRunId))
      .get();

    if (!run) {
      return NextResponse.json({ error: "Pipeline run not found" }, { status: 404 });
    }

    const task = db
      .select()
      .from(tasks)
      .where(eq(tasks.id, run.taskId))
      .get();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!task.branchName) {
      return NextResponse.json({ error: "No branch to fix — task was never pushed" }, { status: 400 });
    }

    // Get the failure analysis for context
    let errorContext = "";
    if (run.failureAnalysis) {
      try {
        const analysis = JSON.parse(run.failureAnalysis);
        errorContext = `Pipeline failure: ${analysis.summary}. Suggested fix: ${analysis.suggestedFix ?? "N/A"}`;
      } catch { /* ignore */ }
    }

    // Trigger re-implementation with error context and force flag
    // (force bypasses the "already running" check for stale jobs)
    // The guidance tells Claude to fix the existing code on the branch, not start over.
    try {
      const implRes = await fetch(
        `${req.nextUrl.origin}/api/tickets/${ticketId}/implement`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            taskId: task.id,
            force: true,
            guidance: [
              "## Pipeline Fix Mode",
              "This is a FIX for a pipeline failure, NOT a fresh implementation.",
              `The code is on branch \`${task.branchName}\` and has already been pushed.`,
              "",
              errorContext,
              "",
              "Fix the issue in the existing code, commit the fix, then the system will push and re-trigger the pipeline.",
              "Do NOT delete or recreate the branch. Make minimal, targeted fixes only.",
            ].join("\n"),
          }),
        }
      );

      if (!implRes.ok) {
        const data = await implRes.json();
        return NextResponse.json({ error: data.error ?? "Fix failed" }, { status: 500 });
      }

      // Don't reset pipeline state yet — the implement job runs async.
      // Pipeline state will reset when a new push triggers a new build,
      // which the poller will pick up automatically.
      return NextResponse.json({ ok: true, message: "Fix job started. Pipeline will update when the fix is pushed." });
    } catch (err) {
      return NextResponse.json(
        { error: `Fix & re-push failed: ${(err as Error).message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
