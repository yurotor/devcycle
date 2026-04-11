// POST /api/tickets/:id/pr — create PR (stub: simulated)

import { db } from "@/lib/db";
import { tickets, tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) return Response.json({ error: "Ticket not found" }, { status: 404 });

  // Stub PR creation — when ADO client is wired, this will create a real PR
  const prNumber = 200 + ticketId;
  const prUrl = `https://dev.azure.com/org/project/_git/repo/pullrequest/${prNumber}`;

  // Update tasks with PR info
  const ticketTasks = await db.select().from(tasks).where(eq(tasks.ticketId, ticketId));
  for (const task of ticketTasks) {
    if (task.status === "done" && !task.prUrl) {
      await db
        .update(tasks)
        .set({ prUrl, prNumber, updatedAt: Date.now() })
        .where(eq(tasks.id, task.id));
    }
  }

  return Response.json({
    ok: true,
    pr: {
      number: prNumber,
      url: prUrl,
      title: `${ticket.jiraKey}: ${ticket.title}`,
    },
  });
}
