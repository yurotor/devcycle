// POST /api/kb/chat — KB Q&A chat with retrieval-based wiki context.
// GET  /api/kb/chat — list sessions, load session messages.

import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { kbChatSessions, kbChatMessages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { claudeExecStreaming, isClaudeCliAvailable } from "@/lib/claude-cli";
import { getKbRoot } from "@/lib/kb-path";
import { getWorkspace } from "@/lib/db/helpers";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// ─── GET handler ─────────────────────────────────────────────────

export async function GET(request: Request) {
  const url = new URL(request.url);
  const wsId = url.searchParams.get("wsId");

  const sessionIdParam = url.searchParams.get("sessionId");
  if (sessionIdParam) {
    const sessionId = parseInt(sessionIdParam, 10);
    const messages = await db
      .select()
      .from(kbChatMessages)
      .where(eq(kbChatMessages.sessionId, sessionId));
    return Response.json({ messages });
  }

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

// ─── Retrieval: pick relevant wiki pages ─────────────────────────

function retrieveRelevantPages(kbRoot: string, question: string): string[] {
  const indexMd = loadFileIfExists(path.join(kbRoot, "wiki", "INDEX.md"));

  // Parse INDEX.md into entries: { title, path }
  const entries: { title: string; path: string }[] = [];
  for (const line of indexMd.split("\n")) {
    const m = line.match(/^- \[(.+?)\]\((.+?\.md)\)/);
    if (m) entries.push({ title: m[1].toLowerCase(), path: m[2] });
  }

  // Tokenize question into keywords, drop common stop words
  const stopWords = new Set(["a","an","the","is","are","was","were","be","been","how","do","does","did","to","of","in","for","on","with","at","by","from","what","which","who","when","where","why","can","could","would","should","i","we","it","this","that","my","our","its"]);
  const keywords = question.toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  // Score each entry by keyword matches in title
  const scored = entries.map((e) => {
    const score = keywords.filter((kw) => e.title.includes(kw)).length;
    return { ...e, score };
  });

  // Always include architecture overview + data model as baseline context
  const alwaysInclude = new Set(["architecture/system-overview.md", "data-model/entities.md"]);
  const baseline = scored.filter((e) => alwaysInclude.has(e.path));
  const matched = scored
    .filter((e) => e.score > 0 && !alwaysInclude.has(e.path))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const results = [...baseline, ...matched].map((e) => e.path);
  return results.length > 0 ? results : scored.slice(0, 3).map((e) => e.path);
}

function loadRetrievedPages(kbRoot: string, pagePaths: string[]): string {
  const wikiDir = path.join(kbRoot, "wiki");
  const sections: string[] = [];
  for (const rel of pagePaths) {
    const full = path.join(wikiDir, rel);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, "utf8").trim();
    if (content) sections.push(`### ${rel}\n\n${content}`);
  }
  return sections.join("\n\n---\n\n");
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

  if (!isClaudeCliAvailable()) {
    return Response.json({ error: "Claude CLI not available" }, { status: 503 });
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
    dbSessionId = clientSessionId;
    const [session] = await db.select().from(kbChatSessions).where(eq(kbChatSessions.id, dbSessionId));
    if (!session) return Response.json({ error: "Session not found" }, { status: 404 });
    cliSessionId = session.cliSessionId ?? undefined;
    isFirstTurn = !cliSessionId;
  } else {
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

  await db.insert(kbChatMessages).values({
    sessionId: dbSessionId,
    role: "user",
    content: message,
    createdAt: now,
  });

  let responseText: string;

  try {
    // Step 1: Retrieve relevant wiki pages
    const pagePaths = retrieveRelevantPages(kbRoot, message);
    console.log(`[kb/chat] Retrieved ${pagePaths.length} pages:`, pagePaths);
    const retrievedContent = loadRetrievedPages(kbRoot, pagePaths);

    // Step 2: Chat via CLI with only relevant pages
    let prompt: string;
    let systemPrompt: string | undefined;
    const newCliSessionId = isFirstTurn ? randomUUID() : undefined;

    if (isFirstTurn) {
      systemPrompt = buildKBChatSystemPrompt(retrievedContent);
      prompt = message;
    } else {
      prompt = retrievedContent
        ? `[Reference material for this question]\n---\n${retrievedContent}\n---\n\n${message}`
        : message;
    }

    const streamResult = await claudeExecStreaming(prompt, {
      model: "sonnet",
      maxBudget: 1.00,
      allowedTools: [],
      timeoutMs: 120_000,
      ...(isFirstTurn
        ? { sessionId: newCliSessionId, systemPrompt }
        : { resumeSessionId: cliSessionId! }),
    });

    responseText = streamResult.result as string;
    const finalCliSessionId = streamResult.sessionId ?? newCliSessionId;

    if (finalCliSessionId) {
      await db.update(kbChatSessions).set({
        cliSessionId: finalCliSessionId,
        updatedAt: Date.now(),
      }).where(eq(kbChatSessions.id, dbSessionId));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[kb/chat] Claude CLI failed:", msg);
    responseText = `Error: ${msg.slice(0, 200)}. Try rephrasing.`;
  }

  await db.insert(kbChatMessages).values({
    sessionId: dbSessionId,
    role: "ai",
    content: responseText,
    createdAt: Date.now(),
  });

  await db.update(kbChatSessions).set({ updatedAt: Date.now() }).where(eq(kbChatSessions.id, dbSessionId));

  return Response.json({
    response: responseText,
    sessionId: dbSessionId,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────

function buildKBChatSystemPrompt(retrievedContent: string): string {
  return `You are a knowledgeable assistant for a software system. Answer questions accurately using the knowledge base below.

## Relevant Knowledge Base Pages

${retrievedContent || "(no relevant pages found)"}

## How to Answer

1. Base answers on KB content — cite specific files when relevant.
2. If the KB doesn't cover a topic, say so clearly.
3. Be concise and direct. No fluff.
4. When data lends itself to tabular display, use markdown tables.`;
}

function loadFileIfExists(filePath: string): string {
  try {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, "utf8");
  } catch { /* skip */ }
  return "(not available)";
}
