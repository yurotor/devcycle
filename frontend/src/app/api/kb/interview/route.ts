// POST /api/kb/interview — system-level interview chat with choices
// GET  /api/kb/interview — load interview history

import { db } from "@/lib/db";
import { interviewNotes, chatMessages, workspace } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { complete, isAIAvailable } from "@/lib/anthropic";
import { compileKnowledgeBase } from "@/lib/scan/kb-manager";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const KB_ROOT = path.join(process.cwd(), "..", "kb");
const RAW_DIR = path.join(KB_ROOT, "raw");

// We use ticketId=0, phase="interview" to store interview messages in chat_messages table
const INTERVIEW_TICKET_ID = 0;
const INTERVIEW_PHASE = "interview";

export async function GET() {
  // Load interview messages from chat_messages
  const messages = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.ticketId, INTERVIEW_TICKET_ID),
        eq(chatMessages.phase, INTERVIEW_PHASE)
      )
    );

  // Parse choices from JSON strings
  const parsed = messages.map((m) => ({
    ...m,
    choices: m.choices ? JSON.parse(m.choices) : null,
  }));

  return Response.json({ messages: parsed });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { message } = body as { message: string };

  const [ws] = await db.select().from(workspace).limit(1);
  if (!ws) return Response.json({ error: "Workspace not configured" }, { status: 404 });

  const now = Date.now();

  // Save user message
  await db.insert(chatMessages).values({
    ticketId: INTERVIEW_TICKET_ID,
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
        eq(chatMessages.ticketId, INTERVIEW_TICKET_ID),
        eq(chatMessages.phase, INTERVIEW_PHASE)
      )
    );

  // Build messages for AI
  const aiMessages = history.map((m) => ({
    role: (m.role === "ai" ? "assistant" : "user") as "user" | "assistant",
    content: m.content,
  }));

  // Load KB context from per-repo analysis files
  const systemContext = loadKBContext();

  const systemPrompt = `You are an expert system analyst conducting a deep-dive interview about a software system. Your goal is to extract knowledge that cannot be learned from code alone.

## Your approach

1. **Ask ONE question at a time.** Never ask multiple questions in one message.
2. **Always provide answer choices.** At the end of every question, include a JSON block:
   {"choices": ["Option A", "Option B", "Option C", "Other"]}
   The last option should always be "Other" for free text. Make options specific to this system.
3. **Cover these areas in order:**
   - Business context: Who are the users? What business processes does this support?
   - Team structure: Who owns which components? How is the team organized?
   - Deployment topology: What environments exist? How is the system deployed?
   - Data sensitivity: Is there PII? What compliance requirements exist?
   - Known tech debt: What are the known pain points?
   - Integration details: Manual processes, vendor relationships, SLAs
   - Domain knowledge: Business rules, edge cases, seasonal patterns
4. **Be concise.** 2-3 sentences per question plus choices.
5. **When you have enough context** (after 5-8 exchanges), say "I have a good understanding of the system now." followed by a summary. Do NOT include choices in the final message.

${systemContext ? `\n## Context from automated code analysis\n\nUse this context to ask informed, specific questions. Reference repos, APIs, entities, and features you see below. Do NOT ask generic questions that can be answered from this context — instead, ask about what the context does NOT reveal (business rules, team ownership, deployment details, compliance).\n\n${systemContext}` : ""}

