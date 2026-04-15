// GET /api/tickets/:id/tasks — return tasks for a ticket (flat list, no waves)

import { db } from "@/lib/db";
import { tasks, repos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);

  const taskRows = await db.select().from(tasks).where(eq(tasks.ticketId, ticketId));
  const repoRows = await db.select().from(repos);

  const enriched = taskRows.map((t) => {
    const repo = repoRows.find((r) => r.id === t.repoId);
    return {
      ...t,
      repoName: repo?.name ?? null,
      todos: t.todos ? JSON.parse(t.todos) : [],
    };
  });

  return Response.json({ tasks: enriched });
}
