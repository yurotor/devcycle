import { db } from "@/lib/db";
import { nrInsights } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const insightId = parseInt(id, 10);

  const insight = db
    .select()
    .from(nrInsights)
    .where(eq(nrInsights.id, insightId))
    .get();

  if (!insight) {
    return Response.json({ error: "Insight not found" }, { status: 404 });
  }

  const newStatus = insight.status === "muted" ? "active" : "muted";

  db.update(nrInsights)
    .set({ status: newStatus, updatedAt: Date.now() })
    .where(eq(nrInsights.id, insightId))
    .run();

  return Response.json({ status: newStatus });
}
