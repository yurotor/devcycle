// POST /api/scan/start — fire-and-forget scan trigger.
// Creates a job row and starts the scan in the background.

import { db } from "@/lib/db";
import { workspace, jobs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ScanEngine, type ScanEvent, type DoneEvent } from "@/lib/scan/engine";

export const dynamic = "force-dynamic";

export async function POST() {
  const [ws] = await db.select().from(workspace).limit(1);
  if (!ws) {
    return Response.json({ error: "Workspace not configured" }, { status: 404 });
  }

  // Check if a scan is already running
  const running = await db
    .select()
    .from(jobs)
    .where(eq(jobs.workspaceId, ws.id))
    .all();
  const activeJob = running.find((j) => j.type === "scan" && j.status === "running");
  if (activeJob) {
    return Response.json({ jobId: activeJob.id, status: "already_running" });
  }

  // Create job row
  const now = Date.now();
  const [job] = await db
    .insert(jobs)
    .values({
      workspaceId: ws.id,
      type: "scan",
      status: "running",
      progress: 0,
      meta: JSON.stringify({ phase: "starting", events: [], failCount: 0 }),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Run scan in background (fire-and-forget)
  runScanInBackground(ws.id, job.id).catch((err) => {
    console.error("[scan/start] Background scan crashed:", err);
  });

  return Response.json({ jobId: job.id, status: "started" });
}

async function runScanInBackground(workspaceId: number, jobId: number): Promise<void> {
  const events: Array<ScanEvent | DoneEvent> = [];
  let failCount = 0;
  let currentPhase = "analyzing";

  const updateJob = async (updates: {
    status?: string;
    progress?: number;
    phase?: string;
    error?: string;
  }) => {
    if (updates.phase) currentPhase = updates.phase;
    await db
      .update(jobs)
      .set({
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.progress !== undefined ? { progress: updates.progress } : {}),
        ...(updates.error ? { error: updates.error } : {}),
        meta: JSON.stringify({
          phase: currentPhase,
          events: events.slice(-50), // keep last 50 events
          failCount,
        }),
        updatedAt: Date.now(),
      })
      .where(eq(jobs.id, jobId));
  };

  const emit = (event: ScanEvent | DoneEvent) => {
    events.push(event);

    if ("type" in event && event.type === "done") {
      // handled after engine.run()
      return;
    }

    const scanEvent = event as ScanEvent;
    if (scanEvent.type === "phase") {
      const msg = scanEvent.message.toLowerCase();
      const phase = msg.includes("synthesiz")
        ? "synthesizing"
        : msg.includes("compil")
          ? "compiling"
          : "analyzing";
      const progress = phase === "synthesizing" ? 85 : phase === "compiling" ? 95 : undefined;
      updateJob({ phase, progress }).catch(console.error);
    } else if (scanEvent.type === "success" && scanEvent.message.includes("Done")) {
      // Repo completed — estimate progress from message pattern [X/Y]
      const match = scanEvent.message.match(/\[(\d+)\/(\d+)\]/);
      if (match) {
        const done = parseInt(match[1], 10);
        const total = parseInt(match[2], 10);
        if (total > 0) {
          updateJob({ progress: Math.round((done / total) * 85) }).catch(console.error);
        }
      }
    }
    if (scanEvent.type === "warning" && scanEvent.message.includes("Error")) {
      failCount++;
      updateJob({}).catch(console.error);
    }
  };

  const engine = new ScanEngine(workspaceId, emit);

  try {
    await engine.run();
    await updateJob({ status: "done", progress: 100, phase: "done" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[scan/start] Scan failed:", msg);
    await updateJob({ status: "failed", error: msg.slice(0, 500), phase: "failed" });
  }
}
