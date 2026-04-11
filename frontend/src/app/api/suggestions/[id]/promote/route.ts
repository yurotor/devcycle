// POST /api/suggestions/:id/promote — create a Jira ticket from a suggestion

import { db } from "@/lib/db";
import { scanSuggestions, workspace, pats, repos, tickets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decryptPat } from "@/lib/crypto";
import { JiraClient } from "@/lib/jira/client";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  // Load suggestion
  const [suggestion] = await db
    .select()
    .from(scanSuggestions)
    .where(eq(scanSuggestions.id, numId));

  if (!suggestion) {
    return Response.json({ error: "Suggestion not found" }, { status: 404 });
  }

  // Load workspace + Jira credentials
  const [ws] = await db.select().from(workspace).limit(1);
  if (!ws?.jiraUrl || !ws.jiraProjectKey) {
    return Response.json({ error: "Jira not connected" }, { status: 400 });
  }

  const [pat] = await db
    .select()
    .from(pats)
    .where(eq(pats.service, "jira"))
    .limit(1);

  if (!pat) {
    return Response.json({ error: "Jira credentials not found" }, { status: 400 });
  }

  const plainPat = decryptPat(pat.encryptedPat, pat.iv);
  const jira = new JiraClient(ws.jiraUrl, plainPat, pat.username ?? undefined);

  // Get repo name for context
  let repoName = "unknown";
  if (suggestion.repoId) {
    const [repo] = await db
      .select({ name: repos.name })
      .from(repos)
      .where(eq(repos.id, suggestion.repoId));
    if (repo) repoName = repo.name;
  }

  // Create Jira ticket
  const files = suggestion.files ? JSON.parse(suggestion.files) as string[] : [];
  const description = [
    `[${suggestion.severity.toUpperCase()}] ${suggestion.category} finding from DevCycle scan`,
    "",
    suggestion.description,
    "",
    files.length > 0 ? `Affected files: ${files.join(", ")}` : "",
    "",
    `Repository: ${repoName}`,
  ].filter(Boolean).join("\n");

  try {
    const jiraIssue = await jira.createIssue(ws.jiraProjectKey, {
      summary: `[${suggestion.severity}] ${suggestion.title}`,
      description,
    });

    // Save as local ticket
    const now = Date.now();
    const [inserted] = await db.insert(tickets).values({
      workspaceId: ws.id,
      jiraKey: jiraIssue.key,
      jiraId: jiraIssue.id,
      title: jiraIssue.summary,
      type: "task",
      phase: "analyze",
      priority: suggestion.severity === "critical" ? "critical" : "high",
      description: suggestion.description,
      createdAt: now,
      updatedAt: now,
    }).returning({ id: tickets.id });

    // Mark suggestion as promoted
    await db
      .update(scanSuggestions)
      .set({ promotedToTicketId: inserted.id })
      .where(eq(scanSuggestions.id, numId));

    return Response.json({
      ok: true,
      ticket: { jiraKey: jiraIssue.key, id: inserted.id },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
