// POST /api/sdlc/sync?wsId=N
// Syncs Jira Epics into sdlc_epics table. Maps Jira statuses to SDLC phases.

import { db } from "@/lib/db";
import { DEFAULT_PHASE_MAPPINGS } from "@/lib/db";
import { pats, sdlcEpics, sdlcPhaseConfig, sdlcSignoffs } from "@/lib/db/schema";
import { decryptPat } from "@/lib/crypto";
import { JiraClient } from "@/lib/jira/client";
import { and, eq } from "drizzle-orm";
import { getWorkspace, getWsIdFromRequest } from "@/lib/db/helpers";

const SIGNOFF_ROLES = ["vp_eng", "solution_architect", "product_manager"];

export async function POST(request: Request) {
  const ws = await getWorkspace(getWsIdFromRequest(request));
  if (!ws?.jiraUrl) {
    return Response.json({ error: "Jira not configured" }, { status: 404 });
  }

  const [pat] = await db
    .select()
    .from(pats)
    .where(eq(pats.service, "jira"));

  if (!pat) {
    return Response.json({ error: "Jira credentials not found" }, { status: 404 });
  }

  const token = decryptPat(pat.encryptedPat, pat.iv);
  const client = new JiraClient(ws.jiraUrl, token, pat.username ?? undefined);
  const doneStatuses: string[] = ws.jiraDoneStatuses
    ? JSON.parse(ws.jiraDoneStatuses)
    : ["Done", "Won't Do", "Won't Fix"];
  const projectKey = ws.jiraProjectKey ?? undefined;

  let jiraEpics;
  try {
    jiraEpics = await client.getAllEpics(doneStatuses, projectKey);
    console.log(`[sdlc/sync] loaded ${jiraEpics.length} epics`);
  } catch (err) {
    console.error("[sdlc/sync] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Failed to load epics", detail: msg }, { status: 502 });
  }

  // Build phase mapping: Jira status → SDLC phase
  const configRows = await db
    .select()
    .from(sdlcPhaseConfig)
    .where(eq(sdlcPhaseConfig.workspaceId, ws.id));

  const phaseMap = new Map<string, string>();
  const source = configRows.length > 0 ? configRows : DEFAULT_PHASE_MAPPINGS;
  for (const row of source) {
    phaseMap.set(row.jiraStatus.toLowerCase(), row.sdlcPhase);
  }

  const now = Date.now();

  // Get existing epics for this workspace
  const existing = await db
    .select()
    .from(sdlcEpics)
    .where(eq(sdlcEpics.workspaceId, ws.id));

  const existingByKey = new Map(existing.map((e) => [e.jiraKey, e]));

  for (const epic of jiraEpics) {
    const phase = phaseMap.get(epic.status.toLowerCase()) ?? "design";

    if (existingByKey.has(epic.key)) {
      await db
        .update(sdlcEpics)
        .set({
          title: epic.summary,
          description: epic.description,
          status: epic.status,
          assignee: epic.assignee,
          sdlcPhase: phase,
          lastSyncedAt: now,
          updatedAt: now,
        })
        .where(and(eq(sdlcEpics.workspaceId, ws.id), eq(sdlcEpics.jiraKey, epic.key)));
    } else {
      const [inserted] = await db
        .insert(sdlcEpics)
        .values({
          workspaceId: ws.id,
          jiraKey: epic.key,
          jiraId: epic.id,
          title: epic.summary,
          description: epic.description,
          status: epic.status,
          assignee: epic.assignee,
          sdlcPhase: phase,
          lastSyncedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // Create default signoff entries for new epics
      for (const role of SIGNOFF_ROLES) {
        await db.insert(sdlcSignoffs).values({
          epicId: inserted.id,
          role,
          status: "pending",
        });
      }
    }
  }

  // Remove epics that are no longer in Jira (moved to done/deleted)
  const jiraKeys = new Set(jiraEpics.map((e) => e.key));
  for (const [key, existing_epic] of existingByKey) {
    if (!jiraKeys.has(key)) {
      await db.delete(sdlcEpics).where(eq(sdlcEpics.id, existing_epic.id));
    }
  }

  return Response.json({ count: jiraEpics.length });
}
