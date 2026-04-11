// POST /api/jira/sync
// Re-fetches all Jira tickets using stored credentials.

import { db } from "@/lib/db";
import { workspace, pats, tickets } from "@/lib/db/schema";
import { decryptPat } from "@/lib/crypto";
import { JiraClient } from "@/lib/jira/client";
import { and, eq } from "drizzle-orm";

export async function POST() {
  const [ws] = await db.select().from(workspace).limit(1);
  if (!ws?.jiraUrl) {
    return Response.json({ error: "Jira not configured" }, { status: 404 });
  }

  const [pat] = await db
    .select()
    .from(pats)
    .where(and(eq(pats.workspaceId, ws.id), eq(pats.service, "jira")));

  if (!pat) {
    return Response.json({ error: "Jira credentials not found" }, { status: 404 });
  }

  const token = decryptPat(pat.encryptedPat, pat.iv);
  const client = new JiraClient(ws.jiraUrl, token, pat.username ?? undefined);
  const doneStatuses: string[] = ws.jiraDoneStatuses
    ? JSON.parse(ws.jiraDoneStatuses)
    : ["Done", "Won't Do"];
  const projectKey = ws.jiraProjectKey ?? undefined;

  let jiraIssues;
  try {
    jiraIssues = await client.getAllAccessibleIssues(doneStatuses, projectKey);
    console.log(`[jira/sync] loaded ${jiraIssues.length} issues`);
  } catch (err) {
    console.error("[jira/sync] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Failed to load issues", detail: msg }, { status: 502 });
  }

  const now = Date.now();
  const existing = await db
    .select({ jiraKey: tickets.jiraKey, phase: tickets.phase })
    .from(tickets)
    .where(eq(tickets.workspaceId, ws.id));

  const phaseByKey = new Map(existing.map((t) => [t.jiraKey, t.phase]));
  const existingKeys = new Set(existing.map((t) => t.jiraKey));

  for (const issue of jiraIssues) {
    if (existingKeys.has(issue.key)) {
      await db.update(tickets)
        .set({ title: issue.summary, type: issue.issueType, priority: issue.priority, assignee: issue.assignee, description: issue.description, updatedAt: now })
        .where(and(eq(tickets.workspaceId, ws.id), eq(tickets.jiraKey, issue.key)));
    } else {
      await db.insert(tickets).values({
        workspaceId: ws.id, jiraKey: issue.key, jiraId: issue.id,
        title: issue.summary, type: issue.issueType,
        phase: phaseByKey.get(issue.key) ?? "analyze",
        priority: issue.priority, assignee: issue.assignee,
        description: issue.description, createdAt: now, updatedAt: now,
      });
    }
  }

  return Response.json({ count: jiraIssues.length });
}
