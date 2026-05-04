import { db } from "../db";
import { nrConnections, nrBaseline, nrInsights } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { NewRelicClient } from "./client";
import { decryptPat } from "../crypto";

let lastPollAt = 0;
let pollPromise: Promise<void> | null = null;

const POLL_INTERVAL_MS = 5 * 60_000;

export async function pollIfStale(): Promise<void> {
  const now = Date.now();
  const age = now - lastPollAt;
  console.log(`[nr-poller] pollIfStale called, age=${age}ms, threshold=${POLL_INTERVAL_MS}ms, hasPromise=${!!pollPromise}`);
  if (age < POLL_INTERVAL_MS) return;
  if (pollPromise) return pollPromise;

  lastPollAt = now;
  console.log("[nr-poller] Starting poll...");
  pollPromise = pollAllConnections()
    .catch((err) => console.error("[nr-poller] Poll error:", err))
    .finally(() => { pollPromise = null; });

  return pollPromise;
}

export function startNrPolling(): void {
  pollIfStale();
}

export function isNrPolling(): boolean {
  return pollPromise !== null;
}

export function stopNrPolling(): void {
  lastPollAt = Date.now();
}

// Metric-specific severity thresholds: [warning multiplier, critical multiplier]
const THRESHOLDS: Record<string, [number, number]> = {
  error_rate: [2, 5],
  latency_p95: [1.5, 3],
  slow_db: [2, 4],
};

const EMA_ALPHA = 0.1;

async function pollAllConnections(): Promise<void> {
  const connections = db
    .select()
    .from(nrConnections)
    .where(eq(nrConnections.pollingEnabled, 1))
    .all();

  if (connections.length === 0) return;

  await Promise.allSettled(connections.map((conn) => pollConnection(conn)));
}

async function pollConnection(
  conn: typeof nrConnections.$inferSelect
): Promise<void> {
  let apiKey: string;
  try {
    apiKey = decryptPat(conn.apiKeyEncrypted, conn.apiKeyIv);
  } catch {
    console.error(`[nr-poller] Cannot decrypt key for connection ${conn.id}`);
    return;
  }

  const client = new NewRelicClient(conn.accountId, apiKey);
  const monitoredApps: string[] = JSON.parse(conn.appNames);
  console.log(`[nr-poller] Polling conn ${conn.id}, apps: ${JSON.stringify(monitoredApps)}`);

  // 1. Error rates
  try {
    const result = await client.getErrorRates(monitoredApps);
    console.log(`[nr-poller] Error rates: ${result.facets?.length ?? 0} facets, raw results: ${result.results.length}`);
    if (result.facets) {
      for (const facet of result.facets) {
        const count = (facet.results[0]?.count as number) ?? 0;
        console.log(`[nr-poller]   facet="${facet.name}" count=${count}`);
        await processMetric(conn.id, facet.name, "error_rate", null, count);
      }
    }
  } catch (err) {
    console.error(`[nr-poller] Error rate query failed for conn ${conn.id}:`, (err as Error).message);
  }

  // 2. P95 latency by endpoint
  try {
    const result = await client.getLatencyP95(monitoredApps);
    console.log(`[nr-poller] Latency: ${result.facets?.length ?? 0} facets`);
    if (result.facets) {
      for (const facet of result.facets) {
        const parts = String(facet.name).split(",");
        const endpointName = parts[0]?.trim() ?? facet.name;
        const appName = parts[1]?.trim() ?? "";
        const p95 = (facet.results[0]?.["percentile.duration"] as number)
          ?? (facet.results[0]?.percentile as Record<string, number>)?.["95"]
          ?? 0;
        const valueMs = Math.round(p95 * 1000);
        await processMetric(conn.id, appName, "latency_p95", endpointName, valueMs);
      }
    }
  } catch (err) {
    console.error(`[nr-poller] Latency query failed for conn ${conn.id}:`, (err as Error).message);
  }

  // 3. Slow DB queries
  try {
    const result = await client.getSlowDBQueries(monitoredApps);
    console.log(`[nr-poller] Slow DB: ${result.facets?.length ?? 0} facets`);
    if (result.facets) {
      for (const facet of result.facets) {
        const parts = String(facet.name).split(",");
        const queryName = parts[0]?.trim() ?? facet.name;
        const appName = parts[1]?.trim() ?? "";
        const avgDuration = (facet.results[0]?.average as number) ?? 0;
        const valueMs = Math.round(avgDuration * 1000);
        await processMetric(conn.id, appName, "slow_db", queryName, valueMs);
      }
    }
  } catch (err) {
    console.error(`[nr-poller] Slow DB query failed for conn ${conn.id}:`, (err as Error).message);
  }

  // 4. Histogram for sparklines
  try {
    const result = await client.getErrorHistogram(monitoredApps);
    if (result.facets) {
      for (const facet of result.facets) {
        const timeseries = facet.results as Array<{ beginTimeSeconds?: number; count?: number }>;
        const histogramJson = JSON.stringify(
          timeseries.map((b) => ({ key: (b.beginTimeSeconds ?? 0) * 1000, count: b.count ?? 0 }))
        );
        storeHistogramForApp(conn.id, facet.name, histogramJson);
      }
    }
  } catch (err) {
    console.error(`[nr-poller] Histogram query failed for conn ${conn.id}:`, (err as Error).message);
  }
}

