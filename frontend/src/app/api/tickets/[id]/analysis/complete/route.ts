// POST /api/tickets/:id/analysis/complete — Generate PRD and advance to Plan phase.
// Called when user clicks "Generate PRD & Continue" (skip=false) or "Skip to Plan" (skip=true).

import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { tickets, chatMessages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { claudeExec, isClaudeCliAvailable } from "@/lib/claude-cli";
import { complete } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

const KB_ROOT = path.join(process.cwd(), "..", "kb");


const PRD_TEMPLATE = `## Problem Statement

The problem from the user's perspective. Be specific about what's broken or missing.

## Solution

The solution from the user's perspective. Describe the end-state, not the implementation steps.

## User Stories

A LONG, numbered list of user stories covering all aspects:
1. As an <actor>, I want a <feature>, so that <benefit>

Cover happy paths, edge cases, and error scenarios.

## Implementation Decisions

Concrete implementation decisions:
- Repos/modules to build or modify
- Interfaces to modify
- Architectural decisions
- Schema changes
- API contracts

Do NOT include specific file paths or code snippets.

## Testing Decisions

- Which modules will be tested and how
- What makes a good test
- Prior art for tests

## Out of Scope

What is explicitly NOT part of this change.

## Further Notes

Any additional context, risks, dependencies.`;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  const body = await request.json().catch(() => ({}));
  const { skip } = body as { skip?: boolean };

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) return Response.json({ error: "Ticket not found" }, { status: 404 });

  // Load analyze transcript
  const messages = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.ticketId, ticketId), eq(chatMessages.phase, "analyze")));

  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Analyst"}: ${m.content}`)
    .join("\n\n");

  // Load KB context
  const kbContext = loadKBContext();

  const systemPrompt = skip
    ? `You are generating a quick PRD from limited information. Make reasonable assumptions for any gaps. Be concise but cover all sections. Speed over perfection.`
    : `You are a senior technical architect creating a PRD. Use the full interview transcript and codebase knowledge to make every section specific and actionable.`;

  const userContent = `Generate a PRD for this ticket using the template below.

## Ticket
**${ticket.jiraKey}: ${ticket.title}**
${ticket.description ? `\nDescription: ${ticket.description}` : "\n(No description provided.)"}

## Analysis Interview
${transcript || "(No interview conducted — generate based on ticket description. Make reasonable assumptions.)"}

${kbContext ? `## Codebase Context\n${kbContext}` : ""}

## PRD Template
${PRD_TEMPLATE}

