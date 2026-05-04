import { db } from "../db";
import { nrInsights, nrConnections, tickets, tasks, waves, workspace, pats } from "../db/schema";
import { eq } from "drizzle-orm";
import { JiraClient } from "../jira/client";
import { decryptPat } from "../crypto";
import fs from "fs";
import path from "path";

export async function acceptNrFix(insightId: number): Promise<{
  ticketId: number;
  jiraKey: string;
}> {
  const insight = db.select().from(nrInsights).where(eq(nrInsights.id, insightId)).get();
  if (!insight) throw new Error("Insight not found");
  if (!insight.fixSuggestion) throw new Error("No fix suggestion available");

  const conn = db.select().from(nrConnections).where(eq(nrConnections.id, insight.connectionId)).get();
  if (!conn) throw new Error("Connection not found");

  const ws = db.select().from(workspace).where(eq(workspace.id, conn.workspaceId)).get();
  if (!ws) throw new Error("Workspace not found");

  const metricLabels: Record<string, string> = {
    error_rate: "Error spike",
    latency_p95: "Latency degradation",
    slow_db: "Slow DB",
  };
  const prefix = metricLabels[insight.metricType] ?? "APM anomaly";
  const summary = `Fix: ${prefix} in ${insight.appName}${insight.metricLabel ? ` (${insight.metricLabel.slice(0, 40)})` : ""}`;

  let jiraKey = `NR-${insightId}`;
  let jiraId: string | undefined;

  if (ws.jiraUrl && ws.jiraProjectKey) {
    const jiraPat = db.select().from(pats).where(eq(pats.service, "jira")).get();
    if (jiraPat) {
      try {
        const token = decryptPat(jiraPat.encryptedPat, jiraPat.iv);
        const jiraClient = new JiraClient(ws.jiraUrl, token, jiraPat.username ?? undefined);

        const description = [
          `## APM Anomaly Detected`,
          ``,
          `**Service:** ${insight.appName}`,
          `**Metric:** ${insight.metricType}`,
          insight.metricLabel ? `**Endpoint:** ${insight.metricLabel}` : "",
          `**Current Value:** ${insight.currentValue}`,
          `**Baseline:** ${insight.baselineValue}`,
          `**Severity:** ${insight.severity}`,
          ``,
          `### Diagnosis`,
          insight.diagnosis ?? "N/A",
          ``,
          `### Suggested Fix`,
          insight.fixSuggestion,
        ].filter(Boolean).join("\n");

        const issue = await jiraClient.createIssue(ws.jiraProjectKey, {
          summary,
          description,
        });

        jiraKey = issue.key;
        jiraId = issue.id;
      } catch (err) {
        console.error("[nr-ticket-bridge] Jira creation failed:", (err as Error).message);
      }
    }
  }

  const prdContent = insight.fixPrd ?? `# ${summary}\n\n${insight.fixSuggestion}`;
  const kbRoot = path.join(process.cwd(), "..", "kb", "workspaces", String(conn.workspaceId));
  const prdDir = path.join(kbRoot, "wiki", "fixes");
  fs.mkdirSync(prdDir, { recursive: true });
  const prdPath = path.join("wiki", "fixes", `${jiraKey.replace(/[^a-zA-Z0-9-]/g, "-")}.md`);
  fs.writeFileSync(path.join(kbRoot, prdPath), prdContent);

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
    title: `Fix ${prefix.toLowerCase()} in ${insight.appName}`,
    description: insight.fixSuggestion,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });

  db.update(nrInsights)
    .set({ status: "accepted", jiraTicketId: ticket.id, updatedAt: now })
    .where(eq(nrInsights.id, insightId))
    .run();

  return { ticketId: ticket.id, jiraKey };
}
