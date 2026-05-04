// GET /api/sdlc/epics?wsId=N
// Returns all SDLC epics for a workspace with artifact + signoff summary.

import { db } from "@/lib/db";
import { sdlcEpics, sdlcArtifacts, sdlcSignoffs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getWsIdFromRequest } from "@/lib/db/helpers";

export async function GET(request: Request) {
  const wsId = getWsIdFromRequest(request);
  if (!wsId) {
    return Response.json({ error: "wsId required" }, { status: 400 });
  }

  const epics = await db
    .select()
    .from(sdlcEpics)
    .where(eq(sdlcEpics.workspaceId, wsId));

  const artifacts = await db
    .select()
    .from(sdlcArtifacts)
    .where(eq(sdlcArtifacts.workspaceId, wsId));

  const epicIds = epics.map((e) => e.id);
  const signoffs = epicIds.length > 0
    ? await db.select().from(sdlcSignoffs)
    : [];

  const artifactsByEpic = new Map<number, typeof artifacts>();
  for (const a of artifacts) {
    const list = artifactsByEpic.get(a.epicId) ?? [];
    list.push(a);
    artifactsByEpic.set(a.epicId, list);
  }

  const signoffsByEpic = new Map<number, typeof signoffs>();
  for (const s of signoffs) {
    const list = signoffsByEpic.get(s.epicId) ?? [];
    list.push(s);
    signoffsByEpic.set(s.epicId, list);
  }

  const result = epics.map((epic) => {
    const ea = artifactsByEpic.get(epic.id) ?? [];
    const es = signoffsByEpic.get(epic.id) ?? [];
    return {
      ...epic,
      hasDesignDoc: ea.some((a) => a.type === "design_doc"),
      hasTestPlan: ea.some((a) => a.type === "test_plan"),
      designDocStatus: ea.find((a) => a.type === "design_doc")?.status ?? null,
      testPlanStatus: ea.find((a) => a.type === "test_plan")?.status ?? null,
      signoffsPending: es.filter((s) => s.status === "pending").length,
      signoffsApproved: es.filter((s) => s.status === "approved").length,
      signoffsTotal: es.length,
    };
  });

  return Response.json({ epics: result });
}
