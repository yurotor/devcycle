import { db } from "@/lib/db";
import { nrConnections } from "@/lib/db/schema";
import { encryptPat, decryptPat } from "@/lib/crypto";
import { eq, and } from "drizzle-orm";
import { getWorkspace, getWsIdFromRequest } from "@/lib/db/helpers";
import { NewRelicClient } from "@/lib/newrelic/client";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name: string;
    accountId: string;
    apiKey: string;
    appNames: string[];
  };

  const { name, accountId, apiKey, appNames } = body;

  if (!accountId?.trim() || !apiKey?.trim()) {
    return Response.json(
      { error: "accountId and apiKey are required" },
      { status: 400 }
    );
  }

  const ws = await getWorkspace(getWsIdFromRequest(request));
  if (!ws) {
    return Response.json({ error: "Workspace not configured" }, { status: 404 });
  }

  // Test connection
  try {
    const client = new NewRelicClient(accountId.trim(), apiKey.trim());
    await client.testConnection();
  } catch (err) {
    return Response.json(
      { error: "Connection test failed", detail: (err as Error).message },
      { status: 400 }
    );
  }

  const { encryptedPat, iv } = encryptPat(apiKey.trim());
  const now = Date.now();

  const [conn] = await db
    .insert(nrConnections)
    .values({
      workspaceId: ws.id,
      name: name?.trim() || "Default",
      accountId: accountId.trim(),
      apiKeyEncrypted: encryptedPat,
      apiKeyIv: iv,
      appNames: JSON.stringify(appNames ?? []),
      pollingEnabled: 1,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return Response.json({
    id: conn.id,
    name: conn.name,
    accountId: conn.accountId,
    appNames: JSON.parse(conn.appNames),
    pollingEnabled: true,
  });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    id: number;
    accountId?: string;
    apiKey?: string;
    appNames?: string[];
  };

  const { id, accountId, apiKey, appNames } = body;
  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const ws = await getWorkspace(getWsIdFromRequest(request));
  if (!ws) {
    return Response.json({ error: "Workspace not configured" }, { status: 404 });
  }

  const [existing] = await db
    .select()
    .from(nrConnections)
    .where(and(eq(nrConnections.id, id), eq(nrConnections.workspaceId, ws.id)));

  if (!existing) {
    return Response.json({ error: "Connection not found" }, { status: 404 });
  }

  const effectiveAccountId = accountId?.trim() || existing.accountId;
  const effectiveApiKey = apiKey?.trim() || decryptPat(existing.apiKeyEncrypted, existing.apiKeyIv);

  try {
    const client = new NewRelicClient(effectiveAccountId, effectiveApiKey);
    await client.testConnection();
  } catch (err) {
    return Response.json(
      { error: "Connection test failed", detail: (err as Error).message },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = { updatedAt: Date.now() };

  if (accountId?.trim()) updates.accountId = accountId.trim();
  if (appNames) updates.appNames = JSON.stringify(appNames);
  if (apiKey?.trim()) {
    const { encryptedPat, iv } = encryptPat(apiKey.trim());
    updates.apiKeyEncrypted = encryptedPat;
    updates.apiKeyIv = iv;
  }

  await db.update(nrConnections).set(updates).where(eq(nrConnections.id, id));

  return Response.json({
    id,
    accountId: effectiveAccountId,
    appNames: appNames ?? JSON.parse(existing.appNames),
  });
}

export async function GET(request: Request) {
  const ws = await getWorkspace(getWsIdFromRequest(request));
  if (!ws) {
    return Response.json({ error: "Workspace not configured" }, { status: 404 });
  }

  const connections = await db
    .select({
      id: nrConnections.id,
      name: nrConnections.name,
      accountId: nrConnections.accountId,
      appNames: nrConnections.appNames,
      pollingEnabled: nrConnections.pollingEnabled,
      createdAt: nrConnections.createdAt,
    })
    .from(nrConnections)
    .where(eq(nrConnections.workspaceId, ws.id));

  return Response.json({
    connections: connections.map((c) => ({
      ...c,
      appNames: JSON.parse(c.appNames),
    })),
  });
}
