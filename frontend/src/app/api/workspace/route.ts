import { db } from "@/lib/db";
import { workspace, pats, repos } from "@/lib/db/schema";
import { encryptPat } from "@/lib/crypto";
import { eq } from "drizzle-orm";

// ─── GET /api/workspace ───────────────────────────────────────────
// Returns the current workspace config or 404 if not set up yet.

export async function GET() {
  const [ws] = await db.select().from(workspace).limit(1);
  if (!ws) {
    return Response.json({ error: "No workspace configured" }, { status: 404 });
  }

  const selectedRepos = await db
    .select()
    .from(repos)
    .where(eq(repos.workspaceId, ws.id));

  return Response.json({
    id: ws.id,
    name: ws.name,
    azureOrgUrl: ws.azureOrgUrl,
    jiraUrl: ws.jiraUrl ?? null,
    repos: selectedRepos.map((r) => ({
      id: r.id,
      adoId: r.adoId,
      name: r.name,
      project: r.project,
      defaultBranch: r.branchOverride ?? r.defaultBranch,
      selected: r.selected === 1,
    })),
  });
}

// ─── POST /api/workspace ──────────────────────────────────────────
// Creates the workspace on first setup. Idempotent: wipes and recreates if called again.
//
// Body: {
//   name: string          — workspace / team name
//   azureOrgUrl: string   — https://dev.azure.com/your-org
//   pat: string           — Azure DevOps PAT (stored encrypted)
//   repos: Array<{        — selected repos (may be fake in slice 1)
//     adoId?: string
//     name: string
//     project: string
//     defaultBranch: string
//   }>
// }

export async function POST(request: Request) {
  const body = await request.json() as {
    name: string;
    azureOrgUrl: string;
    pat: string;
    repos: Array<{
      adoId?: string;
      name: string;
      project: string;
      defaultBranch: string;
    }>;
  };

  const { name, azureOrgUrl, pat, repos: selectedRepos } = body;

  if (!name?.trim() || !azureOrgUrl?.trim() || !pat?.trim()) {
    return Response.json(
      { error: "name, azureOrgUrl, and pat are required" },
      { status: 400 }
    );
  }

  const now = Date.now();

  // Wipe existing data (single-workspace prototype)
  await db.delete(repos);
  await db.delete(pats);
  await db.delete(workspace);

  // Create workspace
  const [ws] = await db
    .insert(workspace)
    .values({ name: name.trim(), azureOrgUrl: azureOrgUrl.trim(), createdAt: now })
    .returning();

  // Store encrypted PAT
  const { encryptedPat, iv } = encryptPat(pat);
  await db.insert(pats).values({
    workspaceId: ws.id,
    service: "azure",
    encryptedPat,
    iv,
    createdAt: now,
  });

  // Store selected repos
  if (selectedRepos?.length) {
    await db.insert(repos).values(
      selectedRepos.map((r) => ({
        workspaceId: ws.id,
        adoId: r.adoId ?? null,
        name: r.name,
        project: r.project,
        defaultBranch: r.defaultBranch,
        selected: 1,
        createdAt: now,
      }))
    );
  }

  return Response.json({ id: ws.id, name: ws.name }, { status: 201 });
}
