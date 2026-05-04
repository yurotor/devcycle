import { db } from "../db";
import { elasticConnections, logBaseline, logInsights } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { ElasticClient, type ElasticBucket } from "./client";
import { decryptPat } from "../crypto";

let pollInterval: ReturnType<typeof setInterval> | null = null;

export function startLogPolling(intervalMs: number = 5 * 60_000): void {
  if (pollInterval) return;
  console.log(`[log-poller] Starting every ${intervalMs / 1000}s`);
  pollInterval = setInterval(() => {
    pollAllConnections().catch((err) =>
      console.error("[log-poller] Poll error:", err)
    );
  }, intervalMs);
  pollAllConnections().catch((err) =>
    console.error("[log-poller] Initial poll error:", err)
  );
}

export function stopLogPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log("[log-poller] Stopped");
  }
}

export function isLogPolling(): boolean {
  return pollInterval !== null;
}

async function pollAllConnections(): Promise<void> {
  const connections = db
    .select()
    .from(elasticConnections)
    .where(eq(elasticConnections.pollingEnabled, 1))
    .all();

  if (connections.length === 0) return;

  await Promise.allSettled(connections.map((conn) => pollConnection(conn)));
}

async function pollConnection(
  conn: typeof elasticConnections.$inferSelect
): Promise<void> {
  let apiKey: string;
  try {
    apiKey = decryptPat(conn.apiKeyEncrypted, conn.apiKeyIv);
  } catch {
    console.error(`[log-poller] Cannot decrypt key for connection ${conn.id}`);
    return;
  }

  const client = new ElasticClient(conn.url, apiKey);
  const env = conn.environment ?? "production";

  const namespaceFilter = {
    bool: {
      filter: [
        { term: { "data_stream.namespace": env } },
        { term: { logLevel: "Error" } },
        { range: { "@timestamp": { gte: "now-5m" } } },
      ],
    },
  };

  // 1. Error pattern aggregation (top 50 messageTemplate.keyword)
  try {
    const aggs = await client.aggregate(
      conn.indexPattern,
      {
        error_templates: {
          terms: { field: "messageTemplate.keyword", size: 50 },
        },
      },
      namespaceFilter
    );

    const buckets = aggs.error_templates?.buckets ?? [];
    await processErrorPatterns(conn.id, env, buckets, client, conn.indexPattern);
  } catch (err) {
    console.error(`[log-poller] Error pattern query failed for conn ${conn.id}:`, (err as Error).message);
  }

  // 2. Exception class aggregation
  try {
    const exceptionFilter = {
      bool: {
        filter: [
          { term: { "data_stream.namespace": env } },
          { exists: { field: "exceptions.StackTraceString" } },
          { range: { "@timestamp": { gte: "now-5m" } } },
        ],
      },
    };

    const aggs = await client.aggregate(
      conn.indexPattern,
      {
        exception_classes: {
          terms: { field: "exceptions.ClassName.keyword", size: 50 },
        },
      },
      exceptionFilter
    );

    const buckets = aggs.exception_classes?.buckets ?? [];
    await processExceptionPatterns(conn.id, env, buckets);
  } catch (err) {
    console.error(`[log-poller] Exception query failed for conn ${conn.id}:`, (err as Error).message);
  }

  // 3. Date histogram for sparklines (30-min window, 1-min buckets)
  try {
    const histogramFilter = {
      bool: {
        filter: [
          { term: { "data_stream.namespace": env } },
          { term: { logLevel: "Error" } },
          { range: { "@timestamp": { gte: "now-30m" } } },
        ],
      },
    };

    const aggs = await client.aggregate(
      conn.indexPattern,
      {
        error_over_time: {
          date_histogram: { field: "@timestamp", fixed_interval: "1m" },
        },
      },
      histogramFilter
    );

    const buckets = aggs.error_over_time?.buckets ?? [];
    await storeHistogramData(conn.id, env, buckets);
  } catch (err) {
    console.error(`[log-poller] Histogram query failed for conn ${conn.id}:`, (err as Error).message);
  }
}