Write the PRD now. Be specific and reference actual repos, entities, APIs, and patterns.`;

  let prd: string;

  if (isClaudeCliAvailable()) {
    // PRD generation is pure text synthesis from the transcript + KB context already in the prompt.
    // No need for addDirs (repo exploration) — that just slows it down.
    prd = await claudeExec(userContent, {
      model: "sonnet",
      maxBudget: skip ? 0.15 : 0.50,
      timeoutMs: skip ? 60_000 : 300_000,
      systemPrompt,
    });
  } else {
    // Fallback: truncate prompt to avoid Bedrock timeouts on large transcripts
    const truncatedContent = userContent.length > 12000
      ? userContent.slice(0, 12000) + "\n\n... (truncated for length)\n\nWrite the PRD now."
      : userContent;
    prd = await complete(
      [{ role: "user", content: truncatedContent }],
      { system: systemPrompt, maxTokens: 4096 }
    );
  }

  // Save PRD to KB filesystem
  const slug = ticket.jiraKey.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const prdDir = path.join(KB_ROOT, "wiki", "tickets", slug);
  fs.mkdirSync(prdDir, { recursive: true });
  fs.writeFileSync(path.join(prdDir, "prd.md"), prd, "utf8");

  // Persist analyze transcript to KB
  persistAnalyzeToKB(ticketId, ticket.jiraKey, ticket.title, messages).catch((err) =>
    console.error("[analysis/complete] Failed to persist transcript:", err)
  );

  // Update ticket: save PRD path, advance to plan, lock phase
  await db
    .update(tickets)
    .set({
      prdPath: `wiki/tickets/${slug}/prd.md`,
      phase: "plan",
      phaseLocked: 1,
      updatedAt: Date.now(),
    })
    .where(eq(tickets.id, ticketId));

  return Response.json({ ok: true, prd });
}

// ─── KB context for PRD generation ────────────────────────────────

function loadKBContext(): string {
  const sections: string[] = [];
  const synthPath = path.join(KB_ROOT, "raw", "system-synthesis.json");
  if (fs.existsSync(synthPath)) {
    try {
      const synth = JSON.parse(fs.readFileSync(synthPath, "utf8"));
      if (synth.systemOverview) sections.push(`### System Overview\n${synth.systemOverview}`);
      if (synth.serviceMap?.length) {
        sections.push(`### Service Map\n${synth.serviceMap.map((s: { repo: string; role: string; communicatesWith?: string[] }) =>
          `- **${s.repo}**: ${s.role}${s.communicatesWith?.length ? ` → ${s.communicatesWith.join(", ")}` : ""}`
        ).join("\n")}`);
      }
      if (synth.dataModel?.length) {
        sections.push(`### Data Model\n${synth.dataModel.map((e: { entity: string; description: string; repos?: string[] }) =>
          `- **${e.entity}**: ${e.description}${e.repos?.length ? ` (${e.repos.join(", ")})` : ""}`
        ).join("\n")}`);
      }
      if (synth.architecturePatterns?.length) {
        sections.push(`### Architecture Patterns\n${synth.architecturePatterns.map((p: { pattern: string; description: string }) =>
          `- **${p.pattern}**: ${p.description}`
        ).join("\n")}`);
      }
    } catch { /* skip */ }
  }

  // Load per-repo summaries
  const rawDir = path.join(KB_ROOT, "raw");
  if (fs.existsSync(rawDir)) {
    const repoSummaries: string[] = [];
    for (const entry of fs.readdirSync(rawDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const analysisPath = path.join(rawDir, entry.name, "analysis.json");
      if (!fs.existsSync(analysisPath)) continue;
      try {
        const analysis = JSON.parse(fs.readFileSync(analysisPath, "utf8"));
        const parts = [`**${entry.name}**: ${analysis.purpose || "no description"}`];
        if (analysis.apis?.length) {
          parts.push(`  APIs: ${analysis.apis.slice(0, 5).map((a: { method: string; endpoint: string }) => `${a.method} ${a.endpoint}`).join(", ")}`);
        }
        if (analysis.dataEntities?.length) {
          parts.push(`  Entities: ${analysis.dataEntities.map((e: { name: string }) => e.name).join(", ")}`);
        }
        repoSummaries.push(parts.join("\n"));
      } catch { /* skip */ }
    }
    if (repoSummaries.length) sections.push(`### Repositories\n${repoSummaries.join("\n")}`);
  }

  return sections.length > 0 ? sections.join("\n\n") : "";
}

// ─── Persist analyze transcript to KB ─────────────────────────────

async function persistAnalyzeToKB(
  ticketId: number,
  jiraKey: string,
  title: string,
  messages: { role: string; content: string }[]
): Promise<void> {
  if (messages.length === 0) return;

  const slug = jiraKey.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // Raw transcript
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

  // Wiki summary
  const wikiDir = path.join(KB_ROOT, "wiki", "tickets", slug);
  fs.mkdirSync(wikiDir, { recursive: true });

  const aiMessages = messages.filter((m) => m.role === "ai");
  const userMessages = messages.filter((m) => m.role === "user");

  const exchanges: string[] = [];
  for (let i = 0; i < aiMessages.length; i++) {
    const answer = userMessages[i + 1];
    if (answer) {
      exchanges.push(`**Q:** ${aiMessages[i].content.split("\n")[0]}\n**A:** ${answer.content}`);
    }
  }

  const lastAi = aiMessages[aiMessages.length - 1];
  const wikiContent = [
    `# ${jiraKey}: ${title} — Analysis`,
    "",
    `*Completed: ${new Date().toISOString()}*`,
    "",
    "## Summary",
    "",
    lastAi ? lastAi.content : "*No summary generated.*",
    "",
    "## Key Decisions",
    "",
    exchanges.length > 0 ? exchanges.join("\n\n") : "*See raw transcript.*",
    "",
    "---",
    "",
    `> Raw transcript: [analyze.md](../../raw/transcripts/${slug}/analyze.md)`,
  ].join("\n");

  fs.writeFileSync(path.join(wikiDir, "analysis.md"), wikiContent, "utf8");
}
