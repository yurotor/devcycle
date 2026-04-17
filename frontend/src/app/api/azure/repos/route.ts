// GET /api/azure/repos
//
// Lists all Azure DevOps repos using the stored PAT.
// Used by the adaptive setup flow when creds already exist.

import { getAzureClient } from "@/lib/db/helpers";

export async function GET() {
  try {
    const client = await getAzureClient();
    const repos = await client.listAllRepositories();

    return Response.json({
      repos: repos.map((r) => ({
        adoId: r.id,
        name: r.name,
        project: r.project.name,
        defaultBranch: r.defaultBranch,
      })),
    });
  } catch (err) {
    console.error("[azure/repos]", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
