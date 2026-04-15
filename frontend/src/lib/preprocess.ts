// Background pre-processing: kicks off the first analysis turn for new tickets
// so that when a user opens them, the first question is already waiting.
//
// Triggered lazily from GET /api/tickets. Processes up to CONCURRENCY tickets
// at a time, then picks up the next batch.
// Calls Claude CLI directly instead of self-fetching HTTP to avoid timing issues.

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const CONCURRENCY = 3;
let started = false;
let running = false;

const KB_ROOT = path.join(process.cwd(), "..", "kb");
const REPOS_DIR = path.join(KB_ROOT, "repos");
const SKILLS_DIR = path.join(process.cwd(), "..", ".claude", "skills");
const PLUGINS_DIR = path.join(process.env.HOME ?? "", ".claude", "plugins", "marketplaces");

export function ensurePreprocessing() {
  if (started) return;
  started = true;
  // Slight delay so the boot request finishes first
  setTimeout(() => runPreprocessLoop(), 3000);
}

function loadSkillPrompt(skillName: string): string {
  const skillPath = path.join(SKILLS_DIR, skillName, "SKILL.md");
  if (fs.existsSync(skillPath)) {
    return fs.readFileSync(skillPath, "utf8").replace(/^---[\s\S]*?---\s*/, "").trim();
  }
  return "";
}

function loadPluginPrompt(vendor: string, name: string): string {
  const pluginPath = path.join(PLUGINS_DIR, vendor, name, "SKILL.md");
  if (fs.existsSync(pluginPath)) {
    return fs.readFileSync(pluginPath, "utf8").replace(/^---[\s\S]*?---\s*/, "").trim();
  }
  return "";
}

function buildSystemPrompt(): string {
  const grillMe = loadSkillPrompt("grill-me");
  const writeAPrd = loadSkillPrompt("write-a-prd");

  return `## STYLE — ENFORCED ON EVERY RESPONSE

Caveman lite. Tight, professional, zero fluff. Rules:
- No filler (just/really/basically/actually/simply)
- No hedging (might/perhaps/it seems like)
- No pleasantries (Sure!/Great question!/Let me.../I found an interesting...)
- No narrating your process ("Now I understand the data flow:", "Let me share what I discovered")
- No numbered lists of findings. Summarize in 1-2 sentences.
- Max 4-5 lines before the choices JSON. Fewer is better.
- State finding → ask question → recommend → choices. Done.

Bad: "Perfect! PurchaseLoansRequest has mplId (line 21 in the output), so batches are created per MPL. Now I understand the data flow:\\n1. PurchaseLoansRequest → creates batch..."
Good: "Batches are per-MPL but error logs omit mpl_id. Should we add it to both the account-level log and the batch failure, or just batch-level?"

---

You are a senior analyst conducting a requirements and technical analysis interview for a development ticket.

## Interview Methodology

${grillMe || `- Interview the user relentlessly about every aspect of this plan until you reach a shared understanding.
- Walk down each branch of the design tree, resolving dependencies between decisions one by one.
- For each question, provide your recommended answer.
- Ask questions one at a time.
- If a question can be answered by exploring the codebase, explore the codebase instead.`}

## PRD Target Structure

${writeAPrd || `1. Problem Statement  2. Solution  3. User Stories  4. Implementation Decisions  5. Testing Decisions  6. Out of Scope  7. Further Notes`}

## Process

1. Explore codebase (Read, Grep, Glob) to understand current state
2. Ask ONE question — provide your recommended answer
3. Get user's answer, explore more code, ask next question
4. Cover business requirements AND technical decisions
5. Repeat until all branches resolved

## Response Format

1. Finding (1-2 sentences)
2. ONE question
3. Recommendation (1 sentence)
4. {"choices": ["Option A", "Option B", "Other"]}

That's it. No preamble, no numbered deep-dives, no "here's what I found" paragraphs.

## Completion

When all branches resolved, give structured summary + [ANALYSIS_COMPLETE]. No choices in final message.

IMPORTANT: Every non-final message MUST end with a {"choices": [...]} JSON block.
IMPORTANT: You MUST explore the codebase (Read, Grep, Glob) before and between questions.`;
}

function loadBusinessContext(): string {
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
    } catch { /* skip */ }
  }
  return sections.length > 0 ? sections.join("\n\n") : "";
}

function extractChoices(raw: string): { text: string; choices: string[] } {
  const fencedMatch = raw.match(/```json\s*\n(\{[\s\S]*?"choices"\s*:\s*\[[\s\S]*?\][\s\S]*?\})\s*\n```/);
  if (fencedMatch) {
    try {
      const parsed = JSON.parse(fencedMatch[1]);
      if (Array.isArray(parsed.choices) && parsed.choices.length > 0) {
        const idx = raw.lastIndexOf("```json");
        const endIdx = raw.indexOf("```", idx + 7);
        const text = (raw.slice(0, idx) + raw.slice(endIdx + 3)).trim();
        return { text, choices: parsed.choices };
      }
    } catch { /* fall through */ }
  }
  const allMatches = [...raw.matchAll(/\{[^{}]*"choices"\s*:\s*\[[^\]]*\][^{}]*\}/g)];
  if (allMatches.length > 0) {
    const lastMatch = allMatches[allMatches.length - 1];
    try {
      const parsed = JSON.parse(lastMatch[0]);
      if (Array.isArray(parsed.choices) && parsed.choices.length > 0) {
        const idx = lastMatch.index!;
        const text = (raw.slice(0, idx) + raw.slice(idx + lastMatch[0].length)).trim();
        return { text, choices: parsed.choices };
      }
    } catch { /* fall through */ }
  }
  return { text: raw, choices: [] };
}

