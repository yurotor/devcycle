import { db } from "@/lib/db";
import { elasticConnections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getWorkspace, getWsIdFromRequest } from "@/lib/db/helpers";
import { ElasticClient } from "@/lib/elastic/client";
import { decryptPat } from "@/lib/crypto";

export const dynamic = "force-dynamic";

const BUSINESS_EVENTS = [
  { key: "transfers", label: "Transfers", template: "Processing transfer" },
  { key: "autoPurchase", label: "Auto-purchase", template: "Processing auto-purchase for mpl: {mplId}, issuingBank: {issuingBankId}, loanType: {loanType}" },
  { key: "batches", label: "Batches", template: "Batch {BatchId} is triggered for {Count} of loans." },
  { key: "purchases", label: "Purchases", template: "Purchase request for mpl: {mplId}, investor: {investor}, loanType: {loanType}" },
  { key: "sqs", label: "SQS received", template: "Received {MessageCount} messages from SQS, elapsed={ElapsedUs}us" },
  { key: "outbox", label: "Outbox fetched", template: "Fetched {Count} outbox items for shoveling, elapsed={ElapsedUs}us" },
];

export async function GET(request: Request) {
  const ws = await getWorkspace(getWsIdFromRequest(request));
  if (!ws) {
    return Response.json({ error: "Workspace not configured" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const environment = searchParams.get("environment") ?? "dev";
  const window = searchParams.get("window") ?? "1h";

  const connections = db
    .select()
    .from(elasticConnections)
    .where(eq(elasticConnections.workspaceId, ws.id))
    .all();

  if (connections.length === 0) {
    return Response.json({ counters: [] });
  }

  const conn = connections.find((c) => c.environment === environment) ?? connections[0];
  let apiKey: string;
  try {
    apiKey = decryptPat(conn.apiKeyEncrypted, conn.apiKeyIv);
  } catch {
    return Response.json({ error: "Cannot decrypt credentials" }, { status: 500 });
  }

  const client = new ElasticClient(conn.url, apiKey);

  const filters = BUSINESS_EVENTS.map((evt) => ({
    key: evt.key,
    label: evt.label,
    filter: { match_phrase: { messageTemplate: evt.template } },
  }));

  const aggs: Record<string, unknown> = {};
  for (const f of filters) {
    aggs[f.key] = { filter: f.filter };
  }
  aggs["errors"] = { filter: { term: { logLevel: "Error" } } };

  try {
    const result = await client.aggregate(
      conn.indexPattern,
      aggs,
      {
        bool: {
          filter: [
            { term: { "data_stream.namespace": environment } },
            { range: { "@timestamp": { gte: `now-${window}` } } },
          ],
        },
      }
    );

    const counters = [
      ...filters.map((f) => ({
        key: f.key,
        label: f.label,
        count: (result as Record<string, { doc_count?: number }>)[f.key]?.doc_count ?? 0,
      })),
      {
        key: "errors",
        label: "Errors",
        count: (result as Record<string, { doc_count?: number }>)["errors"]?.doc_count ?? 0,
      },
    ];

    return Response.json({ counters, window });
  } catch (err) {
    return Response.json(
      { error: "Activity query failed", detail: (err as Error).message },
      { status: 500 }
    );
  }
}
