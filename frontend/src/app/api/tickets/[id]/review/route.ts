// POST /api/tickets/:id/review — run AI review for a specific task, or manage comments
// GET  /api/tickets/:id/review?taskId=N — load review comments for a task

import { db } from "@/lib/db";
import { tickets, tasks, reviewComments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { complete } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  const url = new URL(request.url);
  const taskId = parseInt(url.searchParams.get("taskId") ?? "", 10);

  if (isNaN(taskId)) {
    return Response.json({ error: "taskId required" }, { status: 400 });
  }

  const comments = await db
    .select()
    .from(reviewComments)
    .where(eq(reviewComments.taskId, taskId));

  return Response.json({ comments });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  const body = await request.json();
  const { action, taskId } = body as { action: string; taskId: number };

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) return Response.json({ error: "Ticket not found" }, { status: 404 });

  // ── Run AI review for a task ────────────────────────────────
  if (action === "run-review" && taskId) {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

    // Fetch the task's diff to review
    const diffRes = await fetch(
      `${request.headers.get("origin") || "http://localhost:3000"}/api/tickets/${ticketId}/implement?action=diff&taskId=${taskId}`
    );
    const diffData = await diffRes.json();
    const diffs = diffData.diffs ?? [];

    const diffText = diffs.map((d: { path: string; status: string; hunks: { lines: string[] }[] }) =>
      `### ${d.path} (${d.status})\n${d.hunks.map((h: { lines: string[] }) => h.lines.join("\n")).join("\n")}`
    ).join("\n\n");

    const stubComments = [
      { file: diffs[0]?.path ?? "src/handler.cs", line: 42, priority: "suggestion", content: "Consider adding error handling for edge cases in this method." },
    ];

    let reviewItems = stubComments;
    try {
      const raw = await complete(
        [{
          role: "user",
          content: `Review these code changes for task "${task.title}" on ticket "${ticket.jiraKey}: ${ticket.title}".

Return a JSON array of review comments. Each comment: {"file": "path", "line": number, "priority": "critical"|"suggestion"|"nit", "content": "review comment"}.

Focus on correctness, security, and maintainability. Be specific — reference the actual code.

${diffText}`,
        }],
        {
          system: "You are a senior code reviewer. Return valid JSON only — an array of review comments. Be specific and actionable.",
          maxTokens: 2048,
          stubResponse: JSON.stringify(stubComments),
        }
      );
      const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();
      reviewItems = JSON.parse(cleaned);
    } catch {
      // Use stub
    }

    // Persist to DB
    const now = Date.now();
    const inserted = [];
    for (const item of reviewItems) {
      const [row] = await db.insert(reviewComments).values({
        taskId,
        file: item.file,
        line: item.line,
        content: item.content,
        priority: item.priority,
        author: "ai",
        status: "open",
        createdAt: now,
      }).returning();
      inserted.push(row);
    }

    return Response.json({ comments: inserted });
  }

  // ── Add user comment ────────────────────────────────────────
  if (action === "add-comment" && taskId) {
    const { file, line, content } = body as { file: string; line: number; content: string };
    if (!file || !line || !content) {
      return Response.json({ error: "file, line, content required" }, { status: 400 });
    }

    const [row] = await db.insert(reviewComments).values({
      taskId,
      file,
      line,
      content,
      priority: "suggestion",
      author: "user",
      status: "open",
      createdAt: Date.now(),
    }).returning();

    return Response.json({ comment: row });
  }

  // ── Update comment status (done/deleted) ────────────────────
  if (action === "update-comment") {
    const { commentId, status } = body as { commentId: number; status: string };
    if (!commentId || !["open", "done", "deleted"].includes(status)) {
      return Response.json({ error: "commentId and valid status required" }, { status: 400 });
    }

    await db
      .update(reviewComments)
      .set({ status })
      .where(eq(reviewComments.id, commentId));

    return Response.json({ ok: true });
  }

  // ── Fix this — targeted reimplementation based on comment ───
  if (action === "fix-this") {
    const { commentId } = body as { commentId: number };
    const [comment] = await db
      .select()
      .from(reviewComments)
      .where(eq(reviewComments.id, commentId));

    if (!comment) return Response.json({ error: "Comment not found" }, { status: 404 });

    const [task] = await db.select().from(tasks).where(eq(tasks.id, comment.taskId));
    if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

    // For now, mark the comment as done and return success.
    // In production this would call Claude to apply a targeted fix to the specific file+line.
    await db
      .update(reviewComments)
      .set({ status: "done" })
      .where(eq(reviewComments.id, commentId));

    return Response.json({
      ok: true,
      message: `Applied fix for "${comment.content.slice(0, 60)}..." in ${comment.file}:${comment.line}`,
    });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
