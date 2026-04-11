// POST /api/tickets/:id/implement — start implementation (stub: simulated progress)
// GET  /api/tickets/:id/implement — get implementation status

import { db } from "@/lib/db";
import { tickets, tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);

  const taskRows = await db.select().from(tasks).where(eq(tasks.ticketId, ticketId));
  const status = taskRows.every((t) => t.status === "done")
    ? "done"
    : taskRows.some((t) => t.status === "in-progress")
    ? "running"
    : "idle";

  return Response.json({ status, tasks: taskRows });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  const body = await request.json();
  const { action, taskId } = body as { action: "start" | "complete" | "manual"; taskId?: number };

  if (action === "start") {
    // Mark first pending task as in-progress
    const pendingTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.ticketId, ticketId));

    const target = taskId
      ? pendingTasks.find((t) => t.id === taskId)
      : pendingTasks.find((t) => t.status === "pending");

    if (target) {
      await db
        .update(tasks)
        .set({ status: "in-progress", updatedAt: Date.now() })
        .where(eq(tasks.id, target.id));
    }

    return Response.json({ ok: true, taskId: target?.id });
  }

  if (action === "complete" && taskId) {
    await db
      .update(tasks)
      .set({
        status: "done",
        branchName: `feat/${ticketId}-task-${taskId}`,
        updatedAt: Date.now(),
      })
      .where(eq(tasks.id, taskId));

    return Response.json({ ok: true });
  }

  if (action === "manual" && taskId) {
    await db
      .update(tasks)
      .set({ implementedManually: 1, status: "in-progress", updatedAt: Date.now() })
      .where(eq(tasks.id, taskId));

    return Response.json({ ok: true });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
