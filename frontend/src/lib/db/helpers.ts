// Helpers for retrieving stored credentials and constructing API clients.

import { db } from "./index";
import { workspace, pats } from "./schema";
import { eq } from "drizzle-orm";
import { decryptPat } from "@/lib/crypto";
import { AzureDevOpsClient } from "@/lib/azure-devops/client";

/** Returns the current workspace row or null if not configured. */
export async function getWorkspace() {
  const [ws] = await db.select().from(workspace).limit(1);
  return ws ?? null;
}

/** Returns an authenticated AzureDevOpsClient using the stored PAT. Throws if not configured. */
export async function getAzureClient(): Promise<AzureDevOpsClient> {
  const ws = await getWorkspace();
  if (!ws) throw new Error("Workspace not configured");

  const [pat] = await db
    .select()
    .from(pats)
    .where(eq(pats.workspaceId, ws.id))
    .limit(1);

  if (!pat) throw new Error("Azure DevOps PAT not found");

  const plainPat = decryptPat(pat.encryptedPat, pat.iv);
  return new AzureDevOpsClient(ws.azureOrgUrl, plainPat);
}
