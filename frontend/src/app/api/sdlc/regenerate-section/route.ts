// POST /api/sdlc/regenerate-section
// Tier 2 regeneration: sonnet + full KB context for a single section.
// Body: { artifactId, sectionKey, wsId }

import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import {
  sdlcArtifacts,
  sdlcArtifactSections,
  sdlcEpics,
  pats,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decryptPat } from "@/lib/crypto";
import { JiraClient } from "@/lib/jira/client";
import { claudeExec } from "@/lib/claude-cli";
import { getKbRoot } from "@/lib/kb-path";
import { getWorkspace } from "@/lib/db/helpers";
import { findSectionDef } from "@/lib/sdlc/sections";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json();
  const { artifactId, sectionKey, wsId } = body as {
    artifactId: number;
    sectionKey: string;
    wsId: number;
  };

  if (!artifactId || !sectionKey || !wsId) {
    return Response.json({ error: "artifactId, sectionKey, wsId required" }, { status: 400 });
  }

  const [artifact] = await db
    .select()
    .from(sdlcArtifacts)
    .where(eq(sdlcArtifacts.id, artifactId));

  if (!artifact) {
    return Response.json({ error: "Artifact not found" }, { status: 404 });
  }

  const [section] = await db
    .select()
    .from(sdlcArtifactSections)
    .where(
      and(
        eq(sdlcArtifactSections.artifactId, artifactId),
        eq(sdlcArtifactSections.sectionKey, sectionKey)
      )
    );

  if (!section) {
    return Response.json({ error: "Section not found" }, { status: 404 });
  }

  const [epic] = await db.select().from(sdlcEpics).where(eq(sdlcEpics.id, artifact.epicId));
  if (!epic) return Response.json({ error: "Epic not found" }, { status: 404 });

  const ws = await getWorkspace(wsId);
  if (!ws) return Response.json({ error: "Workspace not found" }, { status: 404 });

  // ── Tier 2 context assembly ──

  const kbRoot = getKbRoot(ws.id);
  const wikiDir = path.join(kbRoot, "wiki");

  const contextParts: string[] = [];

  // System overview
  const overviewPath = path.join(wikiDir, "architecture", "system-overview.md");
  if (fs.existsSync(overviewPath)) {
    contextParts.push("## System Overview\n\n" + fs.readFileSync(overviewPath, "utf8").slice(0, 4000));
  }

  // Service map
  const serviceMapPath = path.join(wikiDir, "architecture", "service-map.md");
  if (fs.existsSync(serviceMapPath)) {
    contextParts.push("## Service Map\n\n" + fs.readFileSync(serviceMapPath, "utf8").slice(0, 4000));
  }

  // Data model
  const dataModelDir = path.join(wikiDir, "data-model");
  if (fs.existsSync(dataModelDir)) {
    const dmFiles = fs.readdirSync(dataModelDir).filter((f) => f.endsWith(".md")).slice(0, 5);
    for (const f of dmFiles) {
      const content = fs.readFileSync(path.join(dataModelDir, f), "utf8").slice(0, 2000);
      contextParts.push(`## Data Model — ${f.replace(".md", "")}\n\n${content}`);
    }
  }

  // Relevant flow pages — pick up to 3 based on epic title/description keywords
  const flowsDir = path.join(wikiDir, "flows");
  if (fs.existsSync(flowsDir)) {
    const flowFiles = fs.readdirSync(flowsDir).filter((f) => f.endsWith(".md"));
    const searchTerms = (epic.title + " " + (epic.description ?? "")).toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const scored = flowFiles.map((f) => {
      const name = f.replace(".md", "").replace(/-/g, " ").toLowerCase();
      const score = searchTerms.filter((t) => name.includes(t)).length;
      return { f, score };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

    for (const { f } of scored) {
      const content = fs.readFileSync(path.join(flowsDir, f), "utf8").slice(0, 3000);
      contextParts.push(`## Flow — ${f.replace(".md", "")}\n\n${content}`);
    }
  }

  // Linked stories from Jira
  let storiesContext = "";
  try {
    const [pat] = await db.select().from(pats).where(eq(pats.service, "jira"));
    if (pat && ws.jiraUrl) {
      const token = decryptPat(pat.encryptedPat, pat.iv);
      const client = new JiraClient(ws.jiraUrl!, token, pat.username ?? undefined);
      const children = await client.getEpicChildren(epic.jiraKey);
      storiesContext = children
        .slice(0, 20)
        .map((c) => `**${c.key}** — ${c.summary}${c.description ? `\n${c.description.slice(0, 500)}` : ""}`)
        .join("\n\n");
    }
  } catch {
    // continue without stories
  }

  // All other sections for cross-reference
  const allSections = await db
    .select()
    .from(sdlcArtifactSections)
    .where(eq(sdlcArtifactSections.artifactId, artifactId));

  const otherSections = allSections
    .filter((s) => s.sectionKey !== sectionKey)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((s) => `## ${s.title}\n\n${s.contentMarkdown.slice(0, 2000)}`)
    .join("\n\n");

  // Section guidance
  const sectionDef = findSectionDef(artifact.type, sectionKey);
  const guidanceBlock = sectionDef
    ? `\n\n## Section Guidance\n\n${sectionDef.guidance}`
    : "";

  const systemPrompt = artifact.type === "design_doc"
    ? `You are a senior solution architect at a regulated bank writing an RFC / Design Document.
Write ONLY the content for the requested section. Return markdown only — no JSON, no wrapping, no section header.
Be specific and reference actual system components from the context provided.
Do NOT add implementation-level details like code snippets, database queries, caching strategies, or component class designs.
Keep content at the architecture and business-decision level appropriate for VP Engineering and Solution Architect review.
You have full KB context — use it to make the section richer and more specific than the initial draft.`
    : `You are a QA lead at a regulated bank writing a Test Plan for a Jira Epic.
Write ONLY the content for the requested section. Return markdown only — no JSON, no wrapping, no section header.
Be specific and actionable. Use Given/When/Then format for test scenarios where applicable.
Reference actual services and components from the context provided.
You have full KB context — use it to make the section richer and more specific than the initial draft.`;

  const prompt = `## Epic
**${epic.jiraKey}** — ${epic.title}
**Status**: ${epic.status} | **Assignee**: ${epic.assignee ?? "Unassigned"}

${epic.description ? epic.description.slice(0, 3000) : "(No description)"}

${storiesContext ? `## Linked Stories\n\n${storiesContext}\n` : ""}
## Knowledge Base Context

${contextParts.join("\n\n")}

## Other Sections in This Document

${otherSections}

## Previous Content of "${section.title}"

${section.contentMarkdown || "(empty)"}
${guidanceBlock}

## Task

Rewrite the **"${section.title}"** section of this ${artifact.type === "design_doc" ? "RFC Design Document" : "Test Plan"}.
Make it more detailed and specific using the full KB context above. Improve upon the previous draft.`;

  let content: string;
  try {
    content = await claudeExec<string>(prompt, {
      model: "sonnet",
      maxBudget: 1.00,
      systemPrompt,
      timeoutMs: 180_000,
      allowedTools: [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Regeneration failed", detail: msg }, { status: 502 });
  }

  const now = Date.now();
  await db
    .update(sdlcArtifactSections)
    .set({
      contentMarkdown: content,
      lastGeneratedAt: now,
      lastEditedByUser: 0,
    })
    .where(eq(sdlcArtifactSections.id, section.id));

  await db
    .update(sdlcArtifacts)
    .set({ updatedAt: now })
    .where(eq(sdlcArtifacts.id, artifactId));

  return Response.json({ content });
}
