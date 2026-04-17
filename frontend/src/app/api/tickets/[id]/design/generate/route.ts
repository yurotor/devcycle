// POST /api/tickets/:id/design/generate — generate per-repo task breakdown
// Groups all changes by repository, with concrete todo items for each repo.

import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { tickets, tasks, repos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { claudeExec, isClaudeCliAvailable } from "@/lib/claude-cli";
import { complete } from "@/lib/anthropic";

import { getKbRoot, getKbBase } from "@/lib/kb-path";
const REPOS_DIR = path.join(getKbBase(), "repos");
const SKILLS_DIR = path.join(process.cwd(), "..", ".claude", "skills");

function loadSkillPrompt(skillName: string): string {
  const skillPath = path.join(SKILLS_DIR, skillName, "SKILL.md");
  if (fs.existsSync(skillPath)) {
    const raw = fs.readFileSync(skillPath, "utf8");
    return raw.replace(/^---[\s\S]*?---\s*/, "").trim();
  }
  return "";
}

function buildSystemPrompt(): string {
  const prdToIssues = loadSkillPrompt("prd-to-issues");

  return `You are a senior technical architect breaking a PRD into implementation tasks grouped by repository.

${prdToIssues ? `## Skill Reference (prd-to-issues)\n\n${prdToIssues}\n` : ""}

## Task Breakdown Rules

- Group all changes by repository — one task per repo
- Each task must include concrete todo items describing the specific code changes required
- Every task must include at least one code change. Do not create tasks for documentation, planning, or review.
- Task descriptions should be detailed enough to start implementing immediately
- Reference actual entities, endpoints, patterns, and files from the PRD and codebase
- Each todo item should be a discrete, actionable unit of work (e.g. "Add migration for X table", "Create endpoint POST /api/foo")
- Order tasks by dependency — foundational repos first, then consumers`;
}

interface GeneratedTodo {
  title: string;
  description: string;
}

interface GeneratedTask {
  title: string;
  subtitle?: string;
  description: string;
  repo: string;
  todos: GeneratedTodo[];
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) return Response.json({ error: "Ticket not found" }, { status: 404 });

  const kbRoot = getKbRoot(ticket.workspaceId);
  const now = Date.now();

  // Load PRD content
  let prdContent = "";
  if (ticket.prdPath) {
    const fullPath = path.join(kbRoot, ticket.prdPath);
    if (fs.existsSync(fullPath)) {
      try { prdContent = fs.readFileSync(fullPath, "utf8"); } catch { /* skip */ }
    }
  }

  // Load repos
  const repoRows = await db.select().from(repos).where(eq(repos.workspaceId, ticket.workspaceId));
  const repoNames = repoRows.map((r) => r.name);

  // Load service map + data model from synthesis
  let serviceContext = "";
  const synthPath = path.join(kbRoot, "raw", "system-synthesis.json");
  if (fs.existsSync(synthPath)) {
    try {
      const synth = JSON.parse(fs.readFileSync(synthPath, "utf8"));
      const parts: string[] = [];
      if (synth.serviceMap?.length) {
        parts.push("### Service Map\n" + synth.serviceMap
          .map((s: { repo: string; role: string; communicatesWith?: string[] }) =>
            `- **${s.repo}**: ${s.role}${s.communicatesWith?.length ? ` → ${s.communicatesWith.join(", ")}` : ""}`)
          .join("\n"));
      }
      if (synth.dataModel?.length) {
        parts.push("### Data Model\n" + synth.dataModel
          .map((e: { entity: string; description: string; repos?: string[] }) =>
            `- **${e.entity}**: ${e.description}${e.repos?.length ? ` (${e.repos.join(", ")})` : ""}`)
          .join("\n"));
      }
      if (synth.architecturePatterns?.length) {
        parts.push("### Architecture Patterns\n" + synth.architecturePatterns
          .map((p: { pattern: string; description: string }) => `- **${p.pattern}**: ${p.description}`)
          .join("\n"));
      }
      serviceContext = parts.join("\n\n");
    } catch { /* skip */ }
  }

  const userContent = `Break this PRD into implementation tasks grouped by repository — one task per repo.

## Ticket
**${ticket.jiraKey}: ${ticket.title}**
${ticket.description ? `\n${ticket.description}` : ""}

## PRD
${prdContent || "(No PRD generated yet — break down based on the ticket description.)"}

## Available Repositories
${repoNames.length > 0 ? repoNames.map((r) => `- ${r}`).join("\n") : "(no repos scanned yet)"}

${serviceContext ? `## Codebase Context\n${serviceContext}` : ""}

## Output Format
Return valid JSON only — a flat array of tasks. Each task has one repo, a title, subtitle, description, and a todos array of concrete code changes:
[{"title": "...", "subtitle": "Short one-liner description", "description": "Detailed implementation instructions...", "repo": "exact-repo-name", "todos": [{"title": "Add X migration", "description": "Create migration to add column Y to table Z"}]}]

Every task must include at least one todo. Do not create tasks for documentation, planning, or review — only tasks with real code changes.`;

  // Stub — only used when AI is unavailable
  const stubTasks: GeneratedTask[] = repoNames.length > 0
    ? [{
        title: `Implement ${ticket.title}`,
        subtitle: `Changes for ${repoNames[0]}`,
        description: ticket.description || "Implement the ticket requirements",
        repo: repoNames[0],
        todos: [{ title: "Implement changes", description: "Implement the ticket requirements" }],
      }]
    : [{
        title: `Implement ${ticket.title}`,
        subtitle: "Changes for backend",
        description: ticket.description || "Implement the ticket requirements",
        repo: "backend",
        todos: [{ title: "Implement changes", description: "Implement the ticket requirements" }],
      }];

  let taskData: GeneratedTask[] = stubTasks;
  try {
    let raw: string;

    const systemPrompt = buildSystemPrompt();

    if (isClaudeCliAvailable()) {
      // Claude CLI can explore repos for context
      const repoDirs = repoRows
        .map((r) => path.join(REPOS_DIR, r.name))
        .filter((d) => fs.existsSync(d));
      const addDirs = [kbRoot, ...repoDirs];

      raw = await claudeExec(userContent, {
        addDirs,
        model: "sonnet",
        maxBudget: 1.00,
        timeoutMs: 300_000,
        systemPrompt,
      });
    } else {
      raw = await complete(
        [{ role: "user", content: userContent }],
        { system: systemPrompt, maxTokens: 2048, stubResponse: JSON.stringify(stubTasks) }
      );
    }

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      taskData = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.error("[design/generate] Task breakdown failed:", err instanceof Error ? err.message : err);
    // Use stub
  }

  // Clear existing tasks for this ticket
  await db.delete(tasks).where(eq(tasks.ticketId, ticketId));

  // Save tasks to DB
  const result: Array<Record<string, unknown>> = [];
  for (const t of taskData) {
    // Skip tasks with no todos
    if (!t.todos || t.todos.length === 0) continue;

    const repoName = (t.repo ?? "").toLowerCase();
    const matchedRepo = repoRows.find((r) =>
      r.name.toLowerCase() === repoName ||
      r.name.toLowerCase().includes(repoName) ||
      repoName.includes(r.name.toLowerCase())
    );

    // Append "Run all unit tests" to every non-e2e task so CI failures are caught locally first
    const isE2e = /e2e|end.to.end/i.test(t.title) || /e2e/i.test(t.repo ?? "");
    const todos = t.todos.map((todo) => ({ title: todo.title, description: todo.description, done: false }));
    if (!isE2e && !todos.some((td) => /run.*unit\s*test/i.test(td.title))) {
      todos.push({ title: "Run all unit tests", description: "Run the full unit test suite to verify no regressions", done: false });
    }
    const todosJson = JSON.stringify(todos);

    const [task] = await db.insert(tasks).values({
      ticketId,
      repoId: matchedRepo?.id ?? null,
      title: t.title,
      subtitle: t.subtitle ?? null,
      description: t.description,
      todos: todosJson,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    }).returning();

    result.push({ id: task.id, ...t, status: "pending" });
  }

  // Auto-advance ticket from plan to design (if still in plan phase)
  if (ticket.phase === "plan") {
    await db.update(tickets).set({ phase: "design", updatedAt: Date.now() }).where(eq(tickets.id, ticketId));
  }

  return Response.json({ tasks: result, autoAdvanced: ticket.phase === "plan" });
}
