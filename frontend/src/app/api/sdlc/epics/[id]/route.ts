// GET /api/sdlc/epics/[id]
// Returns full epic detail with artifacts, sections, and signoffs.

import { db } from "@/lib/db";
import {
  sdlcEpics,
  sdlcArtifacts,
  sdlcArtifactSections,
  sdlcSignoffs,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const epicId = parseInt(id, 10);

  const [epic] = await db
    .select()
    .from(sdlcEpics)
    .where(eq(sdlcEpics.id, epicId));

  if (!epic) {
    return Response.json({ error: "Epic not found" }, { status: 404 });
  }

  const artifacts = await db
    .select()
    .from(sdlcArtifacts)
    .where(eq(sdlcArtifacts.epicId, epicId));

  const sections: Record<number, Array<typeof sdlcArtifactSections.$inferSelect>> = {};
  for (const artifact of artifacts) {
    const rows = await db
      .select()
      .from(sdlcArtifactSections)
      .where(eq(sdlcArtifactSections.artifactId, artifact.id));
    sections[artifact.id] = rows.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  const signoffs = await db
    .select()
    .from(sdlcSignoffs)
    .where(eq(sdlcSignoffs.epicId, epicId));

  const artifactsWithSections = artifacts.map((a) => ({
    ...a,
    sections: sections[a.id] ?? [],
  }));

  return Response.json({ epic, artifacts: artifactsWithSections, signoffs });
}
