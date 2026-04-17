// POST /api/kb/interview — gap-driven interview chat with choices
// GET  /api/kb/interview — load interview history

import { db } from "@/lib/db";
import { interviewNotes, chatMessages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getWorkspace, getWsIdFromRequest } from "@/lib/db/helpers";
import { complete, isAIAvailable } from "@/lib/anthropic";
import { compileKnowledgeBase } from "@/lib/scan/kb-manager";
import { runSynthesis, loadRepoAnalyses } from "@/lib/scan/engine";
import type { SystemSynthesis } from "@/lib/scan/engine";
import { getKbRoot } from "@/lib/kb-path";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// We use ticketId=-wsId, phase="interview" to store interview messages per workspace
const INTERVIEW_PHASE = "interview";
function interviewTicketId(wsId: number) { return -wsId; }

export async function GET(request: Request) {
  const ws = await getWorkspace(getWsIdFromRequest(request));
  if (!ws) return Response.json({ messages: [] });

  const messages = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.ticketId, interviewTicketId(ws.id)),
        eq(chatMessages.phase, INTERVIEW_PHASE)
      )
    );

  const parsed = messages.map((m) => ({
    ...m,
    choices: m.choices ? JSON.parse(m.choices) : null,
  }));

  return Response.json({ messages: parsed });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { message } = body as { message: string };

  const ws = await getWorkspace(getWsIdFromRequest(request));
  if (!ws) return Response.json({ error: "Workspace not configured" }, { status: 404 });

  const now = Date.now();

  // Save user message
  await db.insert(chatMessages).values({
    ticketId: interviewTicketId(ws.id),
    phase: INTERVIEW_PHASE,
    role: "user",
    content: message,
    createdAt: now,
  });

  // Load full conversation history
  const history = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.ticketId, interviewTicketId(ws.id)),
        eq(chatMessages.phase, INTERVIEW_PHASE)
      )
    );

  // Build messages for AI
  const aiMessages = history.map((m) => ({
    role: (m.role === "ai" ? "assistant" : "user") as "user" | "assistant",
    content: m.content,
  }));

  const kbRoot = getKbRoot(ws.id);
  const rawDir = path.join(kbRoot, "raw");

  // Load synthesis to get ambiguities — fall back to per-repo ambiguities if no synthesis
  const synthesis = loadSynthesis(rawDir);
  let ambiguities = synthesis?.ambiguities ?? [];
  if (ambiguities.length === 0) {
    const repoAnalyses = loadRepoAnalyses(kbRoot);
    ambiguities = Array.from(repoAnalyses.entries()).flatMap(
      ([name, a]) => (a.ambiguities ?? []).map((amb) => `[${name}] ${amb}`)
    );
  }
  const systemContext = buildSystemContext(synthesis, kbRoot);

  console.log(`[interview] ${ambiguities.length} ambiguities:`, ambiguities);
  console.log(`[interview] system context length: ${systemContext.length} chars`);

  const systemPrompt = ambiguities.length > 0
    ? `You are conducting a targeted follow-up interview about a software system. The codebase has already been fully analyzed. You know the architecture, tech stack, APIs, data model, and integrations — do NOT ask about any of those. You are ONLY here to resolve the specific gaps listed below.

## STRICT RULES

- You have EXACTLY ${ambiguities.length} gaps to ask about. Ask about one per message, then stop.
- Do NOT ask about anything outside this list. No warm-up questions. No "tell me about your system." No architecture, tech stack, team structure, compliance, pain points, or anything deducible from code.
- Ask ONE question at a time. Every message MUST end with: {"choices": ["Option A", "Option B", "Option C", "Other"]}
- Be concise: 1-2 sentences stating what the scan found, then the specific question.
- NEVER invent or fabricate names of services, classes, or entities. Only mention names that appear VERBATIM in the gap text or the system context below. If the gap doesn't name a specific service, don't invent one.
- After the last gap is resolved, say "I have a good understanding of the system now." with a brief summary. No choices in the final message.

## Gaps to resolve (ask about these IN ORDER)

${ambiguities.map((a, i) => `${i + 1}. ${a}`).join("\n")}

## What you already know (DO NOT ask about any of this)

${systemContext}

IMPORTANT: Every non-final message MUST end with a {"choices": [...]} JSON block.`
    : `You are reviewing the results of an automated codebase analysis. The scan found no unresolved ambiguities. Present a brief 3-4 sentence summary of the system based on the context below, then ask: "Does this look correct? Is there anything the scan missed or got wrong?"

End your message with: {"choices": ["Looks correct", "There are some things to correct", "Other"]}

If the user says it looks correct, respond with "I have a good understanding of the system now." and a one-line confirmation. No choices in the final message.
If the user has corrections, ask ONE follow-up about each correction (with choices), then conclude.

## System context

${systemContext}

IMPORTANT: Every non-final message MUST end with a {"choices": [...]} JSON block.`;

  // Stub responses for no-AI mode
  const userCount = history.filter((m) => m.role === "user").length;
  let stubResponse: string;
  if (ambiguities.length === 0) {
    stubResponse = userCount <= 1
      ? `The scan analyzed your system and found no unresolved gaps. Everything looks consistent across repos.\n\nDoes this look correct? Is there anything the scan missed or got wrong?\n\n{"choices": ["Looks correct", "There are some things to correct", "Other"]}`
      : `I have a good understanding of the system now. The automated analysis captured the system accurately.`;
  } else if (userCount <= ambiguities.length) {
    const gap = ambiguities[Math.min(userCount - 1, ambiguities.length - 1)];
    stubResponse = `The scan flagged this gap: ${gap}\n\nCan you clarify?\n\n{"choices": ["Yes, I can explain", "This is no longer relevant", "I'm not sure", "Other"]}`;
  } else {
    stubResponse = `I have a good understanding of the system now. All ${ambiguities.length} gaps from the code analysis have been addressed. This context will be incorporated into the knowledge base.`;
  }

  const aiResponse = await complete(aiMessages, {
    system: systemPrompt,
    maxTokens: 1024,
    stubResponse,
  });

  // Extract choices
  const { text: cleanText, choices } = extractChoices(aiResponse);
  const done = cleanText.toLowerCase().includes("good understanding of the system");

  // Save AI response
  await db.insert(chatMessages).values({
    ticketId: interviewTicketId(ws.id),
    phase: INTERVIEW_PHASE,
    role: "ai",
    content: cleanText,
    choices: choices.length > 0 ? JSON.stringify(choices) : null,
    createdAt: Date.now(),
  });

  // If done, save transcript, re-run synthesis with interview context, and recompile KB
  if (done) {
    const fullHistory = [...aiMessages, { role: "assistant" as const, content: cleanText }];
    const transcript = fullHistory
      .map((m) => `**${m.role === "user" ? "User" : "AI"}:** ${m.content}`)
      .join("\n\n---\n\n");

    await db.insert(interviewNotes).values({
      workspaceId: ws.id,
      transcript,
      createdAt: Date.now(),
    });

    fs.mkdirSync(rawDir, { recursive: true });
    fs.writeFileSync(
      path.join(rawDir, "interview-notes.json"),
      JSON.stringify({ transcript, messages: fullHistory }, null, 2),
      "utf8"
    );

    // Re-run synthesis and recompile KB in the background (don't block the response)
    (async () => {
      try {
        const repoAnalyses = loadRepoAnalyses(kbRoot);
        if (repoAnalyses.size > 0) {
          await runSynthesis(repoAnalyses, transcript, kbRoot);
        }
      } catch (err) {
        console.error("[interview] Re-synthesis failed:", err);
      }

      try {
        await compileKnowledgeBase(kbRoot);
      } catch (err) {
        console.error("[interview] KB recompilation failed:", err);
      }
    })();
  }

  return Response.json({ response: cleanText, choices, ready: done, done });
}

