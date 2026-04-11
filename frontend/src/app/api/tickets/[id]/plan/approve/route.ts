// POST /api/tickets/:id/plan/approve — approve PRD, unlock design phase

import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);

  await db
    .update(tickets)
    .set({ phase: "design", phaseLocked: 1, updatedAt: Date.now() })
    .where(eq(tickets.id, ticketId));

  return Response.json({ ok: true });
}
