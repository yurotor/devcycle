// POST /api/tickets/:id/analysis/chat — Analysis phase chat using Claude CLI with grill-me + write-a-prd skills.
// GET  /api/tickets/:id/analysis/chat — load chat history + streaming status with tool events.
//
// Replaces the old analyze (Anthropic API) and plan/chat (Claude CLI) routes.
// Uses claudeExecStreaming with session resume and skill prompts read from disk.

import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { chatMessages, tickets, repos } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { claudeExecStreaming, isClaudeCliAvailable } from "@/lib/claude-cli";
import { complete } from "@/lib/anthropic";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const KB_ROOT = path.join(process.cwd(), "..", "kb");
const REPOS_DIR = path.join(KB_ROOT, "repos");
const SKILLS_DIR = path.join(process.cwd(), "..", ".claude", "skills");
const PLUGINS_DIR = path.join(process.env.HOME ?? "", ".claude", "plugins", "marketplaces");

// In-memory streaming state per ticket
interface ToolEvent {
  toolName: string;
  summary: string;
  timestamp: number;
}

const streamingState = new Map<number, {
  label: string;
  tool: string;
  updatedAt: number;
  toolEvents: ToolEvent[];
  /** Accumulated streaming text from Claude's thinking/response */
  thinkingText: string;
}>();

// ─── Load skill prompts from disk ─────────────────────────────────

function loadSkillPrompt(skillName: string): string {
  const skillPath = path.join(SKILLS_DIR, skillName, "SKILL.md");
  if (fs.existsSync(skillPath)) {
    const raw = fs.readFileSync(skillPath, "utf8");
    // Strip YAML frontmatter
    const stripped = raw.replace(/^---[\s\S]*?---\s*/, "");
    return stripped.trim();
  }
  return "";
}

function loadPluginPrompt(vendor: string, name: string): string {
  const pluginPath = path.join(PLUGINS_DIR, vendor, name, "SKILL.md");
  if (fs.existsSync(pluginPath)) {
    const raw = fs.readFileSync(pluginPath, "utf8");
    return raw.replace(/^---[\s\S]*?---\s*/, "").trim();
  }
  return "";
}

// ─── GET handler ──────────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  // Return streaming status with tool events (polled by frontend during a turn)
  if (action === "streaming-status") {
    const status = streamingState.get(ticketId);
    return Response.json(status ?? { label: "Thinking...", tool: "", updatedAt: 0, toolEvents: [], thinkingText: "" });
  }

  // Return chat history
  const messages = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.ticketId, ticketId), eq(chatMessages.phase, "analyze")));

  return Response.json({ messages });
}

