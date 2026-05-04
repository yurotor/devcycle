// PATCH /api/sdlc/signoffs/:id — toggle signoff status
import { db } from "@/lib/db";
import { sdlcSignoffs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const signoffId = Number(id);

  const [signoff] = await db
    .select()
    .from(sdlcSignoffs)
    .where(eq(sdlcSignoffs.id, signoffId));

  if (!signoff) {
    return Response.json({ error: "Signoff not found" }, { status: 404 });
  }

  const newStatus = signoff.status === "approved" ? "pending" : "approved";
  const signedAt = newStatus === "approved" ? Date.now() : null;

  await db
    .update(sdlcSignoffs)
    .set({ status: newStatus, signedAt })
    .where(eq(sdlcSignoffs.id, signoffId));

  return Response.json({ status: newStatus, signedAt });
}
