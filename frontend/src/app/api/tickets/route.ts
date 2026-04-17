// GET /api/tickets
// Returns all tickets for the current workspace, mapped to the UI Ticket shape.

import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ensurePreprocessing } from "@/lib/preprocess";
import { getWorkspace, getWsIdFromRequest } from "@/lib/db/helpers";

export async function GET(request: Request) {
  // Kick off background pre-processing of new tickets (no-op if already started)
  ensurePreprocessing();
  const ws = await getWorkspace(getWsIdFromRequest(request));
  if (!ws) {
    return Response.json({ tickets: [] });
  }

  const rows = await db
    .select()
    .from(tickets)
    .where(eq(tickets.workspaceId, ws.id))
    .orderBy(tickets.createdAt);

  return Response.json({
    tickets: rows.map((t) => ({
      id: String(t.id),
      jiraKey: t.jiraKey,
      title: t.title,
      type: t.type,
      phase: t.phase,
      priority: t.priority,
      assignee: t.assignee ?? undefined,
      description: t.description ?? "",
      prdPath: t.prdPath ?? null,
    })),
  });
}