// ─── POST handler ─────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  const body = await request.json();
  const { message } = body as { message: string };

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) return Response.json({ error: "Ticket not found" }, { status: 404 });

  const now = Date.now();

  // Save user message
  await db.insert(chatMessages).values({
    ticketId,
    phase: "analyze",
    role: "user",
    content: message,
    createdAt: now,
  });

  const isFirstTurn = !ticket.planSessionId;

  // Gather repo directories for addDirs
  const repoRows = await db.select().from(repos).where(eq(repos.workspaceId, ticket.workspaceId));
  const repoDirs = repoRows
    .map((r) => path.join(REPOS_DIR, r.name))
    .filter((d) => fs.existsSync(d));

  let responseText: string;
  let sessionId: string | undefined = ticket.planSessionId ?? undefined;
  const toolEvents: ToolEvent[] = [];

  if (isClaudeCliAvailable()) {
    // Set up streaming state
    streamingState.set(ticketId, { label: "Starting...", tool: "", updatedAt: Date.now(), toolEvents: [], thinkingText: "" });

    const onToolUse = (toolName: string, toolInput: unknown) => {
      let summary = `Using ${toolName}...`;
      if (toolName === "Read" && typeof toolInput === "object" && toolInput && "file_path" in toolInput) {
        const fp = (toolInput as { file_path: string }).file_path;
        const short = fp.split("/").slice(-2).join("/");
        summary = `Reading ${short}`;
      } else if (toolName === "Grep" && typeof toolInput === "object" && toolInput && "pattern" in toolInput) {
        summary = `Searching for "${(toolInput as { pattern: string }).pattern}"`;
      } else if (toolName === "Glob" && typeof toolInput === "object" && toolInput && "pattern" in toolInput) {
        summary = `Scanning ${(toolInput as { pattern: string }).pattern}`;
      } else if (toolName === "Glob") {
        summary = "Scanning files";
      }

      const event: ToolEvent = { toolName, summary, timestamp: Date.now() };
      toolEvents.push(event);

      const state = streamingState.get(ticketId);
      if (state) {
        state.label = summary + "...";
        state.tool = toolName;
        state.updatedAt = Date.now();
        state.toolEvents = [...toolEvents];
      }
    };

    try {
      let prompt: string;

      if (isFirstTurn) {
        // Load business context
        const kbContext = loadBusinessContext();

        prompt = `## Ticket
**${ticket.jiraKey}: ${ticket.title}**
${ticket.description ? `\n${ticket.description}` : "\n(No description provided.)"}

${kbContext ? `## System Context\n\n${kbContext}\n` : ""}
## User's Message
${message}`;

        sessionId = randomUUID();
      } else {
        // Subsequent turns: user message + reinforcement
        prompt = `${message}

[SYSTEM REMINDER: You are interviewing the user. Ask ONE question at a time. Explore the codebase between questions. For each question, provide your recommended answer and choices as JSON: {"choices": ["option1", "option2", "Other"]}. If all decisions are resolved, summarize and add [ANALYSIS_COMPLETE].]`;
      }

      const onText = (text: string) => {
        const state = streamingState.get(ticketId);
        if (state) {
          state.thinkingText = text;
          state.label = "Composing response...";
          state.updatedAt = Date.now();
        }
      };

      const streamResult = await claudeExecStreaming(prompt, {
        addDirs: [KB_ROOT, ...repoDirs],
        model: "sonnet",
        maxBudget: 1.50,
        allowedTools: ["Read", "Grep", "Glob"],
        timeoutMs: isFirstTurn ? 300_000 : 120_000,
        ...(isFirstTurn
          ? { sessionId, systemPrompt: buildAnalysisSystemPrompt() }
          : { resumeSessionId: sessionId! }),
        onToolUse,
        onText,
      });

      responseText = streamResult.result as string;

      if (streamResult.sessionId) {
        sessionId = streamResult.sessionId;
      }
      await db.update(tickets).set({
        planSessionId: sessionId,
        updatedAt: Date.now(),
      }).where(eq(tickets.id, ticketId));

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[analysis/chat] Claude CLI failed:", msg);
      responseText = `I encountered an error exploring the codebase: ${msg.slice(0, 200)}. Could you rephrase or provide more context?`;
    } finally {
      streamingState.delete(ticketId);
    }
  } else {
    // Fallback: use API without codebase access
    const history = await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.ticketId, ticketId), eq(chatMessages.phase, "analyze")));

    const aiMessages = history.map((m) => ({
      role: (m.role === "ai" ? "assistant" : "user") as "user" | "assistant",
      content: m.content,
    }));

    responseText = await complete(aiMessages, {
      system: buildAnalysisSystemPrompt(),
      maxTokens: 2048,
      stubResponse: buildStubResponse(ticket, history.filter((m) => m.role === "user").length),
    });
  }

  // Extract choices and detect completion
  const { text: cleanText, choices } = extractChoices(responseText);

  const lc = cleanText.toLowerCase();
  const ready =
    cleanText.includes("[ANALYSIS_COMPLETE]") ||
    lc.includes("analysis is complete") ||
    lc.includes("analysis complete") ||
    lc.includes("enough detail to move to planning") ||
    lc.includes("ready to move to planning") ||
    lc.includes("ready for planning") ||
    lc.includes("ready to proceed") ||
    lc.includes("we have enough") ||
    lc.includes("sufficient detail") ||
    lc.includes("fully specified");

  const finalChoices = choices.length === 0 && !ready
    ? ["Yes", "No", "Other"]
    : choices;

  const finalText = cleanText.replace(/\[ANALYSIS_COMPLETE\]/g, "").trim();

  // Save AI response
  await db.insert(chatMessages).values({
    ticketId,
    phase: "analyze",
    role: "ai",
    content: finalText,
    choices: finalChoices.length > 0 ? JSON.stringify(finalChoices) : null,
    createdAt: Date.now(),
  });

  return Response.json({ response: finalText, choices: finalChoices, ready, toolEvents });
}

// ─── Build system prompt from skill files ─────────────────────────

function buildAnalysisSystemPrompt(): string {
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

// ─── Business context from KB ─────────────────────────────────────

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
      if (synth.features?.length) {
        sections.push(`### Features\n${synth.features.map((f: { name: string; description: string }) =>
          `- **${f.name}**: ${f.description}`
        ).join("\n")}`);
      }
      if (synth.integrations?.length) {
        sections.push(`### External Systems\n${synth.integrations.map((i: { system: string; direction: string }) =>
          `- **${i.system}** (${i.direction})`
        ).join("\n")}`);
      }
    } catch { /* skip */ }
  }
  return sections.length > 0 ? sections.join("\n\n") : "";
}

// ─── Extract choices from AI response ─────────────────────────────

function extractChoices(raw: string): { text: string; choices: string[] } {
  // Try ```json fenced block
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

  // Try bare JSON object with "choices" key
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

// ─── Stub response for when AI is unavailable ─────────────────────

function buildStubResponse(
  ticket: { title: string },
  userMsgCount: number
): string {
  const stubs = [
    `Let me understand the context for "${ticket.title}". What problem does this solve, and who is most affected?\n\nMy recommendation: Based on the ticket, this seems to address a gap in the current workflow.\n\n{"choices": ["Operational efficiency issue", "Missing business capability", "Compliance requirement", "User-reported pain point", "Other"]}`,
    `Thanks. What should change from the end user's perspective when this is done?\n\nMy recommendation: This likely modifies behavior of an existing process.\n\n{"choices": ["New workflow", "Modified existing process", "New data visibility", "Automated manual process", "Other"]}`,
    `What business rules govern this behavior? Are there specific thresholds or conditions?\n\nMy recommendation: There are likely domain rules that constrain the implementation.\n\n{"choices": ["Contractual rules", "Regulatory requirements", "Time-based rules", "Threshold-based triggers", "Other"]}`,
    `I believe the requirements are clear. Here's what we've established:\n- Problem and motivation identified\n- Scope and user impact defined\n- Business rules and edge cases covered\n\nYou can advance to generate the PRD. [ANALYSIS_COMPLETE]`,
  ];
  const idx = Math.min(userMsgCount - 1, stubs.length - 1);
  return stubs[Math.max(0, idx)];
}
