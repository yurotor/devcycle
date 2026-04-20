import { db } from "../db";
import { logInsights, elasticConnections, tickets, tasks, waves, workspace, pats } from "../db/schema";
import { eq } from "drizzle-orm";
import { JiraClient } from "../jira/client";
import { decryptPat } from "../crypto";
import fs from "fs";
import path from "path";

export async function acceptFix(insightId: number): Promise<{
  ticketId: number;
  jiraKey: string;
}> {
  const insight = db
    .select()
    .from(logInsights)
    .where(eq(logInsights.id, insightId))
    .get();

  if (!insight) throw new Error("Insight not found");
  if (!insight.fixSuggestion) throw new Error("No fix suggestion available");

  const conn = db
    .select()
    .from(elasticConnections)
    .where(eq(elasticConnections.id, insight.connectionId))
    .get();

  if (!conn) throw new Error("Connection not found");

  const ws = db
    .select()
    .from(workspace)
    .where(eq(workspace.id, conn.workspaceId))
    .get();

  if (!ws) throw new Error("Workspace not found");

  const pattern = insight.messageTemplate ?? insight.exceptionClassName ?? "Unknown error";
  const summary = `Fix: ${pattern.slice(0, 80)}`;

  // Create Jira ticket if Jira is configured
  let jiraKey = `LOG-${insightId}`;
  let jiraId: string | undefined;

  if (ws.jiraUrl && ws.jiraProjectKey) {
    const jiraPat = db.select().from(pats).where(eq(pats.service, "jira")).get();
    if (jiraPat) {
      try {
        const token = decryptPat(jiraPat.encryptedPat, jiraPat.iv);
        const jiraClient = new JiraClient(ws.jiraUrl, token, jiraPat.username ?? undefined);

        const issue = await jiraClient.createIssue(ws.jiraProjectKey, {
          summary,
          description: `## Auto-detected error pattern\n\n**Pattern:** ${pattern}\n**Count:** ${insight.count} in last 5 min\n**Severity:** ${insight.severity}\n\n### Diagnosis\n${insight.diagnosis ?? "N/A"}\n\n### Suggested Fix\n${insight.fixSuggestion}`,
        });

        jiraKey = issue.key;
        jiraId = issue.id;
      } catch (err) {
        console.error("[ticket-bridge] Jira creation failed:", (err as Error).message);
      }
    }
  }

  // Write PRD markdown
  const prdContent = insight.fixPrd ?? `# Fix: ${pattern}\n\n${insight.fixSuggestion}`;
  const kbRoot = path.join(process.cwd(), "..", "kb", "workspaces", String(conn.workspaceId));
  const prdDir = path.join(kbRoot, "wiki", "fixes");
  fs.mkdirSync(prdDir, { recursive: true });
  const prdPath = path.join("wiki", "fixes", `${jiraKey.replace(/[^a-zA-Z0-9-]/g, "-")}.md`);
  fs.writeFileSync(path.join(kbRoot, prdPath), prdContent);

  // Create ticket in DB
  const now = Date.now();
  const [ticket] = await db
    .insert(tickets)
    .values({
      workspaceId: conn.workspaceId,
      jiraKey,
      jiraId: jiraId ?? null,
      title: summary,
      type: "bug",
      phase: "execute",
      priority: insight.severity === "critical" ? "High" : "Medium",
      description: insight.fixSuggestion,
      prdPath,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Create wave + task
  const [wave] = await db
    .insert(waves)
    .values({
      ticketId: ticket.id,
      name: "Fix",
      orderIndex: 0,
      createdAt: now,
    })
    .returning();

  await db.insert(tasks).values({
    ticketId: ticket.id,
    repoId: conn.repoId,
    title: `Fix ${pattern.slice(0, 60)}`,
    description: insight.fixSuggestion,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });

  // Update insight status
  db.update(logInsights)
    .set({
      status: "accepted",
      jiraTicketId: ticket.id,
      updatedAt: now,
    })
    .where(eq(logInsights.id, insightId))
    .run();

  return { ticketId: ticket.id, jiraKey };
}
