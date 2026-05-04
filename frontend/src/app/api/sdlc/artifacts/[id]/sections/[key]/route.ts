// PATCH /api/sdlc/artifacts/[id]/sections/[key]
// Updates a single artifact section's markdown content (user edit).

import { db } from "@/lib/db";
import { sdlcArtifactSections, sdlcArtifacts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; key: string }> }
) {
  const { id, key } = await params;
  const artifactId = parseInt(id, 10);
  const body = await request.json();
  const { content } = body;

  if (typeof content !== "string") {
    return Response.json({ error: "content string required" }, { status: 400 });
  }

  const [section] = await db
    .select()
    .from(sdlcArtifactSections)
    .where(
      and(
        eq(sdlcArtifactSections.artifactId, artifactId),
        eq(sdlcArtifactSections.sectionKey, key)
      )
    );

  if (!section) {
    return Response.json({ error: "Section not found" }, { status: 404 });
  }

  const now = Date.now();

  await db
    .update(sdlcArtifactSections)
    .set({
      contentMarkdown: content,
      lastEditedByUser: 1,
    })
    .where(eq(sdlcArtifactSections.id, section.id));

  // Update artifact edited_at
  await db
    .update(sdlcArtifacts)
    .set({ editedAt: now, updatedAt: now })
    .where(eq(sdlcArtifacts.id, artifactId));

  return Response.json({ ok: true });
}