async function runPreprocessLoop() {
  if (running) return;
  running = true;

  try {
    const { db } = await import("@/lib/db");
    const { tickets, chatMessages, repos } = await import("@/lib/db/schema");
    const { eq, and } = await import("drizzle-orm");
    const { claudeExecStreaming, isClaudeCliAvailable } = await import("@/lib/claude-cli");

    if (!isClaudeCliAvailable()) {
      console.log("[preprocess] Claude CLI not available, skipping");
      running = false;
      return;
    }

    // Find tickets in "analyze" phase with no chat messages and no session
    const analyzeTickets = await db
      .select()
      .from(tickets)
      .where(eq(tickets.phase, "analyze"));

    const candidates: { id: number; workspaceId: number; jiraKey: string; title: string; description: string | null }[] = [];
    for (const t of analyzeTickets) {
      if (t.planSessionId) continue;
      const msgs = await db
        .select({ id: chatMessages.id })
        .from(chatMessages)
        .where(and(eq(chatMessages.ticketId, t.id), eq(chatMessages.phase, "analyze")))
        .limit(1);
      if (msgs.length === 0) {
        candidates.push({ id: t.id, workspaceId: t.workspaceId, jiraKey: t.jiraKey, title: t.title, description: t.description });
      }
    }

    if (candidates.length === 0) {
      console.log("[preprocess] No new tickets to pre-process");
      running = false;
      return;
    }

    console.log(`[preprocess] Found ${candidates.length} tickets to pre-process`);

    // Process in batches of CONCURRENCY
    for (let i = 0; i < candidates.length; i += CONCURRENCY) {
      const batch = candidates.slice(i, i + CONCURRENCY);
      console.log(`[preprocess] Batch ${Math.floor(i / CONCURRENCY) + 1}: ${batch.map((t) => t.jiraKey).join(", ")}`);
      await Promise.allSettled(batch.map((ticket) =>
        preprocessTicket(ticket, { db, tickets, chatMessages, repos, eq, and, claudeExecStreaming })
      ));
    }

    console.log("[preprocess] All batches complete");
  } catch (err) {
    console.error("[preprocess] Loop failed:", err instanceof Error ? err.message : err);
  } finally {
    running = false;
  }
}

async function preprocessTicket(
  ticket: { id: number; workspaceId: number; jiraKey: string; title: string; description: string | null },
  deps: {
    db: Awaited<typeof import("@/lib/db")>["db"];
    tickets: Awaited<typeof import("@/lib/db/schema")>["tickets"];
    chatMessages: Awaited<typeof import("@/lib/db/schema")>["chatMessages"];
    repos: Awaited<typeof import("@/lib/db/schema")>["repos"];
    eq: typeof import("drizzle-orm")["eq"];
    and: typeof import("drizzle-orm")["and"];
    claudeExecStreaming: Awaited<typeof import("@/lib/claude-cli")>["claudeExecStreaming"];
  }
) {
  const { db, tickets, chatMessages, repos, eq, and, claudeExecStreaming } = deps;
  const ticketId = ticket.id;
  const message = "Analyze this ticket. Start by exploring the codebase, then ask your first question.";

  try {
    console.log(`[preprocess] ${ticket.jiraKey}: starting...`);

    // Save user message
    const now = Date.now();
    await db.insert(chatMessages).values({
      ticketId,
      phase: "analyze",
      role: "user",
      content: message,
      createdAt: now,
    });

    // Gather repo directories
    const repoRows = await db.select().from(repos).where(eq(repos.workspaceId, ticket.workspaceId));
    const repoDirs = repoRows
      .map((r) => path.join(REPOS_DIR, r.name))
      .filter((d) => fs.existsSync(d));

    const kbContext = loadBusinessContext();
    const prompt = `## Ticket
**${ticket.jiraKey}: ${ticket.title}**
${ticket.description ? `\n${ticket.description}` : "\n(No description provided.)"}

${kbContext ? `## System Context\n\n${kbContext}\n` : ""}
## User's Message
${message}`;

    const sessionId = randomUUID();

    const streamResult = await claudeExecStreaming(prompt, {
      addDirs: [KB_ROOT, ...repoDirs],
      model: "sonnet",
      maxBudget: 1.50,
      allowedTools: ["Read", "Grep", "Glob"],
      timeoutMs: 300_000,
      sessionId,
      systemPrompt: buildSystemPrompt(),
    });

    const responseText = streamResult.result as string;
    const finalSessionId = streamResult.sessionId ?? sessionId;

    // Update ticket with session ID
    await db.update(tickets).set({
      planSessionId: finalSessionId,
      updatedAt: Date.now(),
    }).where(eq(tickets.id, ticketId));

    // Extract choices and save AI response
    const { text: cleanText, choices } = extractChoices(responseText);
    const lc = cleanText.toLowerCase();
    const ready = cleanText.includes("[ANALYSIS_COMPLETE]") || lc.includes("analysis complete");
    const finalChoices = choices.length === 0 && !ready ? ["Yes", "No", "Other"] : choices;
    const finalText = cleanText.replace(/\[ANALYSIS_COMPLETE\]/g, "").trim();

    await db.insert(chatMessages).values({
      ticketId,
      phase: "analyze",
      role: "ai",
      content: finalText,
      choices: finalChoices.length > 0 ? JSON.stringify(finalChoices) : null,
      createdAt: Date.now(),
    });

    console.log(`[preprocess] ${ticket.jiraKey}: done — ${finalChoices.length} choices, ready: ${ready}`);
  } catch (err) {
    console.error(`[preprocess] ${ticket.jiraKey}: failed —`, err instanceof Error ? err.message : err);
  }
}
