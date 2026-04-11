// POST /api/suggestions/:id/dismiss

import { db } from "@/lib/db";
import { scanSuggestions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  await db
    .update(scanSuggestions)
    .set({ dismissed: 1 })
    .where(eq(scanSuggestions.id, numId));

  return Response.json({ ok: true });
}
