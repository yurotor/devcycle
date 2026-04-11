// GET /api/scan/status — returns current scan job state for the pill to poll.

import { db } from "@/lib/db";
import { workspace, jobs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export interface ScanStatus {
  jobId: number | null;
  status: "idle" | "running" | "done" | "failed";
  progress: number;
  phase: string;
  error: string | null;
  failCount: number;
  events: Array<{ repo: string; message: string; type: string }>;
}

export async function GET() {
  const [ws] = await db.select().from(workspace).limit(1);
  if (!ws) {
    return Response.json({
      jobId: null,
      status: "idle",
      progress: 0,
      phase: "",
      error: null,
      failCount: 0,
      events: [],
    } satisfies ScanStatus);
  }

  // Get the most recent scan job
  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.workspaceId, ws.id))
    .orderBy(desc(jobs.createdAt))
    .limit(1);

  if (!job || job.type !== "scan") {
    return Response.json({
      jobId: null,
      status: "idle",
      progress: 0,
      phase: "",
      error: null,
      failCount: 0,
      events: [],
    } satisfies ScanStatus);
  }

  let meta: { phase?: string; events?: Array<{ repo: string; message: string; type: string }>; failCount?: number } = {};
  try {
    meta = JSON.parse(job.meta ?? "{}");
  } catch {
    // ignore
  }

  return Response.json({
    jobId: job.id,
    status: job.status as ScanStatus["status"],
    progress: job.progress,
    phase: meta.phase ?? "",
    error: job.error,
    failCount: meta.failCount ?? 0,
    events: meta.events ?? [],
  } satisfies ScanStatus);
}
