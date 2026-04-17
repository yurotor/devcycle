// Helpers for retrieving stored credentials and constructing API clients.

import { db } from "./index";
import { workspace, pats } from "./schema";
import { eq } from "drizzle-orm";
import { decryptPat } from "@/lib/crypto";
import { AzureDevOpsClient } from "@/lib/azure-devops/client";

/** Returns a workspace by ID, or the first workspace if no ID given. */
export async function getWorkspace(wsId?: number | null) {
  if (wsId) {
    const [ws] = await db.select().from(workspace).where(eq(workspace.id, wsId));
    return ws ?? null;
  }
  const [ws] = await db.select().from(workspace).limit(1);
  return ws ?? null;
}

/** Extract wsId from request query params. */
export function getWsIdFromRequest(request: Request): number | null {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("wsId");
  return id ? parseInt(id, 10) : null;
}

/** Returns an authenticated AzureDevOpsClient using the stored PAT. Throws if not configured. */
export async function getAzureClient(): Promise<AzureDevOpsClient> {
  const ws = await getWorkspace();
  if (!ws) throw new Error("Workspace not configured");

  const [pat] = await db
    .select()
    .from(pats)
    .where(eq(pats.service, "azure"))
    .limit(1);

  if (!pat) throw new Error("Azure DevOps PAT not found");

  const plainPat = decryptPat(pat.encryptedPat, pat.iv);
  return new AzureDevOpsClient(ws.azureOrgUrl, plainPat);
}