async function processErrorPatterns(
  connectionId: number,
  environment: string,
  buckets: ElasticBucket[],
  client: ElasticClient,
  indexPattern: string
): Promise<void> {
  const now = Date.now();

  for (const bucket of buckets) {
    const template = bucket.key;
    const count = bucket.doc_count;
    const rate5min = count;

    let sampleData: string | undefined;
    try {
      const samples = await client.fetchSample(indexPattern, {
        bool: {
          filter: [
            { term: { "data_stream.namespace": environment } },
            { match_phrase: { messageTemplate: template } },
            { range: { "@timestamp": { gte: "now-5m" } } },
          ],
        },
      }, 3);
      if (samples.length > 0) {
        sampleData = JSON.stringify(
          samples.map((h) => ({
            timestamp: h._source["@timestamp"],
            message: h._source.message,
            logLevel: h._source.logLevel,
            ...(h._source.exceptions ? { exceptions: h._source.exceptions } : {}),
          }))
        );
      }
    } catch {
      // Sample fetch is best-effort
    }

    // Check baseline
    const existing = db
      .select()
      .from(logBaseline)
      .where(
        and(
          eq(logBaseline.connectionId, connectionId),
          eq(logBaseline.environment, environment),
          eq(logBaseline.messageTemplate, template)
        )
      )
      .get();

    if (!existing) {
      db.insert(logBaseline)
        .values({
          connectionId,
          environment,
          messageTemplate: template,
          avgHourlyRate: rate5min * 12,
          lastSeen: now,
          firstSeen: now,
        })
        .run();

      upsertInsight(connectionId, environment, {
        type: "new_error",
        severity: "info",
        messageTemplate: template,
        count,
        currentRate: rate5min,
        detectedAt: now,
        sampleData,
      });
    } else {
      const baselineRate5min = existing.avgHourlyRate / 12;
      let severity: "info" | "warning" | "critical" = "info";

      if (baselineRate5min > 0) {
        const ratio = rate5min / baselineRate5min;
        if (ratio >= 5) severity = "critical";
        else if (ratio >= 2) severity = "warning";
      }

      const alpha = 0.1;
      const newHourlyRate = Math.round(
        alpha * (rate5min * 12) + (1 - alpha) * existing.avgHourlyRate
      );

      db.update(logBaseline)
        .set({ avgHourlyRate: newHourlyRate, lastSeen: now })
        .where(eq(logBaseline.id, existing.id))
        .run();

      upsertInsight(connectionId, environment, {
        type: "pattern",
        severity,
        messageTemplate: template,
        count,
        currentRate: rate5min,
        detectedAt: now,
        sampleData,
      });
    }
  }
}

async function processExceptionPatterns(
  connectionId: number,
  environment: string,
  buckets: ElasticBucket[]
): Promise<void> {
  const now = Date.now();

  for (const bucket of buckets) {
    const className = bucket.key;
    const count = bucket.doc_count;

    const existingInsight = db
      .select()
      .from(logInsights)
      .where(
        and(
          eq(logInsights.connectionId, connectionId),
          eq(logInsights.environment, environment),
          eq(logInsights.type, "exception"),
          eq(logInsights.exceptionClassName, className)
        )
      )
      .get();

    if (existingInsight) {
      db.update(logInsights)
        .set({ count, updatedAt: now })
        .where(eq(logInsights.id, existingInsight.id))
        .run();
    } else {
      db.insert(logInsights)
        .values({
          connectionId,
          environment,
          type: "exception",
          severity: "info",
          exceptionClassName: className,
          count,
          currentRate: count,
          status: "active",
          detectedAt: now,
          updatedAt: now,
        })
        .run();
    }
  }
}

function upsertInsight(
  connectionId: number,
  environment: string,
  data: {
    type: string;
    severity: string;
    messageTemplate: string;
    count: number;
    currentRate: number;
    detectedAt: number;
    sampleData?: string;
  }
): void {
  const existing = db
    .select()
    .from(logInsights)
    .where(
      and(
        eq(logInsights.connectionId, connectionId),
        eq(logInsights.environment, environment),
        eq(logInsights.messageTemplate, data.messageTemplate)
      )
    )
    .get();

  if (existing) {
    // Don't overwrite muted/accepted status
    const updates: Record<string, unknown> = {
      count: data.count,
      currentRate: data.currentRate,
      severity: data.severity,
      updatedAt: data.detectedAt,
      ...(data.sampleData ? { sampleData: data.sampleData } : {}),
    };
    if (data.type === "new_error" && existing.type !== "pattern") {
      updates.type = data.type;
    }

    db.update(logInsights)
      .set(updates)
      .where(eq(logInsights.id, existing.id))
      .run();
  } else {
    db.insert(logInsights)
      .values({
        connectionId,
        environment,
        type: data.type,
        severity: data.severity,
        messageTemplate: data.messageTemplate,
        count: data.count,
        currentRate: data.currentRate,
        sampleData: data.sampleData ?? null,
        status: "active",
        detectedAt: data.detectedAt,
        updatedAt: data.detectedAt,
      })
      .run();
  }
}

async function storeHistogramData(
  connectionId: number,
  environment: string,
  buckets: ElasticBucket[]
): Promise<void> {
  const histogramJson = JSON.stringify(
    buckets.map((b) => ({ key: b.key, count: b.doc_count }))
  );

  // Store on all active insights for this connection+env
  const insights = db
    .select()
    .from(logInsights)
    .where(
      and(
        eq(logInsights.connectionId, connectionId),
        eq(logInsights.environment, environment)
      )
    )
    .all();

  for (const insight of insights) {
    db.update(logInsights)
      .set({ histogramData: histogramJson })
      .where(eq(logInsights.id, insight.id))
      .run();
  }
}
