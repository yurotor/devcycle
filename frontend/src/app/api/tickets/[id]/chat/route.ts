// POST /api/tickets/:id/chat — send a message, get AI response with choices
// GET  /api/tickets/:id/chat — load chat history

import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { chatMessages, tickets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { complete, isAIAvailable } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

const KB_ROOT = path.join(process.cwd(), "..", "kb");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);

  const messages = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.ticketId, ticketId), eq(chatMessages.phase, "analyze")));

  return Response.json({ messages });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  const body = await request.json();
  const { message, phase } = body as { message: string; phase: "analyze" | "plan" };

  // Load ticket
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) return Response.json({ error: "Ticket not found" }, { status: 404 });

  const now = Date.now();

  // Save user message
  await db.insert(chatMessages).values({
    ticketId,
    phase,
    role: "user",
    content: message,
    createdAt: now,
  });

  // Load conversation history
  const history = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.ticketId, ticketId), eq(chatMessages.phase, phase)));

  // Build messages for AI
  const aiMessages = history.map((m) => ({
    role: (m.role === "ai" ? "assistant" : "user") as "user" | "assistant",
    content: m.content,
  }));

  // Load KB context
  const kbContext = loadKBContext();

  const userMsgCount = history.filter((m) => m.role === "user").length;

  const systemPrompt = phase === "analyze"
    ? buildAnalyzePrompt(ticket, kbContext, userMsgCount)
    : buildPlanPrompt(ticket, kbContext);

  // Stub responses
  const stubResponses = phase === "analyze"
    ? buildAnalyzeStubs(ticket, userMsgCount)
    : [
        `Let's work through the technical design.\n\nWhich repos/services will need changes?\n\n{"choices": ["WebApi only", "WebApi + UI", "WebApi + DbModel + UI", "Other"]}`,
        `Good. What about the deployment strategy?\n\n{"choices": ["Feature flag rollout", "Direct deploy to staging then prod", "Blue-green deployment", "Other"]}`,
        `I have enough to draft the PRD. The key decisions are captured. You can generate the PRD when ready. [ANALYSIS_COMPLETE]`,
      ];

  const stubIndex = Math.min(
    userMsgCount - 1,
    stubResponses.length - 1
  );

  // Force conclusion after 6 user messages — append instruction to wrap up
  const forceWrapUp = phase === "analyze" && userMsgCount >= 6;
  const finalMessages = forceWrapUp
    ? [
        ...aiMessages,
        {
          role: "user" as const,
          content:
            "[SYSTEM: The user has answered enough questions. You MUST now conclude the analysis. Summarize what you've learned and end with [ANALYSIS_COMPLETE]. Do NOT ask another question. Do NOT include choices.]",
        },
      ]
    : aiMessages;

  const aiResponse = await complete(finalMessages, {
    system: systemPrompt,
    maxTokens: 1024,
    stubResponse: stubResponses[Math.max(0, stubIndex)],
  });

  // Extract choices JSON block from end of response
  let { text: cleanText, choices } = extractChoices(aiResponse);

  // Detect readiness — check multiple patterns the AI might use
  const lc = cleanText.toLowerCase();
  const ready =
    cleanText.includes("[ANALYSIS_COMPLETE]") ||
    lc.includes("enough detail to move to planning") ||
    lc.includes("ready to move to planning") ||
    lc.includes("analysis is complete") ||
    lc.includes("analysis complete") ||
    lc.includes("ready for planning") ||
    lc.includes("move forward to planning") ||
    lc.includes("proceed to planning") ||
    lc.includes("ready to proceed") ||
    lc.includes("we have enough") ||
    lc.includes("sufficient detail") ||
    lc.includes("fully specified");

  // Fallback: if AI forgot choices and this isn't a conclusion, always add defaults
  if (choices.length === 0 && !ready && phase === "analyze") {
    choices = ["Yes", "No", "Other"];
  }

  // Strip marker
  const finalText = cleanText.replace(/\[ANALYSIS_COMPLETE\]/g, "").trim();

  // Save AI response with choices
  await db.insert(chatMessages).values({
    ticketId,
    phase,
    role: "ai",
    content: finalText,
    choices: choices.length > 0 ? JSON.stringify(choices) : null,
    createdAt: Date.now(),
  });

  return Response.json({ response: finalText, choices, ready });
}

