// POST /api/kb/chat — KB Q&A chat using Claude CLI streaming with read-only tools.
// GET  /api/kb/chat — list sessions, load session messages, or poll streaming status.

import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { kbChatSessions, kbChatMessages } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { claudeExecStreaming, isClaudeCliAvailable } from "@/lib/claude-cli";
import { complete } from "@/lib/anthropic";
import { getKbRoot } from "@/lib/kb-path";
import { getWorkspace } from "@/lib/db/helpers";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

interface ToolEvent {
  toolName: string;
  summary: string;
  timestamp: number;
}

const streamingState = new Map<string, {
  label: string;
  tool: string;
  updatedAt: number;
  toolEvents: ToolEvent[];
  thinkingText: string;
}>();

// ─── GET handler ─────────────────────────────────────────────────

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const wsId = url.searchParams.get("wsId");

  // Streaming status polling
  if (action === "streaming-status") {
    const sessionKey = url.searchParams.get("sessionKey");
    if (sessionKey) {
      const status = streamingState.get(sessionKey);
      return Response.json(status ?? { label: "Thinking...", tool: "", updatedAt: 0, toolEvents: [], thinkingText: "" });
    }
    return Response.json({ error: "Missing sessionKey" }, { status: 400 });
  }

  // Load messages for a specific session
  const sessionIdParam = url.searchParams.get("sessionId");
  if (sessionIdParam) {
    const sessionId = parseInt(sessionIdParam, 10);
    const messages = await db
      .select()
      .from(kbChatMessages)
      .where(eq(kbChatMessages.sessionId, sessionId));
    return Response.json({ messages });
  }

  // List sessions for workspace
  if (wsId) {
    const sessions = await db
      .select({
        id: kbChatSessions.id,
        name: kbChatSessions.name,
        createdAt: kbChatSessions.createdAt,
        updatedAt: kbChatSessions.updatedAt,
      })
      .from(kbChatSessions)
      .where(eq(kbChatSessions.workspaceId, parseInt(wsId, 10)))
      .orderBy(desc(kbChatSessions.updatedAt));
    return Response.json({ sessions });
  }

  return Response.json({ error: "Provide wsId or sessionId" }, { status: 400 });
}

// ─── POST handler ────────────────────────────────────────────────

