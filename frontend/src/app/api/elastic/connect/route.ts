import { db } from "@/lib/db";
import { elasticConnections } from "@/lib/db/schema";
import { encryptPat, decryptPat } from "@/lib/crypto";
import { eq, and } from "drizzle-orm";
import { getWorkspace, getWsIdFromRequest } from "@/lib/db/helpers";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name: string;
    url: string;
    apiKey: string;
    indexPattern: string;
    repoId?: number;
    environment?: string;
  };

  const { name, url, apiKey, indexPattern, repoId, environment } = body;

  if (!url?.trim() || !apiKey?.trim() || !indexPattern?.trim()) {
    return Response.json(
      { error: "url, apiKey, and indexPattern are required" },
      { status: 400 }
    );
  }

  const ws = await getWorkspace(getWsIdFromRequest(request));
  if (!ws) {
    return Response.json({ error: "Workspace not configured" }, { status: 404 });
  }

  // Strip Kibana paths, hashes, query strings — keep just origin (scheme + host + port)
  let normalizedUrl: string;
  try {
    const parsed = new URL(url.trim());
    normalizedUrl = parsed.origin; // e.g. https://host:9243
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }
  // Test connection — route through Kibana proxy if port 9243, otherwise direct
  try {
    const isKibana = normalizedUrl.includes(":9243");
    let testUrl: string;
    const testHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `ApiKey ${apiKey.trim()}`,
    };

    if (isKibana) {
      const esPath = encodeURIComponent(`/${indexPattern.trim()}/_search?size=0`);
      testUrl = `${normalizedUrl}/api/console/proxy?path=${esPath}&method=POST`;
      testHeaders["kbn-xsrf"] = "true";
    } else {
      testUrl = `${normalizedUrl}/${indexPattern.trim()}/_search?size=0`;
    }

    const testRes = await fetch(testUrl, {
      method: "POST",
      headers: testHeaders,
      body: JSON.stringify({ query: { match_all: {} } }),
      signal: AbortSignal.timeout(10_000),
    });
    const text = await testRes.text().catch(() => "");
    if (text.includes("<html") || text.includes("<!DOCTYPE")) {
      return Response.json(
        { error: "Authentication failed — check your API key" },
        { status: 401 }
      );
    }
    if (!testRes.ok) {
      return Response.json(
        { error: "Connection test failed", detail: `HTTP ${testRes.status}: ${text.slice(0, 200)}` },
        { status: 400 }
      );
    }
  } catch (err) {
    return Response.json(
      { error: "Connection test failed", detail: (err as Error).message },
      { status: 400 }
    );
  }

  const { encryptedPat, iv } = encryptPat(apiKey.trim());
  const now = Date.now();

  const [conn] = await db
    .insert(elasticConnections)
    .values({
      workspaceId: ws.id,
      repoId: repoId ?? null,
      name: name?.trim() || "Default",
      url: normalizedUrl,
      apiKeyEncrypted: encryptedPat,
      apiKeyIv: iv,
      indexPattern: indexPattern.trim(),
      environment: environment?.trim() || "dev",
      pollingEnabled: 1,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return Response.json({
    id: conn.id,
    name: conn.name,
    url: conn.url,
    indexPattern: conn.indexPattern,
    environment: conn.environment,
    pollingEnabled: true,
  });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    id: number;
    url: string;
    apiKey?: string;
    indexPattern: string;
    environment?: string;
  };

  const { id, url, apiKey, indexPattern, environment } = body;

  if (!id || !url?.trim() || !indexPattern?.trim()) {
    return Response.json(
      { error: "id, url, and indexPattern are required" },
      { status: 400 }
    );
  }

  const ws = await getWorkspace(getWsIdFromRequest(request));
  if (!ws) {
    return Response.json({ error: "Workspace not configured" }, { status: 404 });
  }

  const [existing] = await db
    .select()
    .from(elasticConnections)
    .where(and(eq(elasticConnections.id, id), eq(elasticConnections.workspaceId, ws.id)));

  if (!existing) {
    return Response.json({ error: "Connection not found" }, { status: 404 });
  }

  let normalizedUrl: string;
  try {
    const parsed = new URL(url.trim());
    normalizedUrl = parsed.origin;
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  const effectiveApiKey = apiKey?.trim() || decryptPat(existing.apiKeyEncrypted, existing.apiKeyIv);

  try {
    const isKibana = normalizedUrl.includes(":9243");
    let testUrl: string;
    const testHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `ApiKey ${effectiveApiKey}`,
    };

    if (isKibana) {
      const esPath = encodeURIComponent(`/${indexPattern.trim()}/_search?size=0`);
      testUrl = `${normalizedUrl}/api/console/proxy?path=${esPath}&method=POST`;
      testHeaders["kbn-xsrf"] = "true";
    } else {
      testUrl = `${normalizedUrl}/${indexPattern.trim()}/_search?size=0`;
    }

    const testRes = await fetch(testUrl, {
      method: "POST",
      headers: testHeaders,
      body: JSON.stringify({ query: { match_all: {} } }),
      signal: AbortSignal.timeout(10_000),
    });
    const text = await testRes.text().catch(() => "");
    if (text.includes("<html") || text.includes("<!DOCTYPE")) {
      return Response.json(
        { error: "Authentication failed — check your API key" },
        { status: 401 }
      );
    }
    if (!testRes.ok) {
      return Response.json(
        { error: "Connection test failed", detail: `HTTP ${testRes.status}: ${text.slice(0, 200)}` },
        { status: 400 }
      );
    }
  } catch (err) {
    return Response.json(
      { error: "Connection test failed", detail: (err as Error).message },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    url: normalizedUrl,
    indexPattern: indexPattern.trim(),
    updatedAt: Date.now(),
  };

  if (environment?.trim()) {
    updates.environment = environment.trim();
  }

  if (apiKey?.trim()) {
    const { encryptedPat, iv } = encryptPat(apiKey.trim());
    updates.apiKeyEncrypted = encryptedPat;
    updates.apiKeyIv = iv;
  }

  await db
    .update(elasticConnections)
    .set(updates)
    .where(eq(elasticConnections.id, id));

  return Response.json({
    id,
    url: normalizedUrl,
    indexPattern: indexPattern.trim(),
    environment: environment?.trim() || existing.environment,
    pollingEnabled: existing.pollingEnabled,
  });
}

export async function GET(request: Request) {
  const ws = await getWorkspace(getWsIdFromRequest(request));
  if (!ws) {
    return Response.json({ error: "Workspace not configured" }, { status: 404 });
  }

  const connections = await db
    .select({
      id: elasticConnections.id,
      name: elasticConnections.name,
      url: elasticConnections.url,
      indexPattern: elasticConnections.indexPattern,
      environment: elasticConnections.environment,
      pollingEnabled: elasticConnections.pollingEnabled,
      repoId: elasticConnections.repoId,
      createdAt: elasticConnections.createdAt,
    })
    .from(elasticConnections)
    .where(eq(elasticConnections.workspaceId, ws.id));

  return Response.json({ connections });
}
