// POST /api/jira/connect
//
// Validates Jira credentials, saves them encrypted, loads all accessible
// tickets into the tickets table, and returns the count of loaded tickets.
//
// Body: { jiraUrl, email, token, doneStatuses? }

import { db } from "@/lib/db";
import { workspace, pats, tickets } from "@/lib/db/schema";
import { encryptPat } from "@/lib/crypto";
import { JiraClient, JiraError } from "@/lib/jira/client";
import { and, eq } from "drizzle-orm";
import { getWorkspace, getWsIdFromRequest } from "@/lib/db/helpers";

export async function POST(request: Request) {
  const body = await request.json() as {
    jiraUrl: string;
    email: string;
    token: string;
    projectKey?: string;
    doneStatuses?: string[];
  };

  const { jiraUrl, email, token, projectKey, doneStatuses } = body;

  if (!jiraUrl?.trim() || !token?.trim()) {
    return Response.json(
      { error: "jiraUrl and token are required" },
      { status: 400 }
    );
  }

  const isCloud = jiraUrl.includes(".atlassian.net");
  if (isCloud && !email?.trim()) {
    return Response.json(
      { error: "email is required for Jira Cloud" },
      { status: 400 }
    );
  }

  // Normalise to origin only — users often paste full board/project URLs
  let normalisedJiraUrl: string;
  try {
    normalisedJiraUrl = new URL(jiraUrl.trim()).origin;
  } catch {
    return Response.json({ error: "Invalid Jira URL" }, { status: 400 });
  }

  const client = new JiraClient(
    normalisedJiraUrl,
    token.trim(),
    email?.trim() || undefined
  );

  const resolvedDoneStatuses = doneStatuses?.length
    ? doneStatuses
    : ["Done", "Won't Do"];

  // Validate credentials via /myself — this is the only endpoint that reliably returns 401
  try {
    await client.validateCredentials();
  } catch (err) {
    console.error("[jira/connect] validation:", err);
    if (err instanceof JiraError) {
      if (err.status === 401) {
        return Response.json(
          { error: "Invalid credentials — check your email and API token", detail: err.message },
          { status: 401 }
        );
      }
      if (err.status === 403) {
        return Response.json(
          { error: "Permission denied — token needs Browse Projects access", detail: err.message },
          { status: 403 }
        );
      }
      return Response.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Failed to connect to Jira", detail: message }, { status: 502 });
  }

  const ws = await getWorkspace(getWsIdFromRequest(request));
  if (!ws) {
    return Response.json({ error: "Workspace not configured" }, { status: 404 });
  }

  const now = Date.now();

  // Persist Jira URL + project key + done statuses on the workspace row
  await db.update(workspace)
    .set({
      jiraUrl: normalisedJiraUrl,
      jiraProjectKey: projectKey?.trim().toUpperCase() || null,
      jiraDoneStatuses: JSON.stringify(resolvedDoneStatuses),
    })
    .where(eq(workspace.id, ws.id));

  // Replace only the Jira PAT (leave Azure PAT untouched)
  await db.delete(pats).where(eq(pats.service, "jira"));

  const { encryptedPat, iv } = encryptPat(token.trim());
  await db.insert(pats).values({
    service: "jira",
    username: email?.trim() || null,
    encryptedPat,
    iv,
    createdAt: now,
  });

  // Load all accessible issues
  let jiraIssues;
  try {
    jiraIssues = await client.getAllAccessibleIssues(resolvedDoneStatuses, projectKey?.trim().toUpperCase() || undefined);
    console.log(`[jira/connect] loaded ${jiraIssues.length} issues`);
  } catch (err) {
    console.error("[jira/connect] issue load:", err);
    return Response.json({
      connected: true,
      count: 0,
      warning: "Connected but failed to load issues",
    });
  }

  // Upsert tickets — preserve DevCycle phase for tickets that already exist
  const existingTickets = await db
    .select({ jiraKey: tickets.jiraKey, phase: tickets.phase })
    .from(tickets)
    .where(eq(tickets.workspaceId, ws.id));

  const phaseByKey = new Map(existingTickets.map((t) => [t.jiraKey, t.phase]));
  const existingKeys = new Set(existingTickets.map((t) => t.jiraKey));

  for (const issue of jiraIssues) {
    if (existingKeys.has(issue.key)) {
      await db.update(tickets)
        .set({
          title: issue.summary,
          type: issue.issueType,
          priority: issue.priority,
          assignee: issue.assignee,
          description: issue.description,
          updatedAt: now,
        })
        .where(and(eq(tickets.workspaceId, ws.id), eq(tickets.jiraKey, issue.key)));
    } else {
      await db.insert(tickets).values({
        workspaceId: ws.id,
        jiraKey: issue.key,
        jiraId: issue.id,
        title: issue.summary,
        type: issue.issueType,
        phase: phaseByKey.get(issue.key) ?? "analyze",
        priority: issue.priority,
        assignee: issue.assignee,
        description: issue.description,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return Response.json({ connected: true, count: jiraIssues.length });
}