// ─── Extract choices from AI response ───────────────────────────

function extractChoices(raw: string): { text: string; choices: string[] } {
  // Look for a trailing JSON object with a "choices" array
  // Pattern: {...} at the end of the message, possibly after whitespace
  const jsonMatch = raw.match(/\n?\s*(\{[\s\S]*"choices"\s*:\s*\[[\s\S]*\][\s\S]*\})\s*$/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (Array.isArray(parsed.choices) && parsed.choices.length > 0) {
        const text = raw.slice(0, raw.lastIndexOf(jsonMatch[1])).trim();
        return { text, choices: parsed.choices };
      }
    } catch {
      // JSON parse failed — fall through
    }
  }

  // Also try ```json fenced block
  const fencedMatch = raw.match(/\n?\s*```json\s*\n(\{[\s\S]*"choices"\s*:\s*\[[\s\S]*\][\s\S]*\})\s*\n```\s*$/);
  if (fencedMatch) {
    try {
      const parsed = JSON.parse(fencedMatch[1]);
      if (Array.isArray(parsed.choices) && parsed.choices.length > 0) {
        const text = raw.slice(0, raw.lastIndexOf("```json")).trim();
        return { text, choices: parsed.choices };
      }
    } catch {
      // fall through
    }
  }

  return { text: raw, choices: [] };
}

// ─── KB context loader ──────────────────────────────────────────

