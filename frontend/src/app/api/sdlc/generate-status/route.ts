// GET /api/sdlc/generate-status?artifactId=X
// Returns generation progress for polling UI.

import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artifactId = Number(searchParams.get("artifactId"));

  if (!artifactId) {
    return Response.json({ error: "artifactId required" }, { status: 400 });
  }

  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.type, "sdlc_generate"), eq(jobs.relatedId, artifactId)))
    .orderBy(desc(jobs.createdAt))
    .limit(1);

  if (!job) {
    return Response.json({ status: "none" });
  }

  const meta = job.meta ? JSON.parse(job.meta) : {};

  return Response.json({
    status: job.status,
    progress: job.progress,
    currentSection: meta.currentSection ?? null,
    completedSections: meta.completedSections ?? 0,
    totalSections: meta.totalSections ?? 0,
    error: job.error ?? null,
  });
}
