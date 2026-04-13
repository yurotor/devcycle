// POST /api/tickets/:id/design/generate — generate wave/task breakdown
// Uses the prd-to-issues methodology: vertical slices (tracer bullets) through all layers.

import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { tickets, waves, tasks, repos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { claudeExec, isClaudeCliAvailable } from "@/lib/claude-cli";
import { complete } from "@/lib/anthropic";

const KB_ROOT = path.join(process.cwd(), "..", "kb");
const REPOS_DIR = path.join(KB_ROOT, "repos");
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

  return `You are a senior technical architect breaking a PRD into implementation tasks using the tracer-bullet / vertical-slice methodology.

${prdToIssues ? `## Skill Reference (prd-to-issues)\n\n${prdToIssues}\n` : ""}

## Vertical Slice Rules

- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, business logic, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones
- Slices are either AFK (can be implemented and merged without human interaction) or HITL (requires a decision or review)
- Prefer AFK over HITL where possible

## How to structure slices into waves

- **Wave 1**: Foundation — schema migrations, shared contracts, config. These are blockers for everything else.
- **Wave 2+**: Vertical slices — each task cuts end-to-end through the stack. Order by dependency.
- **Final wave**: Integration — cross-service wiring, e2e tests, cleanup.

## Task quality

- Each task must reference a specific repository from the available list
- Each task must have a "subtitle" — a one-liner summary (under 80 chars) that describes the task at a glance
- Task descriptions should be detailed enough to start implementing immediately
- Reference actual entities, endpoints, patterns, and files from the PRD and codebase
- No two tasks in the same wave should target the same repository (they run in parallel)
- Do NOT include generic tasks like "update docs" unless the PRD specifically requires it`;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) return Response.json({ error: "Ticket not found" }, { status: 404 });

  const now = Date.now();

  // Load PRD content
  let prdContent = "";
  if (ticket.prdPath) {
    const fullPath = path.join(KB_ROOT, ticket.prdPath);
    if (fs.existsSync(fullPath)) {
      try { prdContent = fs.readFileSync(fullPath, "utf8"); } catch { /* skip */ }
    }
  }

  // Load repos
  const repoRows = await db.select().from(repos).where(eq(repos.workspaceId, ticket.workspaceId));
  const repoNames = repoRows.map((r) => r.name);

  // Load service map + data model from synthesis
  let serviceContext = "";
  const synthPath = path.join(KB_ROOT, "raw", "system-synthesis.json");
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

  const userContent = `Break this PRD into vertical-slice implementation tasks grouped into waves.

## Ticket
**${ticket.jiraKey}: ${ticket.title}**
${ticket.description ? `\n${ticket.description}` : ""}

## PRD
${prdContent || "(No PRD generated yet — break down based on the ticket description.)"}

## Available Repositories
${repoNames.length > 0 ? repoNames.map((r) => `- ${r}`).join("\n") : "(no repos scanned yet)"}

${serviceContext ? `## Codebase Context\n${serviceContext}` : ""}

## Output Format
Return valid JSON only — an array of waves. Each task includes a "subtitle" (one-liner summary), "type" field (AFK or HITL), and optional "blockedBy" referencing task titles:
[{"name": "Wave 1 — ...", "tasks": [{"title": "...", "subtitle": "Short one-liner description", "description": "Detailed implementation instructions...", "repo": "exact-repo-name", "type": "AFK"}]}]`;

  // Stub — only used when AI is unavailable
  const stubWaves: { name: string; tasks: { title: string; subtitle?: string; description: string; repo: string; type: string }[] }[] = [
    {
      name: "Wave 1 — Core Changes",
      tasks: repoNames.length > 0
        ? [{ title: `Implement ${ticket.title}`, description: ticket.description || "Implement the ticket requirements", repo: repoNames[0], type: "AFK" }]
        : [{ title: `Implement ${ticket.title}`, description: ticket.description || "Implement the ticket requirements", repo: "backend", type: "AFK" }],
    },
  ];

  let waveData = stubWaves;
  try {
    let raw: string;

    const systemPrompt = buildSystemPrompt();

    if (isClaudeCliAvailable()) {
      // Claude CLI can explore repos for context
      const repoDirs = repoRows
        .map((r) => path.join(REPOS_DIR, r.name))
        .filter((d) => fs.existsSync(d));
      const addDirs = [KB_ROOT, ...repoDirs];

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
        { system: systemPrompt, maxTokens: 2048, stubResponse: JSON.stringify(stubWaves) }
      );
    }

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      waveData = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.error("[design/generate] Task breakdown failed:", err instanceof Error ? err.message : err);
    // Use stub
  }

  // Clear existing waves/tasks for this ticket
  await db.delete(tasks).where(eq(tasks.ticketId, ticketId));
  await db.delete(waves).where(eq(waves.ticketId, ticketId));

  // Save waves and tasks to DB
  const result = [];
  for (let i = 0; i < waveData.length; i++) {
    const w = waveData[i];
    const [wave] = await db.insert(waves).values({
      ticketId,
      name: w.name,
      orderIndex: i,
      createdAt: now,
    }).returning({ id: waves.id });

    const waveTasks = [];
    for (const t of w.tasks) {
      const repoName = (t.repo ?? "").toLowerCase();
      const matchedRepo = repoRows.find((r) =>
        r.name.toLowerCase() === repoName ||
        r.name.toLowerCase().includes(repoName) ||
        repoName.includes(r.name.toLowerCase())
      );

      const [task] = await db.insert(tasks).values({
        ticketId,
        waveId: wave.id,
        repoId: matchedRepo?.id ?? null,
        title: t.title,
        subtitle: t.subtitle ?? null,
        description: t.description,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      }).returning();

      waveTasks.push({ id: task.id, ...t, status: "pending", waveId: wave.id });
    }

    result.push({ id: wave.id, name: w.name, orderIndex: i, tasks: waveTasks });
  }

  // Auto-advance ticket from plan to design (if still in plan phase)
  if (ticket.phase === "plan") {
    await db.update(tickets).set({ phase: "design", updatedAt: Date.now() }).where(eq(tickets.id, ticketId));
  }

  return Response.json({ waves: result, autoAdvanced: ticket.phase === "plan" });
}
