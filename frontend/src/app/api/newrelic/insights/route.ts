import { db } from "@/lib/db";
import { nrInsights, nrConnections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getWorkspace, getWsIdFromRequest } from "@/lib/db/helpers";
import { pollIfStale } from "@/lib/newrelic/poller";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  console.log("[nr-insights] GET hit");
  const ws = await getWorkspace(getWsIdFromRequest(request));
  if (!ws) {
    console.log("[nr-insights] No workspace");
    return Response.json({ error: "Workspace not configured" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connectionId");
  const showMuted = searchParams.get("showMuted") === "true";
  const metricType = searchParams.get("metricType");

  const connections = await db
    .select({ id: nrConnections.id })
    .from(nrConnections)
    .where(eq(nrConnections.workspaceId, ws.id));

  const connIds = connectionId
    ? [parseInt(connectionId, 10)]
    : connections.map((c) => c.id);

  if (connIds.length === 0) {
    return Response.json({ insights: [] });
  }

  await pollIfStale();

  let allInsights = db.select().from(nrInsights).all();

  allInsights = allInsights.filter((i) => connIds.includes(i.connectionId));

  if (metricType) {
    allInsights = allInsights.filter((i) => i.metricType === metricType);
  }

  if (!showMuted) {
    allInsights = allInsights.filter((i) => i.status !== "muted");
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  allInsights.sort((a, b) => {
    const sa = severityOrder[a.severity as keyof typeof severityOrder] ?? 2;
    const sb = severityOrder[b.severity as keyof typeof severityOrder] ?? 2;
    if (sa !== sb) return sa - sb;
    return b.currentValue - a.currentValue;
  });

  const parsed = allInsights.map((i) => ({
    ...i,
    crossRefData: i.crossRefData ? JSON.parse(i.crossRefData) : null,
    histogramData: i.histogramData ? JSON.parse(i.histogramData) : null,
  }));

  return Response.json({ insights: parsed });
}
