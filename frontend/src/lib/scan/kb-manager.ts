// KnowledgeBaseManager — post-processes raw scan output into wiki docs,
// machine-readable schema, and the root CLAUDE.md that ties everything together.
//
// Called once after scanning completes (not in real-time).

import fs from "fs";
import path from "path";

const KB_ROOT = path.join(process.cwd(), "..", "kb");
const RAW_DIR = path.join(KB_ROOT, "raw");
const WIKI_DIR = path.join(KB_ROOT, "wiki");
const SCHEMA_DIR = path.join(KB_ROOT, "schema");

// ─── Types ────────────────────────────────────────────────────────

interface RepoRaw {
  name: string;
  summary: string;
  architecture: string;
  findings: string | null;
}

interface RepoSchema {
  name: string;
  fileCount: number;
  techStack: string[];
  topLevelDirs: string[];
  findings: Array<{
    severity: string;
    category: string;
    title: string;
  }>;
  generatedAt: string;
}

// ─── Public API ───────────────────────────────────────────────────

export function compileKnowledgeBase(): { repos: number; wikiFiles: number; schemaFiles: number } {
  // Ensure output dirs exist
  fs.mkdirSync(WIKI_DIR, { recursive: true });
  fs.mkdirSync(SCHEMA_DIR, { recursive: true });

  // Discover repos from raw output
  const repoDirs = fs.readdirSync(RAW_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let wikiFiles = 0;
  let schemaFiles = 0;

  const repoSchemas: RepoSchema[] = [];

  for (const repoName of repoDirs) {
    const raw = readRawRepo(repoName);
    if (!raw) continue;

    // ── Wiki compilation ─────────────────────────────────────
    wikiFiles += compileWiki(raw);

    // ── Schema generation ────────────────────────────────────
    const schema = generateSchema(raw);
    repoSchemas.push(schema);
    writeSchema(repoName, schema);
    schemaFiles += 2; // .json + .md
  }

  // ── Root CLAUDE.md ───────────────────────────────────────────
  generateClaudeMd(repoDirs, repoSchemas);

  // ── Root INDEX files ─────────────────────────────────────────
  generateRawIndex(repoDirs);
  generateWikiIndex(repoDirs);

  return { repos: repoDirs.length, wikiFiles, schemaFiles };
}

// ─── Read raw scan output ─────────────────────────────────────────

function readRawRepo(repoName: string): RepoRaw | null {
  const dir = path.join(RAW_DIR, repoName);
  const summaryPath = path.join(dir, "summary.md");
  const archPath = path.join(dir, "architecture.md");
  const findingsPath = path.join(dir, "findings.md");

  if (!fs.existsSync(summaryPath)) return null;

  return {
    name: repoName,
    summary: fs.readFileSync(summaryPath, "utf8"),
    architecture: fs.readFileSync(archPath, "utf8"),
    findings: fs.existsSync(findingsPath) ? fs.readFileSync(findingsPath, "utf8") : null,
  };
}

// ─── Wiki compilation ─────────────────────────────────────────────

function compileWiki(raw: RepoRaw): number {
  const wikiDir = path.join(WIKI_DIR, raw.name);
  fs.mkdirSync(wikiDir, { recursive: true });

  const files: Array<{ name: string; content: string }> = [];

  // Overview page — combines summary + architecture into a single readable doc
  const overview = [
    `# ${raw.name}`,
    "",
    "## Overview",
    "",
    stripHeading(raw.summary),
    "",
    "## Architecture",
    "",
    stripHeading(raw.architecture),
  ].join("\n");

  files.push({ name: "overview.md", content: overview });

  // Findings page (if any)
  if (raw.findings) {
    files.push({ name: "findings.md", content: raw.findings });
  }

  // Write files
  for (const file of files) {
    fs.writeFileSync(path.join(wikiDir, file.name), file.content, "utf8");
  }

  // Write INDEX.md
  const index = [
    `# ${raw.name} — Wiki`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Pages",
    "",
    ...files.map((f) => `- [${f.name}](./${f.name})`),
  ].join("\n");
  fs.writeFileSync(path.join(wikiDir, "INDEX.md"), index, "utf8");

  return files.length;
}

// ─── Schema generation ────────────────────────────────────────────

function generateSchema(raw: RepoRaw): RepoSchema {
  // Extract tech stack from summary text
  const techMatch = raw.summary.match(/Tech stack:\s*([^.]+)\./);
  const techStack = techMatch
    ? techMatch[1].split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  // Extract file count
  const countMatch = raw.summary.match(/contains (\d+) files/);
  const fileCount = countMatch ? parseInt(countMatch[1], 10) : 0;

  // Extract top-level dirs from architecture
  const dirsMatch = raw.architecture.match(/Top-level directories:\s*(.+)/);
  const topLevelDirs = dirsMatch
    ? dirsMatch[1].split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  // Extract findings titles from findings text
  const findings: RepoSchema["findings"] = [];
  if (raw.findings) {
    const findingMatches = raw.findings.matchAll(/## \[(\w+)\] (.+)\n\n\*\*Category:\*\* (\w+)/g);
    for (const m of findingMatches) {
      findings.push({ severity: m[1].toLowerCase(), category: m[3], title: m[2] });
    }
  }

  return {
    name: raw.name,
    fileCount,
    techStack,
    topLevelDirs,
    findings,
    generatedAt: new Date().toISOString(),
  };
}

function writeSchema(repoName: string, schema: RepoSchema): void {
  // JSON schema
  fs.writeFileSync(
    path.join(SCHEMA_DIR, `${repoName}.json`),
    JSON.stringify(schema, null, 2),
    "utf8"
  );

  // Human-readable markdown schema
  const md = [
    `# ${repoName} — Schema`,
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Files | ${schema.fileCount} |`,
    `| Tech Stack | ${schema.techStack.join(", ") || "—"} |`,
    `| Top-level Dirs | ${schema.topLevelDirs.slice(0, 8).join(", ") || "—"} |`,
    `| Findings | ${schema.findings.length} |`,
    "",
    schema.findings.length > 0
      ? [
          "## Findings",
          "",
          ...schema.findings.map((f) => `- **[${f.severity}]** ${f.title} (${f.category})`),
        ].join("\n")
      : "",
    "",
    `*Generated: ${schema.generatedAt}*`,
  ].filter((line) => line !== undefined).join("\n");

  fs.writeFileSync(path.join(SCHEMA_DIR, `${repoName}.md`), md, "utf8");
}

// ─── Root CLAUDE.md ───────────────────────────────────────────────

function generateClaudeMd(repoNames: string[], schemas: RepoSchema[]): void {
  const lines = [
    "# DevCycle Knowledge Base",
    "",
    "This file is the root index for the DevCycle knowledge base.",
    "It is auto-generated after each scan.",
    "",
    "## Repositories",
    "",
    `${repoNames.length} repos scanned.`,
    "",
    "| Repo | Files | Tech Stack | Findings |",
    "|------|-------|------------|----------|",
    ...schemas.map((s) =>
      `| [${s.name}](wiki/${s.name}/overview.md) | ${s.fileCount} | ${s.techStack.join(", ") || "—"} | ${s.findings.length} |`
    ),
    "",
    "## Sections",
    "",
    "- [Raw scan output](raw/) — per-repo summaries, architecture docs, and findings",
    "- [Wiki](wiki/) — compiled human-readable documentation",
    "- [Schema](schema/) — machine-readable repo metadata (JSON + markdown)",
    "",
    `*Generated: ${new Date().toISOString()}*`,
  ];

  fs.writeFileSync(path.join(KB_ROOT, "CLAUDE.md"), lines.join("\n"), "utf8");
}

// ─── Index files ──────────────────────────────────────────────────

function generateRawIndex(repoNames: string[]): void {
  const lines = [
    "# Raw Scan Output — Index",
    "",
    ...repoNames.map((name) => `- [${name}](${name}/INDEX.md)`),
    "",
    `*Generated: ${new Date().toISOString()}*`,
  ];
  fs.writeFileSync(path.join(RAW_DIR, "INDEX.md"), lines.join("\n"), "utf8");
}

function generateWikiIndex(repoNames: string[]): void {
  const lines = [
    "# Wiki — Index",
    "",
    ...repoNames.map((name) => `- [${name}](${name}/INDEX.md)`),
    "",
    `*Generated: ${new Date().toISOString()}*`,
  ];
  fs.writeFileSync(path.join(WIKI_DIR, "INDEX.md"), lines.join("\n"), "utf8");
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Strip the first markdown heading line from content. */
function stripHeading(content: string): string {
  return content.replace(/^#[^\n]*\n+/, "").trim();
}
