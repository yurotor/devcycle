import { db } from "@/lib/db";
import { workspace, pats, repos } from "@/lib/db/schema";
import { encryptPat } from "@/lib/crypto";
import { eq } from "drizzle-orm";

// ─── GET /api/workspace ───────────────────────────────────────────
// Returns all workspaces with their repos, or 404 if none configured.
// If ?id=N is provided, returns just that workspace.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("id");

  const allWorkspaces = await db.select().from(workspace);

  if (idParam) {
    const wsId = parseInt(idParam, 10);
    const ws = allWorkspaces.find((w) => w.id === wsId);
    if (!ws) return Response.json({ error: "Workspace not found" }, { status: 404 });

    const wsRepos = await db.select().from(repos).where(eq(repos.workspaceId, ws.id));
    return Response.json({
      ...formatWorkspace(ws, wsRepos),
      workspaces: allWorkspaces.map((w) => ({
        id: w.id,
        name: w.name,
        jiraProjectKey: w.jiraProjectKey ?? null,
      })),
    });
  }

  if (allWorkspaces.length === 0) {
    return Response.json({ error: "No workspace configured" }, { status: 404 });
  }

  // Return first workspace in the legacy shape for backward compat,
  // plus a `workspaces` array for the switcher.
  const firstWs = allWorkspaces[0];
  const firstRepos = await db.select().from(repos).where(eq(repos.workspaceId, firstWs.id));

  return Response.json({
    ...formatWorkspace(firstWs, firstRepos),
    workspaces: allWorkspaces.map((ws) => ({
      id: ws.id,
      name: ws.name,
      jiraProjectKey: ws.jiraProjectKey ?? null,
    })),
  });
}

function formatWorkspace(
  ws: typeof workspace.$inferSelect,
  wsRepos: (typeof repos.$inferSelect)[],
) {
  return {
    id: ws.id,
    name: ws.name,
    azureOrgUrl: ws.azureOrgUrl,
    jiraUrl: ws.jiraUrl ?? null,
    jiraProjectKey: ws.jiraProjectKey ?? null,
    repos: wsRepos.map((r) => ({
      id: r.id,
      adoId: r.adoId,
      name: r.name,
      project: r.project,
      defaultBranch: r.branchOverride ?? r.defaultBranch,
      selected: r.selected === 1,
    })),
  };
}

// ─── POST /api/workspace ──────────────────────────────────────────
// Creates a new workspace.
// If PATs don't exist yet (first-time setup), also stores encrypted PAT.
//
// Body: {
//   name: string
//   azureOrgUrl: string
//   pat?: string           — only needed on first-time setup
//   repos: Array<{ adoId?, name, project, defaultBranch }>
// }

export async function POST(request: Request) {
  const body = await request.json() as {
    name: string;
    azureOrgUrl?: string;
    pat?: string;
    repos: Array<{
      adoId?: string;
      name: string;
      project: string;
      defaultBranch: string;
    }>;
  };

  const { name, pat, repos: selectedRepos } = body;
  let { azureOrgUrl } = body;

  if (!name?.trim()) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  // If azureOrgUrl not provided, inherit from existing workspace
  if (!azureOrgUrl?.trim()) {
    const [existing] = await db.select({ azureOrgUrl: workspace.azureOrgUrl }).from(workspace).limit(1);
    if (existing) {
      azureOrgUrl = existing.azureOrgUrl;
    } else {
      return Response.json({ error: "azureOrgUrl is required for first workspace" }, { status: 400 });
    }
  }

  // Check if PATs exist — first-time setup requires a PAT
  const existingPats = await db.select().from(pats).limit(1);
  if (existingPats.length === 0 && !pat?.trim()) {
    return Response.json(
      { error: "pat is required for first-time setup" },
      { status: 400 }
    );
  }

  const now = Date.now();

  // Create workspace
  const [ws] = await db
    .insert(workspace)
    .values({ name: name.trim(), azureOrgUrl: azureOrgUrl.trim(), createdAt: now })
    .returning();

  // Store encrypted PAT only if provided (first-time setup)
  if (pat?.trim()) {
    // Replace existing Azure PAT
    await db.delete(pats).where(eq(pats.service, "azure"));
    const { encryptedPat, iv } = encryptPat(pat.trim());
    await db.insert(pats).values({
      service: "azure",
      encryptedPat,
      iv,
      createdAt: now,
    });
  }

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
