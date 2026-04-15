// GET /api/tickets
// Returns all tickets for the current workspace, mapped to the UI Ticket shape.

import { db } from "@/lib/db";
import { tickets, workspace } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ensurePreprocessing } from "@/lib/preprocess";

export async function GET() {
  // Kick off background pre-processing of new tickets (no-op if already started)
  ensurePreprocessing();
  const [ws] = await db.select().from(workspace).limit(1);
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