IMPORTANT: Every non-final message MUST end with a {"choices": [...]} JSON block.`;

  const stubResponses = [
    `Thanks for starting this interview. Let me ask about the business context first.\n\nWho are the primary users of this system?\n\n{"choices": ["Internal operations team", "External customers / borrowers", "Both internal and external users", "Partner banks / financial institutions", "Other"]}`,
    `That's helpful. How is the team structured around this codebase?\n\n{"choices": ["Single team owns everything", "Split by frontend/backend", "Split by domain (lending, servicing, etc.)", "Multiple independent squads", "Other"]}`,
    `Good to know. What environments does this system run in?\n\n{"choices": ["Dev + Prod only", "Dev + Staging + Prod", "Dev + QA + Staging + Prod", "Per-developer environments + shared staging + prod", "Other"]}`,
    `Important question about data: does this system handle any PII or regulated data?\n\n{"choices": ["Yes, financial PII (SSN, bank accounts)", "Yes, basic PII (names, emails, addresses)", "No PII, only business data", "Yes, and we have specific compliance requirements (SOC2, PCI, etc.)", "Other"]}`,
    `What are the biggest pain points or tech debt items the team is currently aware of?\n\n{"choices": ["Legacy code that's hard to maintain", "Missing test coverage", "Performance bottlenecks", "Deployment complexity", "Documentation gaps", "Other"]}`,
    `I have a good understanding of the system now. Here's a summary of what I learned:\n\n- Business context and user base identified\n- Team structure and ownership mapped\n- Deployment and compliance requirements documented\n- Key integrations and pain points captured\n\nThis context will be incorporated into the knowledge base to enrich the documentation.`,
  ];

  const userCount = history.filter((m) => m.role === "user").length;
  const stubIndex = Math.min(userCount - 1, stubResponses.length - 1);

  const aiResponse = await complete(aiMessages, {
    system: systemPrompt,
    maxTokens: 1024,
    stubResponse: stubResponses[Math.max(0, stubIndex)],
  });

  // Extract choices
  const { text: cleanText, choices } = extractChoices(aiResponse);
  const done = cleanText.toLowerCase().includes("good understanding of the system");

  // Save AI response
  await db.insert(chatMessages).values({
    ticketId: INTERVIEW_TICKET_ID,
    phase: INTERVIEW_PHASE,
    role: "ai",
    content: cleanText,
    choices: choices.length > 0 ? JSON.stringify(choices) : null,
    createdAt: Date.now(),
  });

  // If done, save transcript and recompile KB
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

    fs.mkdirSync(RAW_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(RAW_DIR, "interview-notes.json"),
      JSON.stringify({ transcript, messages: fullHistory }, null, 2),
      "utf8"
    );

    try {
      await compileKnowledgeBase();
    } catch (err) {
      console.error("[interview] KB recompilation failed:", err);
    }
  }

  return Response.json({ response: cleanText, choices, ready: done, done });
}

// ─── KB context loader ──────────────────────────────────────────

function loadKBContext(): string {
  const sections: string[] = [];

  // Try system synthesis first
  const synthPath = path.join(RAW_DIR, "system-synthesis.json");
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
    } catch { /* skip */ }
  }

  // Load per-repo analysis files
  if (fs.existsSync(RAW_DIR)) {
    const repoDetails: string[] = [];
    for (const entry of fs.readdirSync(RAW_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const analysisPath = path.join(RAW_DIR, entry.name, "analysis.json");
      if (fs.existsSync(analysisPath)) {
        try {
          const analysis = JSON.parse(fs.readFileSync(analysisPath, "utf8"));
          const parts: string[] = [];
          parts.push(`### ${entry.name}`);
          if (analysis.purpose) parts.push(`Purpose: ${analysis.purpose}`);
          if (analysis.apis?.length) {
            parts.push(`APIs: ${analysis.apis.map((a: { method: string; path: string }) => `${a.method} ${a.path}`).join(", ")}`);
          }
          if (analysis.entities?.length) {
            parts.push(`Entities: ${analysis.entities.map((e: { name: string }) => e.name).join(", ")}`);
          }
          if (analysis.features?.length) {
            parts.push(`Features: ${analysis.features.map((f: { name: string }) => f.name).join(", ")}`);
          }
          if (analysis.dependencies?.length) {
            parts.push(`Dependencies: ${analysis.dependencies.join(", ")}`);
          }
          if (analysis.techStack?.length) {
            parts.push(`Tech stack: ${analysis.techStack.join(", ")}`);
          }
          repoDetails.push(parts.join("\n"));
        } catch { /* skip */ }
      }
    }
    if (repoDetails.length) {
      sections.push(`## Repository Analysis\n\n${repoDetails.join("\n\n")}`);
    }
  }

  return sections.length > 0 ? sections.join("\n\n") : "";
}

// ─── Extract choices from AI response ───────────────────────────

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
