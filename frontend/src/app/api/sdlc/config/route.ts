// GET /api/sdlc/config?wsId=N — returns phase mappings for workspace
// PUT /api/sdlc/config?wsId=N — replaces phase mappings for workspace

import { db } from "@/lib/db";
import { DEFAULT_PHASE_MAPPINGS } from "@/lib/db";
import { sdlcPhaseConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getWsIdFromRequest } from "@/lib/db/helpers";

export async function GET(request: Request) {
  const wsId = getWsIdFromRequest(request);
  if (!wsId) {
    return Response.json({ error: "wsId required" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(sdlcPhaseConfig)
    .where(eq(sdlcPhaseConfig.workspaceId, wsId));

  if (rows.length === 0) {
    return Response.json({
      mappings: DEFAULT_PHASE_MAPPINGS,
      isDefault: true,
    });
  }

  return Response.json({
    mappings: rows.map((r) => ({ jiraStatus: r.jiraStatus, sdlcPhase: r.sdlcPhase })),
    isDefault: false,
  });
}

export async function PUT(request: Request) {
  const wsId = getWsIdFromRequest(request);
  if (!wsId) {
    return Response.json({ error: "wsId required" }, { status: 400 });
  }

  const body = await request.json();
  const mappings: Array<{ jiraStatus: string; sdlcPhase: string }> = body.mappings;

  if (!Array.isArray(mappings)) {
    return Response.json({ error: "mappings array required" }, { status: 400 });
  }

  // Replace all mappings
  await db.delete(sdlcPhaseConfig).where(eq(sdlcPhaseConfig.workspaceId, wsId));

  for (const m of mappings) {
    if (m.jiraStatus && m.sdlcPhase) {
      await db.insert(sdlcPhaseConfig).values({
        workspaceId: wsId,
        jiraStatus: m.jiraStatus,
        sdlcPhase: m.sdlcPhase,
      });
    }
  }

  return Response.json({ ok: true });
}
