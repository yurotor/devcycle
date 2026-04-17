// GET /api/scan/status — returns current scan job state for the pill to poll.

import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getKbRoot } from "@/lib/kb-path";
import { getWorkspace, getWsIdFromRequest } from "@/lib/db/helpers";

export const dynamic = "force-dynamic";

export interface ScanStatus {
  jobId: number | null;
  status: "idle" | "running" | "done" | "failed";
  progress: number;
  phase: string;
  error: string | null;
  failCount: number;
  events: Array<{ repo: string; message: string; type: string }>;
  /** True when system-synthesis.json exists — interview should not start until this is true. */
  synthesisReady: boolean;
  /** True when interview-notes.json exists — interview already completed. */
  interviewDone: boolean;
}

export async function GET(request: Request) {
  const ws = await getWorkspace(getWsIdFromRequest(request));
  if (!ws) {
    return Response.json({
      jobId: null,
      status: "idle",
      progress: 0,
      phase: "",
      error: null,
      failCount: 0,
      events: [],
      synthesisReady: false,
      interviewDone: false,
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
      synthesisReady: false,
      interviewDone: false,
    } satisfies ScanStatus);
  }

  let meta: { phase?: string; events?: Array<{ repo: string; message: string; type: string }>; failCount?: number } = {};
  try {
    meta = JSON.parse(job.meta ?? "{}");
  } catch {
    // ignore
  }

  const kbRoot = getKbRoot(ws.id);
  const synthesisReady = fs.existsSync(path.join(kbRoot, "raw", "system-synthesis.json"));
  const interviewDone = fs.existsSync(path.join(kbRoot, "raw", "interview-notes.json"));

  return Response.json({
    jobId: job.id,
    status: job.status as ScanStatus["status"],
    progress: job.progress,
    phase: meta.phase ?? "",
    error: job.error,
    failCount: meta.failCount ?? 0,
    events: meta.events ?? [],
    synthesisReady,
    interviewDone,
  } satisfies ScanStatus);
}
