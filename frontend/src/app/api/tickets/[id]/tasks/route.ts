// GET /api/tickets/:id/tasks — return waves + tasks for a ticket

import { db } from "@/lib/db";
import { waves, tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);

  const waveRows = await db.select().from(waves).where(eq(waves.ticketId, ticketId));
  const taskRows = await db.select().from(tasks).where(eq(tasks.ticketId, ticketId));

  const result = waveRows
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((w) => ({
      ...w,
      tasks: taskRows.filter((t) => t.waveId === w.id),
    }));

  return Response.json({ waves: result });
}
