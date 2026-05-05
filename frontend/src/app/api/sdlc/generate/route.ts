// POST /api/sdlc/generate
// Kicks off background generation of an SDLC artifact (design_doc or test_plan).
// Returns immediately with { artifactId, jobId }.
// Backend generates 7 sections sequentially with haiku, updating progress in jobs table.
// Body: { epicId, type, wsId }

import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import {
  sdlcEpics,
  sdlcArtifacts,
  sdlcArtifactSections,
  jobs,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { claudeExec } from "@/lib/claude-cli";
import { getKbRoot } from "@/lib/kb-path";
import { getWorkspace } from "@/lib/db/helpers";
import { getSectionDefs, type SectionDef } from "@/lib/sdlc/sections";

export const maxDuration = 1800;

type ArtifactType = "design_doc" | "test_plan";

export async function POST(request: Request) {
  const body = await request.json();
  const { epicId, type } = body as {
    epicId: number;
    type: ArtifactType;
  };

  if (!epicId || !type) {
    return Response.json({ error: "epicId and type required" }, { status: 400 });
  }

  const [epic] = await db.select().from(sdlcEpics).where(eq(sdlcEpics.id, epicId));
  if (!epic) return Response.json({ error: "Epic not found" }, { status: 404 });

  const wsId = epic.workspaceId;
  const ws = await getWorkspace(wsId);
  if (!ws) return Response.json({ error: "Workspace not found" }, { status: 404 });

  const sectionDefs = getSectionDefs(type);
  const now = Date.now();

  // Create or reuse artifact
  const [existing] = await db
    .select()
    .from(sdlcArtifacts)
    .where(and(eq(sdlcArtifacts.epicId, epicId), eq(sdlcArtifacts.type, type)));

  let artifactId: number;
  if (existing) {
    artifactId = existing.id;
    await db.update(sdlcArtifacts)
      .set({ generatedAt: now, updatedAt: now, status: "draft" })
      .where(eq(sdlcArtifacts.id, artifactId));
  } else {
    const [inserted] = await db.insert(sdlcArtifacts).values({
      epicId, workspaceId: wsId, type, status: "draft",
      generatedAt: now, createdAt: now, updatedAt: now,
    }).returning();
    artifactId = inserted.id;
  }

  // Ensure section rows exist
  for (const def of sectionDefs) {
    const [ex] = await db.select().from(sdlcArtifactSections).where(
      and(eq(sdlcArtifactSections.artifactId, artifactId), eq(sdlcArtifactSections.sectionKey, def.key))
    );
    if (!ex) {
      await db.insert(sdlcArtifactSections).values({
        artifactId, sectionKey: def.key, title: def.title,
        contentMarkdown: "", lastGeneratedAt: null, orderIndex: def.order,
      });
    }
  }

  // Create job for progress tracking
  const [job] = await db.insert(jobs).values({
    workspaceId: wsId, type: "sdlc_generate", status: "running",
    relatedId: artifactId, progress: 0,
    meta: JSON.stringify({ currentSection: sectionDefs[0].title, completedSections: 0, totalSections: sectionDefs.length, artifactType: type }),
    createdAt: now, updatedAt: now,
  }).returning();

  // Fire and forget — generate sections in background
  generateSectionsBackground(job.id, artifactId, epic, ws.id, type, sectionDefs).catch((err) => {
    console.error("[sdlc/generate] background error:", err);
    db.update(jobs).set({ status: "failed", error: String(err), updatedAt: Date.now() })
      .where(eq(jobs.id, job.id)).then(() => {});
  });

  return Response.json({ artifactId, jobId: job.id });
}

// ─── Background generation ──────────────────────────────────────

async function generateSectionsBackground(
  jobId: number,
  artifactId: number,
  epic: { jiraKey: string; title: string; description: string | null; status: string; assignee: string | null },
  wsId: number,
  type: ArtifactType,
  sectionDefs: SectionDef[],
) {
  // Tier 1 context: epic + system overview only
  const systemOverview = loadSystemOverview(wsId);
  const epicDesc = epic.description
    ? epic.description.slice(0, 3000) + (epic.description.length > 3000 ? "\n...(truncated)" : "")
    : "(No description provided)";

  const systemPrompt = type === "design_doc"
    ? `You are a senior solution architect at a regulated bank writing an RFC / Design Document.
Write ONLY the content for the requested section. Return markdown only — no JSON, no wrapping, no section header.
Be specific and reference actual system components from the context provided.
Do NOT add implementation-level details like code snippets, database queries, caching strategies, or component class designs.
Keep content at the architecture and business-decision level appropriate for VP Engineering and Solution Architect review.`
    : `You are a QA lead at a regulated bank writing a Test Plan for a Jira Epic.
Write ONLY the content for the requested section. Return markdown only — no JSON, no wrapping, no section header.
Be specific and actionable. Use Given/When/Then format for test scenarios where applicable.
Reference actual services and components from the context provided.`;

  const priorSections: string[] = [];

  for (let i = 0; i < sectionDefs.length; i++) {
    const def = sectionDefs[i];
    const now = Date.now();

    // Update job progress
    await db.update(jobs).set({
      progress: Math.round((i / sectionDefs.length) * 100),
      meta: JSON.stringify({
        currentSection: def.title,
        completedSections: i,
        totalSections: sectionDefs.length,
        artifactType: type,
      }),
      updatedAt: now,
    }).where(eq(jobs.id, jobId));

    // Check if section was user-edited — skip if so
    const [existingSection] = await db.select().from(sdlcArtifactSections).where(
      and(eq(sdlcArtifactSections.artifactId, artifactId), eq(sdlcArtifactSections.sectionKey, def.key))
    );
    if (existingSection?.lastEditedByUser) {
      priorSections.push(`## ${def.title}\n\n${existingSection.contentMarkdown}`);
      continue;
    }

    // Build per-section prompt
    const priorContext = priorSections.length > 0
      ? `\n\n## Previously Generated Sections\n\n${priorSections.join("\n\n")}`
      : "";

    const prompt = `## Epic
**${epic.jiraKey}** — ${epic.title}
**Status**: ${epic.status} | **Assignee**: ${epic.assignee ?? "Unassigned"}

${epicDesc}

## System Context
${systemOverview}
${priorContext}

## Task
Write the **"${def.title}"** section of this ${type === "design_doc" ? "RFC Design Document" : "Test Plan"}.

${def.guidance}`;

    let content: string;
    try {
      content = await claudeExec<string>(prompt, {
        model: "sonnet",
        maxBudget: 0.50,
        systemPrompt,
        timeoutMs: 180_000,
        allowedTools: [],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[sdlc/generate] Section "${def.key}" failed: ${msg}`);
      content = `*Generation failed for this section. Click regenerate to retry.*`;
    }

    // Save section to DB
    await db.update(sdlcArtifactSections).set({
      contentMarkdown: content,
      lastGeneratedAt: Date.now(),
      lastEditedByUser: 0,
    }).where(
      and(eq(sdlcArtifactSections.artifactId, artifactId), eq(sdlcArtifactSections.sectionKey, def.key))
    );

    priorSections.push(`## ${def.title}\n\n${content}`);
  }

  // Mark job complete
  await db.update(jobs).set({
    status: "done", progress: 100,
    meta: JSON.stringify({ currentSection: null, completedSections: sectionDefs.length, totalSections: sectionDefs.length, artifactType: type }),
    updatedAt: Date.now(),
  }).where(eq(jobs.id, jobId));

  // Update artifact
  await db.update(sdlcArtifacts).set({ updatedAt: Date.now() }).where(eq(sdlcArtifacts.id, artifactId));
}

// ─── Context helpers ────────────────────────────────────────────

function loadSystemOverview(wsId: number): string {
  const kbRoot = getKbRoot(wsId);
  const wikiDir = path.join(kbRoot, "wiki");
  const overviewPath = path.join(wikiDir, "architecture", "system-overview.md");

  if (fs.existsSync(overviewPath)) {
    return fs.readFileSync(overviewPath, "utf8").slice(0, 4000);
  }
  return "(No system overview available)";
}
