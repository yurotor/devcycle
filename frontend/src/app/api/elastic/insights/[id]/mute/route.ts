import { db } from "@/lib/db";
import { logInsights } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const insightId = parseInt(id, 10);

  const insight = db
    .select()
    .from(logInsights)
    .where(eq(logInsights.id, insightId))
    .get();

  if (!insight) {
    return Response.json({ error: "Insight not found" }, { status: 404 });
  }

  const newStatus = insight.status === "muted" ? "active" : "muted";

  db.update(logInsights)
    .set({ status: newStatus, updatedAt: Date.now() })
    .where(eq(logInsights.id, insightId))
    .run();

  return Response.json({ status: newStatus });
}
