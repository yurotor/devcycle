// POST /api/azure/connect
//
// Called during setup (before workspace is saved to DB).
// Validates the PAT by listing repos, then returns all repos.
// Does NOT write to the database.

import { AzureDevOpsClient, AzureDevOpsError } from "@/lib/azure-devops/client";

export async function POST(request: Request) {
  const body = await request.json() as { orgUrl: string; pat: string };
  const { orgUrl, pat } = body;

  if (!orgUrl?.trim() || !pat?.trim()) {
    return Response.json(
      { error: "orgUrl and pat are required" },
      { status: 400 }
    );
  }

  const client = new AzureDevOpsClient(orgUrl.trim(), pat.trim());

  try {
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
    // Always log the raw error so it's visible in the Next.js dev console
    console.error("[azure/connect]", err);

    if (err instanceof AzureDevOpsError) {
      // Include the raw ADO message so the user can diagnose scope issues
      const detail = err.message;

      if (err.status === 401) {
        return Response.json(
          {
            error: "Authentication failed — check your PAT is valid and not expired",
            detail,
          },
          { status: 401 }
        );
      }
      if (err.status === 403) {
        return Response.json(
          {
            error:
              "Permission denied — your PAT needs Code: Read and optionally Project and Team: Read",
            detail,
          },
          { status: 403 }
        );
      }
      if (err.status === 404) {
        return Response.json(
          {
            error: "Organization not found — verify your org URL (e.g. https://dev.azure.com/your-org)",
            detail,
          },
          { status: 404 }
        );
      }
      return Response.json({ error: err.message, detail }, { status: err.status });
    }

    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "Failed to connect to Azure DevOps", detail: message },
      { status: 502 }
    );
  }
}
