// PATCH /api/tickets/[id]
// Updates mutable fields on a ticket (currently: phase).
// KB persistence for analyze→plan is handled by /api/tickets/[id]/analysis/complete.

import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  if (isNaN(ticketId)) {
    return Response.json({ error: "Invalid ticket id" }, { status: 400 });
  }

  const body = (await request.json()) as { phase?: string };

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) {
    return Response.json({ error: "Ticket not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  if (body.phase) updates.phase = body.phase;

  await db.update(tickets).set(updates).where(eq(tickets.id, ticketId));

  return Response.json({ ok: true });
}