function isMonitored(appName: string, monitoredApps: string[]): boolean {
  if (monitoredApps.length === 0) return true;
  return monitoredApps.some(
    (m) => appName === m || appName.startsWith(m + " /") || appName.startsWith(m + "/")
  );
}

async function processMetric(
  connectionId: number,
  appName: string,
  metricType: string,
  metricLabel: string | null,
  currentValue: number
): Promise<void> {
  const now = Date.now();
  const baselineKey = metricLabel ? `${appName}:${metricLabel}` : appName;

  const existing = db
    .select()
    .from(nrBaseline)
    .where(
      and(
        eq(nrBaseline.connectionId, connectionId),
        eq(nrBaseline.appName, baselineKey),
        eq(nrBaseline.metricType, metricType)
      )
    )
    .get();

  let severity: "info" | "warning" | "critical" = "info";
  let baselineValue = 0;

  if (!existing) {
    db.insert(nrBaseline)
      .values({
        connectionId,
        appName: baselineKey,
        metricType,
        avgValue: currentValue,
        lastSeen: now,
        firstSeen: now,
      })
      .run();
    baselineValue = currentValue;
  } else {
    baselineValue = existing.avgValue;
    const [warnThreshold, critThreshold] = THRESHOLDS[metricType] ?? [2, 5];

    if (baselineValue > 0) {
      const ratio = currentValue / baselineValue;
      if (ratio >= critThreshold) severity = "critical";
      else if (ratio >= warnThreshold) severity = "warning";
    }

    const newAvg = Math.round(
      EMA_ALPHA * currentValue + (1 - EMA_ALPHA) * existing.avgValue
    );

    db.update(nrBaseline)
      .set({ avgValue: newAvg, lastSeen: now })
      .where(eq(nrBaseline.id, existing.id))
      .run();
  }

  if (severity === "info" && currentValue === 0) return;

  upsertInsight(connectionId, {
    appName,
    metricType,
    metricLabel,
    currentValue,
    baselineValue,
    severity,
    detectedAt: now,
  });
}

function upsertInsight(
  connectionId: number,
  data: {
    appName: string;
    metricType: string;
    metricLabel: string | null;
    currentValue: number;
    baselineValue: number;
    severity: string;
    detectedAt: number;
  }
): void {
  const conditions = [
    eq(nrInsights.connectionId, connectionId),
    eq(nrInsights.appName, data.appName),
    eq(nrInsights.metricType, data.metricType),
  ];

  const allInsights = db.select().from(nrInsights).where(and(...conditions)).all();
  const existing = data.metricLabel
    ? allInsights.find((i) => i.metricLabel === data.metricLabel)
    : allInsights.find((i) => !i.metricLabel);

  if (existing) {
    if (existing.status === "muted" || existing.status === "accepted") return;

    db.update(nrInsights)
      .set({
        currentValue: data.currentValue,
        baselineValue: data.baselineValue,
        severity: data.severity,
        updatedAt: data.detectedAt,
      })
      .where(eq(nrInsights.id, existing.id))
      .run();
  } else {
    const nrqlMap: Record<string, string> = {
      error_rate: `SELECT count(*) FROM TransactionError WHERE appName='${data.appName}' SINCE 5 minutes ago`,
      latency_p95: `SELECT percentile(duration, 95) FROM Transaction WHERE appName='${data.appName}' AND name='${data.metricLabel ?? ""}' SINCE 5 minutes ago`,
      slow_db: `SELECT average(databaseDuration) FROM Transaction WHERE appName='${data.appName}' AND name='${data.metricLabel ?? ""}' SINCE 5 minutes ago`,
    };

    db.insert(nrInsights)
      .values({
        connectionId,
        appName: data.appName,
        metricType: data.metricType,
        metricLabel: data.metricLabel ?? null,
        currentValue: data.currentValue,
        baselineValue: data.baselineValue,
        severity: data.severity,
        nrqlQuery: nrqlMap[data.metricType] ?? null,
        status: "active",
        detectedAt: data.detectedAt,
        updatedAt: data.detectedAt,
      })
      .run();
  }
}

function storeHistogramForApp(
  connectionId: number,
  appName: string,
  histogramJson: string
): void {
  const insights = db
    .select()
    .from(nrInsights)
    .where(
      and(
        eq(nrInsights.connectionId, connectionId),
        eq(nrInsights.appName, appName)
      )
    )
    .all();

  for (const insight of insights) {
    db.update(nrInsights)
      .set({ histogramData: histogramJson })
      .where(eq(nrInsights.id, insight.id))
      .run();
  }
}
