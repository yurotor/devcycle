import { db } from "@/lib/db";
import { elasticConnections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decryptPat } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  const conn = db.select().from(elasticConnections).where(eq(elasticConnections.id, 2)).get();
  if (!conn) return Response.json({ error: "No connection" });

  let apiKey: string;
  try {
    apiKey = decryptPat(conn.apiKeyEncrypted, conn.apiKeyIv);
  } catch (err) {
    return Response.json({ error: "Decrypt failed", detail: (err as Error).message });
  }

  const kibanaUrl = "https://813c22b06210401c9d42326cb748bfce.us-east-1.aws.found.io:9243";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `ApiKey ${apiKey}`,
    "kbn-xsrf": "true",
  };
  const results: Record<string, unknown> = {};

  // Show first/last 4 chars of decrypted key to verify which key is stored
  const keyPreview = apiKey.length > 8
    ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)} (len=${apiKey.length})`
    : `(len=${apiKey.length})`;
  results["stored_key_preview"] = keyPreview;
  results["curl_test"] = `curl -s -X POST '${kibanaUrl}/api/console/proxy?path=${encodeURIComponent("/logs-sellingwebapi*/_search?size=1")}&method=POST' -H 'Content-Type: application/json' -H 'Authorization: ApiKey ${apiKey}' -H 'kbn-xsrf: true' -d '{"size":1,"query":{"match_all":{}}}'`;

  // Test: Kibana console proxy with correct path encoding
  // The path param should NOT have leading slash encoded separately
  const paths = [
    `/${conn.indexPattern}/_search?size=1`,
    `/logs-sellingwebapi-dev*/_search?size=1`,
    `/logs-sellingwebapi*/_search?size=1`,
    `/.ds-logs-sellingwebapi-dev-*/_search?size=1`,
  ];

  for (const p of paths) {
    try {
      const url = `${kibanaUrl}/api/console/proxy?path=${encodeURIComponent(p)}&method=POST`;
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ size: 1, query: { match_all: {} } }),
        signal: AbortSignal.timeout(8_000),
      });
      const data = await res.json();
      results[p] = {
        status: res.status,
        total: data.hits?.total?.value ?? data.hits?.total ?? 0,
        firstHit: data.hits?.hits?.[0]?._index ?? null,
      };
    } catch (err) {
      results[p] = { error: (err as Error).message };
    }
  }

  // Try wildcard search across ALL indices the key can see
  const broadPatterns = ["*", "logs-*", ".ds-logs-*", "logs-selling*", ".ds-logs-selling*"];
  for (const pat of broadPatterns) {
    try {
      const url = `${kibanaUrl}/api/console/proxy?path=${encodeURIComponent(`/${pat}/_search?size=1`)}&method=POST`;
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ size: 1, query: { match_all: {} } }),
        signal: AbortSignal.timeout(8_000),
      });
      const data = await res.json();
      results[`broad:${pat}`] = {
        status: res.status,
        shards: data._shards?.total ?? 0,
        total: data.hits?.total?.value ?? 0,
        firstIndex: data.hits?.hits?.[0]?._index ?? null,
      };
    } catch (err) {
      results[`broad:${pat}`] = { error: (err as Error).message };
    }
  }

  // Try _resolve/index to see what indices exist for this key
  try {
    const url = `${kibanaUrl}/api/console/proxy?path=${encodeURIComponent("/_resolve/index/*")}&method=GET`;
    const res = await fetch(url, { method: "POST", headers, signal: AbortSignal.timeout(8_000) });
    const data = await res.json();
    results["resolve_index"] = {
      indices: (data.indices ?? []).slice(0, 20).map((i: { name: string }) => i.name),
      data_streams: (data.data_streams ?? []).slice(0, 20).map((d: { name: string }) => d.name),
    };
  } catch (err) {
    results["resolve_index"] = { error: (err as Error).message };
  }

  // Also: list what data streams exist
  try {
    const url = `${kibanaUrl}/api/console/proxy?path=${encodeURIComponent("/_cat/indices/logs-*?h=index,docs.count&s=index:desc&format=json")}&method=GET`;
    const res = await fetch(url, { method: "POST", headers, signal: AbortSignal.timeout(8_000) });
    const data = await res.json();
    results["cat_indices"] = Array.isArray(data) ? data.slice(0, 15) : data;
  } catch (err) {
    results["cat_indices"] = { error: (err as Error).message };
  }

  return Response.json(results);
}