export async function POST(request: Request) {
  const body = await request.json();
  const { message, wsId, sessionId: clientSessionId } = body as {
    message: string;
    wsId: number;
    sessionId?: number;
  };

  if (!message?.trim()) {
    return Response.json({ error: "Empty message" }, { status: 400 });
  }

  const ws = await getWorkspace(wsId);
  if (!ws) return Response.json({ error: "Workspace not found" }, { status: 404 });

  const kbRoot = getKbRoot(ws.id);
  if (!fs.existsSync(kbRoot)) {
    return Response.json({ error: "No knowledge base found for this workspace. Run a scan first." }, { status: 404 });
  }

  const now = Date.now();
  let dbSessionId: number;
  let cliSessionId: string | undefined;
  let isFirstTurn: boolean;

  if (clientSessionId) {
    // Existing session
    dbSessionId = clientSessionId;
    const [session] = await db.select().from(kbChatSessions).where(eq(kbChatSessions.id, dbSessionId));
    if (!session) return Response.json({ error: "Session not found" }, { status: 404 });
    cliSessionId = session.cliSessionId ?? undefined;
    isFirstTurn = !cliSessionId;
  } else {
    // New session — name from first message
    const name = message.trim().slice(0, 60);
    const [inserted] = await db.insert(kbChatSessions).values({
      workspaceId: ws.id,
      name,
      createdAt: now,
      updatedAt: now,
    }).returning({ id: kbChatSessions.id });
    dbSessionId = inserted.id;
    isFirstTurn = true;
  }

  // Save user message
  await db.insert(kbChatMessages).values({
    sessionId: dbSessionId,
    role: "user",
    content: message,
    createdAt: now,
  });

  const streamKey = cliSessionId ?? randomUUID();
  const toolEvents: ToolEvent[] = [];
  let responseText: string;

  if (isClaudeCliAvailable()) {
    streamingState.set(streamKey, { label: "Starting...", tool: "", updatedAt: Date.now(), toolEvents: [], thinkingText: "" });

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
      }

      const event: ToolEvent = { toolName, summary, timestamp: Date.now() };
      toolEvents.push(event);

      const state = streamingState.get(streamKey);
      if (state) {
        state.label = summary + "...";
        state.tool = toolName;
        state.updatedAt = Date.now();
        state.toolEvents = [...toolEvents];
      }
    };

    const onText = (text: string) => {
      const state = streamingState.get(streamKey);
      if (state) {
        state.thinkingText = text;
        state.label = "Composing response...";
        state.updatedAt = Date.now();
      }
    };

    try {
      const systemPrompt = isFirstTurn ? buildKBChatSystemPrompt(kbRoot) : undefined;
      const newCliSessionId = isFirstTurn ? randomUUID() : undefined;

      const streamResult = await claudeExecStreaming(message, {
        addDirs: [kbRoot],
        model: "sonnet",
        maxBudget: 1.00,
        allowedTools: ["Read", "Grep", "Glob"],
        timeoutMs: 120_000,
        ...(isFirstTurn
          ? { sessionId: newCliSessionId, systemPrompt }
          : { resumeSessionId: cliSessionId! }),
        onToolUse,
        onText,
      });

      responseText = streamResult.result as string;
      const finalCliSessionId = streamResult.sessionId ?? newCliSessionId;

      // Persist CLI session ID
      if (finalCliSessionId) {
        await db.update(kbChatSessions).set({
          cliSessionId: finalCliSessionId,
          updatedAt: Date.now(),
        }).where(eq(kbChatSessions.id, dbSessionId));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[kb/chat] Claude CLI failed:", msg);
      responseText = `Error exploring KB: ${msg.slice(0, 200)}. Try rephrasing.`;
    } finally {
      streamingState.delete(streamKey);
    }
  } else {
    // Fallback: direct API without tool access
    const indexContent = loadFileIfExists(path.join(kbRoot, "wiki", "INDEX.md"));
    const claudeMd = loadFileIfExists(path.join(kbRoot, "CLAUDE.md"));
    const systemPrompt = `You are a knowledge base assistant. Answer questions about the system based on this documentation.\n\n${claudeMd}\n\n## Wiki Index\n${indexContent}`;

    responseText = await complete(
      [{ role: "user", content: message }],
      { system: systemPrompt, maxTokens: 2048 }
    );
  }

  // Save AI response
  await db.insert(kbChatMessages).values({
    sessionId: dbSessionId,
    role: "ai",
    content: responseText,
    toolEvents: toolEvents.length > 0 ? JSON.stringify(toolEvents) : null,
    createdAt: Date.now(),
  });

  // Update session timestamp
  await db.update(kbChatSessions).set({ updatedAt: Date.now() }).where(eq(kbChatSessions.id, dbSessionId));

  return Response.json({
    response: responseText,
    sessionId: dbSessionId,
    streamKey,
    toolEvents,
  });
}

// ─── System prompt ───────────────────────────────────────────────

function buildKBChatSystemPrompt(kbRoot: string): string {
  const claudeMd = loadFileIfExists(path.join(kbRoot, "CLAUDE.md"));
  const indexMd = loadFileIfExists(path.join(kbRoot, "wiki", "INDEX.md"));

  return `You are a knowledgeable assistant for a software system. Your job is to answer questions accurately using the knowledge base files available to you.

## KB Overview

${claudeMd}

## Wiki Index

${indexMd}

## How to Answer

1. Use Read, Grep, Glob tools to find relevant KB files before answering.
2. Base answers on KB content — cite specific files when relevant.
3. If the KB doesn't cover a topic, say so clearly.
4. Be concise and direct. No fluff.
5. When data lends itself to tabular display, use markdown tables.
6. For architectural questions, check wiki/architecture/ first.
7. For feature questions, check wiki/features/ first.
8. For repo-specific questions, check wiki/repos/ first.
9. For integration questions, check wiki/integrations/ first.`;
}

function loadFileIfExists(filePath: string): string {
  try {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, "utf8");
  } catch { /* skip */ }
  return "(not available)";
}
