import { db } from "@/lib/db";
import { logInsights, elasticConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getWorkspace, getWsIdFromRequest } from "@/lib/db/helpers";
import { startLogPolling, isLogPolling } from "@/lib/elastic/poller";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ws = await getWorkspace(getWsIdFromRequest(request));
  if (!ws) {
    return Response.json({ error: "Workspace not configured" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connectionId");
  const environment = searchParams.get("environment");
  const showMuted = searchParams.get("showMuted") === "true";

  // Get connection IDs for this workspace
  const connections = await db
    .select({ id: elasticConnections.id })
    .from(elasticConnections)
    .where(eq(elasticConnections.workspaceId, ws.id));

  const connIds = connectionId
    ? [parseInt(connectionId, 10)]
    : connections.map((c) => c.id);

  if (connIds.length === 0) {
    return Response.json({ insights: [] });
  }

  // Auto-start poller when connections exist
  if (!isLogPolling()) {
    startLogPolling();
  }

  let allInsights = db.select().from(logInsights).all();

  // Filter by connection IDs
  allInsights = allInsights.filter((i) => connIds.includes(i.connectionId));

  // Filter by environment
  if (environment) {
    allInsights = allInsights.filter((i) => i.environment === environment);
  }

  // Filter muted unless requested
  if (!showMuted) {
    allInsights = allInsights.filter((i) => i.status !== "muted");
  }

  // Sort: critical first, then warning, then by count desc
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  allInsights.sort((a, b) => {
    const sa = severityOrder[a.severity as keyof typeof severityOrder] ?? 2;
    const sb = severityOrder[b.severity as keyof typeof severityOrder] ?? 2;
    if (sa !== sb) return sa - sb;
    return b.count - a.count;
  });

  // Parse JSON fields
  const parsed = allInsights.map((i) => ({
    ...i,
    sampleData: i.sampleData ? JSON.parse(i.sampleData) : null,
    histogramData: i.histogramData ? JSON.parse(i.histogramData) : null,
  }));

  return Response.json({ insights: parsed });
}
