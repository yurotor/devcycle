// PATCH /api/tickets/[id]
// Updates mutable fields on a ticket (currently: phase).
// On analyze → plan transition, persists conversation to KB.

import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { tickets, chatMessages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const KB_ROOT = path.join(process.cwd(), "..", "kb");

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  if (isNaN(ticketId)) {
    return Response.json({ error: "Invalid ticket id" }, { status: 400 });
  }

  const body = (await request.json()) as { phase?: string };

  // Load current ticket to detect phase transitions
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) {
    return Response.json({ error: "Ticket not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  if (body.phase) updates.phase = body.phase;

  // Persist analyze conversation to KB on analyze → plan transition
  if (ticket.phase === "analyze" && body.phase === "plan") {
    updates.phaseLocked = 1;
    persistAnalyzeToKB(ticketId, ticket.jiraKey, ticket.title).catch((err) =>
      console.error("[ticket] Failed to persist analyze transcript:", err)
    );
  }

  await db.update(tickets).set(updates).where(eq(tickets.id, ticketId));

  return Response.json({ ok: true });
}

// ─── Persist analyze conversation to KB ─────────────────────────

async function persistAnalyzeToKB(
  ticketId: number,
  jiraKey: string,
  title: string
): Promise<void> {
  const messages = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.ticketId, ticketId), eq(chatMessages.phase, "analyze")));

  if (messages.length === 0) return;

  const slug = jiraKey.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // 1. Raw transcript
  const rawDir = path.join(KB_ROOT, "raw", "transcripts", slug);
  fs.mkdirSync(rawDir, { recursive: true });

  const rawLines = messages.map((m) => {
    const speaker = m.role === "user" ? "**User**" : "**AI Analyst**";
    return `${speaker}:\n\n${m.content}`;
  });

  const rawContent = [
    `# Analysis Transcript — ${jiraKey}: ${title}`,
    "",
    `*Generated: ${new Date().toISOString()}*`,
    "",
    "---",
    "",
    rawLines.join("\n\n---\n\n"),
  ].join("\n");

  fs.writeFileSync(path.join(rawDir, "analyze.md"), rawContent, "utf8");

  // 2. Wiki summary — extract key decisions from the conversation
  const wikiDir = path.join(KB_ROOT, "wiki", "tickets", slug);
  fs.mkdirSync(wikiDir, { recursive: true });

  // Build a summary from the conversation
  const decisions: string[] = [];
  const aiMessages = messages.filter((m) => m.role === "ai");
  const userMessages = messages.filter((m) => m.role === "user");

  // Pair up Q&A for a clean summary
  const exchanges: string[] = [];
  for (let i = 0; i < aiMessages.length; i++) {
    const answer = userMessages[i + 1]; // user responses offset by 1 (first user msg is kickoff)
    if (answer) {
      exchanges.push(`**Q:** ${aiMessages[i].content.split("\n")[0]}\n**A:** ${answer.content}`);
    }
  }

  // Last AI message often contains the summary
  const lastAi = aiMessages[aiMessages.length - 1];
  if (lastAi) {
    decisions.push(lastAi.content);
  }

  const wikiContent = [
    `# ${jiraKey}: ${title} — Analysis`,
    "",
    `*Completed: ${new Date().toISOString()}*`,
    "",
    "## Summary",
    "",
    decisions.length > 0 ? decisions[0] : "*No summary generated.*",
    "",
    "## Key Decisions",
    "",
    exchanges.length > 0 ? exchanges.join("\n\n") : "*See raw transcript for full conversation.*",
    "",
    "---",
    "",
    `> Raw transcript: [analyze.md](../../raw/transcripts/${slug}/analyze.md)`,
    "",
    `*Generated: ${new Date().toISOString()}*`,
  ].join("\n");

  fs.writeFileSync(path.join(wikiDir, "analysis.md"), wikiContent, "utf8");
}
