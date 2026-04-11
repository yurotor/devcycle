// POST /api/tickets/:id/chat — send a message, get AI response
// GET  /api/tickets/:id/chat — load chat history

import { db } from "@/lib/db";
import { chatMessages, tickets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { complete, isAIAvailable } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.ticketId, ticketId));

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
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const systemPrompt = phase === "analyze"
    ? `You are a business analyst helping clarify requirements for ticket "${ticket.jiraKey}: ${ticket.title}".
Ask focused questions to understand scope, edge cases, and acceptance criteria.
When you have enough detail, say "I think we have enough detail to move to planning."
Keep responses concise (2-3 paragraphs max).`
    : `You are a technical architect helping create a PRD for ticket "${ticket.jiraKey}: ${ticket.title}".
Ask about architecture decisions, affected services, API changes, data model impacts, and risks.
Keep responses concise and technical.`;

  // Stub responses for when no API is available
  const stubResponses = phase === "analyze"
    ? [
        "Thanks for the context. A few clarifying questions:\n\n1. What's the expected volume/scale for this feature?\n2. Are there any existing services this needs to integrate with?\n3. What are the key acceptance criteria from the business side?",
        "That helps. Let me dig a bit deeper:\n\n1. How should error cases be handled — retry, fail silently, or alert?\n2. Is there a timeline or dependency on other work?\n3. Any security or compliance considerations?",
        "I think we have enough detail to move to planning. Here's what I've captured:\n\n- Scope and requirements are clear\n- Integration points identified\n- Error handling strategy defined\n- No blocking dependencies\n\nYou can advance to the Plan phase when ready.",
      ]
    : [
        "Let's work through the technical design. A few questions:\n\n1. Which repos/services will need changes?\n2. Any database schema changes needed?\n3. Do we need new API endpoints or modifications to existing ones?",
        "Good. Regarding the architecture:\n\n1. What's the deployment strategy — can this be feature-flagged?\n2. Any performance concerns or SLA requirements?\n3. How should we handle backward compatibility?",
        "I have enough to draft the PRD. The key decisions are captured. You can generate the PRD when ready.",
      ];

  const stubIndex = Math.min(
    Math.floor(history.filter((m) => m.role === "user").length / 1),
    stubResponses.length - 1
  );

  const aiResponse = await complete(aiMessages, {
    system: systemPrompt,
    maxTokens: 1024,
    stubResponse: stubResponses[stubIndex],
  });

  // Detect readiness to advance
  const ready = aiResponse.toLowerCase().includes("enough detail") ||
    aiResponse.toLowerCase().includes("enough to move") ||
    aiResponse.toLowerCase().includes("enough to draft");

  // Save AI response
  await db.insert(chatMessages).values({
    ticketId,
    phase,
    role: "ai",
    content: aiResponse,
    createdAt: Date.now(),
  });

  return Response.json({ response: aiResponse, ready });
}