function loadKBContext(): string {
  const sections: string[] = [];

  const synthPath = path.join(KB_ROOT, "raw", "system-synthesis.json");
  if (fs.existsSync(synthPath)) {
    try {
      const synth = JSON.parse(fs.readFileSync(synthPath, "utf8"));
      if (synth.systemOverview) {
        sections.push(`## System Overview\n${synth.systemOverview}`);
      }
      if (synth.features?.length) {
        sections.push(`## Known Features\n${synth.features.map((f: { name: string; description: string; repos: string[] }) =>
          `- **${f.name}**: ${f.description || "no description"} (repos: ${f.repos.join(", ")})`
        ).join("\n")}`);
      }
      if (synth.serviceMap?.length) {
        sections.push(`## Service Map\n${synth.serviceMap.map((s: { repo: string; role: string }) =>
          `- **${s.repo}**: ${s.role}`
        ).join("\n")}`);
      }
      if (synth.integrations?.length) {
        sections.push(`## External Integrations\n${synth.integrations.map((i: { system: string; direction: string; protocol: string }) =>
          `- **${i.system}** (${i.direction}, ${i.protocol})`
        ).join("\n")}`);
      }
    } catch {
      // skip
    }
  }

  const rawDir = path.join(KB_ROOT, "raw");
  if (fs.existsSync(rawDir)) {
    const repoPurposes: string[] = [];
    for (const entry of fs.readdirSync(rawDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const analysisPath = path.join(rawDir, entry.name, "analysis.json");
      if (fs.existsSync(analysisPath)) {
        try {
          const analysis = JSON.parse(fs.readFileSync(analysisPath, "utf8"));
          if (analysis.purpose) {
            repoPurposes.push(`- **${entry.name}**: ${analysis.purpose}`);
          }
        } catch { /* skip */ }
      }
    }
    if (repoPurposes.length) {
      sections.push(`## Repository Purposes\n${repoPurposes.join("\n")}`);
    }
  }

  return sections.length > 0 ? sections.join("\n\n") : "";
}

// ─── Analyze prompt (grill-me style with choices) ───────────────

function buildAnalyzePrompt(
  ticket: { jiraKey: string; title: string; description: string | null },
  kbContext: string,
  exchangeCount: number = 0
): string {
  const urgency = exchangeCount >= 4
    ? `\n\n**IMPORTANT: This is exchange ${exchangeCount}. You MUST wrap up within 1-2 more questions at most. If you have enough context, conclude NOW.**`
    : "";

  return `You are a relentless senior technical analyst conducting a deep-dive requirements interview for a development ticket. Your job is to ask probing, specific questions — one at a time — until the ticket is fully specified and ready for implementation planning.

## Your approach

1. **Ask ONE question at a time.** Never ask multiple questions in one message.
2. **Always provide answer choices.** At the end of every message, include a JSON block with suggested answers. Format:
   {"choices": ["Option A", "Option B", "Option C", "Other"]}
   The last option should always be "Other" to allow free text.
   Generate 3-5 options that are specific and relevant to the question. Use your knowledge of the codebase to make the options concrete (e.g., specific repo names, specific API patterns, specific technologies used in this system).
3. **For each question, state your recommendation** based on KB context. Format: "My recommendation: [your best guess]"
4. **Walk down the decision tree systematically.** Cover these areas in priority order:
   - What exactly needs to change (scope, boundaries, what's in vs. out)
   - Which repos/services are affected and how
   - Data model changes (new fields, migrations, breaking changes)
   - API contract changes (new endpoints, modified payloads, versioning)
   - Business rules and edge cases
   - Error handling and failure modes
   - Dependencies and integration points
   - Testing strategy
5. **If you can answer a question yourself from the KB context, state what you know** and ask for confirmation — still provide Yes/No/Other choices.
6. **Be concise.** Keep each message to 2-4 sentences plus your recommendation, then the choices JSON.
7. **When you have enough detail** (typically 3-5 exchanges), conclude with a brief summary of what was established. Include the marker [ANALYSIS_COMPLETE] at the very end of your message. Do NOT include choices in the completion message. Do NOT ask another question.
8. **If the ticket is straightforward**, complete in fewer exchanges. Don't pad. Aim for 3-5 total exchanges, not more.${urgency}

## Ticket
**${ticket.jiraKey}: ${ticket.title}**
${ticket.description ? `\nDescription: ${ticket.description}` : "\n(No description provided.)"}

${kbContext ? `## Codebase Knowledge Base\n\n${kbContext}` : ""}

IMPORTANT: Every non-final message MUST end with a {"choices": [...]} JSON block. The final [ANALYSIS_COMPLETE] message must NOT have choices.`;
}

function buildPlanPrompt(
  ticket: { jiraKey: string; title: string; description: string | null },
  kbContext: string
): string {
  return `You are a technical architect helping create a PRD for ticket "${ticket.jiraKey}: ${ticket.title}".
Ask about architecture decisions, affected services, API changes, data model impacts, and risks.
Keep responses concise and technical.

Always end each question with a JSON choices block: {"choices": ["Option A", "Option B", "Other"]}

${kbContext ? `## Codebase Context\n\n${kbContext}` : ""}`;
}

// ─── Analyze stubs ──────────────────────────────────────────────

function buildAnalyzeStubs(
  ticket: { jiraKey: string; title: string; description: string | null },
  userMsgCount: number
): string[] {
  return [
    `Let me start by understanding the scope of "${ticket.title}".\n\nWhat is the core change being requested here?\n\nMy recommendation: Based on the ticket title, this looks like a new feature addition.\n\n{"choices": ["New feature", "Modification to existing behavior", "Bug fix", "Refactoring / tech debt", "Other"]}`,
    `Thanks. Which repositories and services will need to be modified for this change?\n\nMy recommendation: This likely touches the WebApi and possibly the UI repo.\n\n{"choices": ["WebApi only", "WebApi + UI", "WebApi + DbModel + UI", "All backend repos", "Other"]}`,
    `Got it. Will this require any database schema changes?\n\nMy recommendation: This probably needs at least one new column or table.\n\n{"choices": ["No schema changes", "New columns on existing tables", "New table(s)", "Migration of existing data", "Other"]}`,
    `What should happen when this feature encounters an error or invalid input?\n\nMy recommendation: Standard validation with 400 response for invalid input.\n\n{"choices": ["Return 400 with validation details", "Fail silently and log", "Retry with exponential backoff", "Queue for manual review", "Other"]}`,
    `I believe the analysis is complete — we have enough detail to move to planning.\n\nHere's what we've established:\n- Scope and affected services identified\n- Data model changes outlined\n- Business rules and edge cases covered\n- Error handling strategy defined\n\nYou can advance to the Plan phase to generate the PRD. [ANALYSIS_COMPLETE]`,
  ];
}