// ─── DELETE /api/kb/interview — reset interview state ─────────

export async function DELETE(request: Request) {
  const ws = await getWorkspace(getWsIdFromRequest(request));
  if (!ws) return Response.json({ error: "Workspace not configured" }, { status: 404 });

  const kbRoot = getKbRoot(ws.id);
  const notesPath = path.join(kbRoot, "raw", "interview-notes.json");

  // Remove file on disk
  if (fs.existsSync(notesPath)) fs.unlinkSync(notesPath);

  // Remove DB records
  await db.delete(interviewNotes).where(eq(interviewNotes.workspaceId, ws.id));
  await db.delete(chatMessages).where(
    and(
      eq(chatMessages.ticketId, interviewTicketId(ws.id)),
      eq(chatMessages.phase, INTERVIEW_PHASE),
    )
  );

  return Response.json({ ok: true });
}

// ─── Load synthesis from disk ──────────────────────────────────

function loadSynthesis(rawDir: string): SystemSynthesis | null {
  const synthPath = path.join(rawDir, "system-synthesis.json");
  if (!fs.existsSync(synthPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(synthPath, "utf8")) as SystemSynthesis;
  } catch {
    return null;
  }
}

// ─── Build system context string for the prompt ────────────────

function buildSystemContext(synthesis: SystemSynthesis | null, kbRoot?: string): string {
  const sections: string[] = [];

  if (synthesis) {
    if (synthesis.systemOverview) {
      sections.push(`### System Overview\n${synthesis.systemOverview}`);
    }
    if (synthesis.serviceMap?.length) {
      sections.push(`### Service Map\n${synthesis.serviceMap.map((s) =>
        `- **${s.repo}**: ${s.role} → communicates with: ${s.communicatesWith.join(", ") || "none"}`
      ).join("\n")}`);
    }
    if (synthesis.features?.length) {
      sections.push(`### Features\n${synthesis.features.map((f) =>
        `- **${f.name}**: ${f.description} (repos: ${f.repos.join(", ")})`
      ).join("\n")}`);
    }
    if (synthesis.dataFlows?.length) {
      sections.push(`### Data Flows\n${synthesis.dataFlows.map((d) =>
        `- **${d.name}**: ${d.description}`
      ).join("\n")}`);
    }
    if (synthesis.integrations?.length) {
      sections.push(`### Integrations\n${synthesis.integrations.map((i) =>
        `- **${i.system}** (${i.direction}, ${i.protocol}) — repos: ${i.repos.join(", ")}`
      ).join("\n")}`);
    }
    if (synthesis.dataModel?.length) {
      sections.push(`### Data Model\n${synthesis.dataModel.map((e) =>
        `- **${e.entity}**: ${e.description} (repos: ${e.repos.join(", ")})`
      ).join("\n")}`);
    }
  }

  // Fallback: if no synthesis, load per-repo analyses directly
  if (sections.length === 0) {
    const repoAnalyses = loadRepoAnalyses(kbRoot);
    if (repoAnalyses.size > 0) {
      const repoSections = Array.from(repoAnalyses.entries()).map(([name, a]) => {
        const parts = [`### ${name}`];
        if (a.purpose) parts.push(`Purpose: ${a.purpose}`);
        if (a.apis?.length) parts.push(`APIs: ${a.apis.map((api) => `${api.method} ${api.endpoint}`).join(", ")}`);
        if (a.dataEntities?.length) parts.push(`Entities: ${a.dataEntities.map((e) => e.name).join(", ")}`);
        if (a.businessFeatures?.length) parts.push(`Features: ${a.businessFeatures.join(", ")}`);
        if (a.dependencies?.length) parts.push(`Dependencies: ${a.dependencies.map((d) => `${d.target} (${d.type})`).join(", ")}`);
        if (a.integrations?.length) parts.push(`Integrations: ${a.integrations.map((i) => `${i.system} (${i.direction})`).join(", ")}`);
        if (a.techStack?.length) parts.push(`Tech: ${a.techStack.join(", ")}`);
        return parts.join("\n");
      });
      sections.push(`### Per-Repository Analysis\n\n${repoSections.join("\n\n")}`);
    }
  }

  return sections.join("\n\n");
}

// ─── Extract choices from AI response ──────────────────────────

function extractChoices(raw: string): { text: string; choices: string[] } {
  const jsonMatch = raw.match(/\n?\s*(\{[\s\S]*"choices"\s*:\s*\[[\s\S]*\][\s\S]*\})\s*$/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (Array.isArray(parsed.choices) && parsed.choices.length > 0) {
        const text = raw.slice(0, raw.lastIndexOf(jsonMatch[1])).trim();
        return { text, choices: parsed.choices };
      }
    } catch { /* fall through */ }
  }

  const fencedMatch = raw.match(/\n?\s*```json\s*\n(\{[\s\S]*"choices"\s*:\s*\[[\s\S]*\][\s\S]*\})\s*\n```\s*$/);
  if (fencedMatch) {
    try {
      const parsed = JSON.parse(fencedMatch[1]);
      if (Array.isArray(parsed.choices) && parsed.choices.length > 0) {
        const text = raw.slice(0, raw.lastIndexOf("```json")).trim();
        return { text, choices: parsed.choices };
      }
    } catch { /* fall through */ }
  }

  return { text: raw, choices: [] };
}
