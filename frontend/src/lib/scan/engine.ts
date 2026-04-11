// ScanEngine — clones Azure DevOps repos locally, calls Claude for deep analysis,
// runs cross-repo synthesis, writes KB files, and saves findings to scan_suggestions table.

import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { db } from "@/lib/db";
import { workspace, pats, repos, scanSuggestions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decryptPat } from "@/lib/crypto";
import { complete, isAIAvailable } from "@/lib/anthropic";
import { compileKnowledgeBase } from "@/lib/scan/kb-manager";

// ─── Types ────────────────────────────────────────────────────────

export interface ScanEvent {
  repo: string;
  message: string;
  type: "info" | "success" | "warning" | "finding" | "phase";
}

export interface DoneEvent {
  type: "done";
  summary: { repos: number; findings: number };
}

export interface AnalysisFinding {
  severity: "critical" | "high";
  category: "security" | "architecture" | "optimization" | "bug";
  title: string;
  description: string;
  files?: string[];
}

export interface DeepRepoAnalysis {
  purpose: string;
  businessFeatures: string[];
  apis: Array<{ endpoint: string; method: string; purpose: string }>;
  dependencies: Array<{ target: string; type: "http" | "messaging" | "shared-lib" | "database" }>;
  dataEntities: Array<{ name: string; description: string }>;
  messagingPatterns: Array<{ type: string; name: string; description: string }>;
  integrations: Array<{ system: string; direction: "upstream" | "downstream" | "bidirectional"; protocol: string }>;
  architecturePatterns: string[];
  techStack: string[];
  findings: AnalysisFinding[];
}

export interface SystemSynthesis {
  systemOverview: string;
  serviceMap: Array<{ repo: string; role: string; communicatesWith: string[] }>;
  features: Array<{ name: string; description: string; repos: string[]; dataFlow: string }>;
  dataFlows: Array<{ name: string; description: string; steps: string[] }>;
  integrations: Array<{ system: string; direction: string; protocol: string; repos: string[] }>;
  dataModel: Array<{ entity: string; description: string; repos: string[] }>;
  architecturePatterns: Array<{ pattern: string; description: string; repos: string[] }>;
}

// ─── Constants ────────────────────────────────────────────────────

const KB_ROOT = path.join(process.cwd(), "..", "kb");
const REPOS_DIR = path.join(KB_ROOT, "repos");

const PRIORITY_FILENAMES = [
  "README.md", "readme.md", "README",
  "package.json", "go.mod", "requirements.txt", "pom.xml", "Cargo.toml",
  "pyproject.toml", "tsconfig.json", ".env.example",
  "docker-compose.yml", "docker-compose.yaml", "Dockerfile",
  "appsettings.json", "appsettings.Development.json",
  "index.ts", "index.js", "main.go", "main.ts", "main.py", "app.py",
  "server.ts", "server.js", "app.ts",
  "Startup.cs", "Program.cs",
];

// Patterns that indicate business logic entry points
const BUSINESS_LOGIC_PATTERNS = [
  /Controller\./i, /Service\./i, /Handler\./i, /Processor\./i,
  /Entity\./i, /Model\./i, /Migration\./i,
  /Repository\./i, /Manager\./i, /Worker\./i,
  /dag.*\.py$/i, /pipeline.*\.py$/i, /task.*\.py$/i,
];

const MAX_FILES_PER_REPO = 30;
const MAX_FILE_CHARS = 8000;
const CONCURRENCY = 2;

// ─── Async git helper ────────────────────────────────────────────

function gitExec(args: string[], options?: { timeout?: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("git", args, {
      timeout: options?.timeout ?? 120_000,
      maxBuffer: 10 * 1024 * 1024,
    }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

// ─── ScanEngine ───────────────────────────────────────────────────

export class ScanEngine {
  private completed = 0;
  private total = 0;
  private repoAnalyses: Map<string, DeepRepoAnalysis> = new Map();

  constructor(
    private workspaceId: number,
    private emit: (event: ScanEvent | DoneEvent) => void,
  ) {}

  /** Returns completion percentage (0-85 during analysis, 85-95 during synthesis, 95-100 during compilation). */
  getProgress(): number {
    if (this.total === 0) return 0;
    return Math.round((this.completed / this.total) * 85);
  }

  private progress(repo: string, message: string, type: ScanEvent["type"] = "info") {
    this.emit({ repo, message: `[${this.completed}/${this.total}] ${message}`, type });
  }

  async run(): Promise<void> {
    const repoRows = await db
      .select()
      .from(repos)
      .where(eq(repos.workspaceId, this.workspaceId));

    if (repoRows.length === 0) {
      this.emit({ type: "done", summary: { repos: 0, findings: 0 } });
      return;
    }

    this.total = repoRows.length;

    const [ws] = await db.select().from(workspace).where(eq(workspace.id, this.workspaceId));
    if (!ws) throw new Error("Workspace not configured");

    const [pat] = await db.select().from(pats).where(eq(pats.workspaceId, ws.id)).limit(1);
    if (!pat) throw new Error("Azure DevOps PAT not found");

    const plainPat = decryptPat(pat.encryptedPat, pat.iv);

    const orgUrl = new URL(ws.azureOrgUrl.trim().replace(/\/$/, ""));
    const orgName = orgUrl.pathname.split("/").filter(Boolean)[0];
    if (!orgName) throw new Error("Could not parse org name from Azure DevOps URL");

    await db.delete(scanSuggestions).where(eq(scanSuggestions.workspaceId, this.workspaceId));

    fs.mkdirSync(KB_ROOT, { recursive: true });
    fs.mkdirSync(path.join(KB_ROOT, "raw"), { recursive: true });
    fs.mkdirSync(REPOS_DIR, { recursive: true });

    // ── Phase 1: Deep per-repo analysis ──────────────────────────
    this.emit({ repo: "system", message: "Phase 1: Analyzing repositories...", type: "phase" });

    let totalFindings = 0;
    const queue = [...repoRows];
    const active: Promise<number>[] = [];

    const runNext = (): Promise<number> | null => {
      const repo = queue.shift();
      if (!repo) return null;
      return this.scanRepo(repo, orgName, plainPat).then((findings) => {
        this.completed++;
        totalFindings += findings;
        return findings;
      });
    };

    for (let i = 0; i < CONCURRENCY && queue.length > 0; i++) {
      const p = runNext();
      if (p) active.push(p);
    }

    while (active.length > 0) {
      await Promise.race(active.map((p, i) =>
        p.then(() => {
          active.splice(i, 1);
          const next = runNext();
          if (next) active.push(next);
        })
      ));
    }

    // ── Phase 2: Cross-repo system synthesis ─────────────────────
    this.emit({ repo: "system", message: "Phase 2: Synthesizing system-level knowledge...", type: "phase" });

    let synthesis: SystemSynthesis | null = null;
    try {
      synthesis = await this.synthesizeSystem();
      this.emit({ repo: "system", message: "System synthesis complete.", type: "success" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[scan] Synthesis failed:", msg);
      this.emit({ repo: "system", message: `Synthesis failed: ${msg.slice(0, 120)}`, type: "warning" });
    }

    // ── Phase 3: Compile topic-organized wiki ────────────────────
    this.emit({ repo: "system", message: "Phase 3: Compiling knowledge base...", type: "phase" });

    const kb = await compileKnowledgeBase();
    this.emit({
      repo: "system",
      message: `KB compiled: ${kb.wikiFiles} wiki pages, ${kb.schemaFiles} schema files.`,
      type: "success",
    });

    this.emit({ type: "done", summary: { repos: repoRows.length, findings: totalFindings } });
  }

  // ── Per-repo scan ─────────────────────────────────────────────

  private async scanRepo(
    repo: { id: number; name: string; project: string; defaultBranch: string; adoId: string | null; workspaceId: number },
    orgName: string,
    pat: string
  ): Promise<number> {
    const repoName = repo.name;
    const repoDir = path.join(REPOS_DIR, repoName);

    try {
      const branch = repo.defaultBranch || "main";
      const cloneUrl = `https://${encodeURIComponent(pat)}@dev.azure.com/${orgName}/${encodeURIComponent(repo.project)}/_git/${encodeURIComponent(repoName)}`;

      if (fs.existsSync(path.join(repoDir, ".git"))) {
        this.progress(repoName, "Already cloned, skipping.");
      } else {
        this.progress(repoName, `Cloning (branch: ${branch})...`);
        fs.rmSync(repoDir, { recursive: true, force: true });
        await gitExec(["clone", "--depth", "1", "--branch", branch, cloneUrl, repoDir]);
        this.progress(repoName, "Cloned.");
      }

      this.progress(repoName, "Reading file tree...");
      const allFiles = walkDir(repoDir, repoDir);
      const selected = selectKeyFiles(allFiles);
      this.progress(repoName, `${allFiles.length} files found, ${selected.length} selected for analysis.`);

      const fileContents = readLocalFiles(repoDir, selected);

      this.progress(repoName, "Deep analysis...");
      const analysis = await deepAnalyzeRepo(repoName, allFiles, fileContents);

      // Store for synthesis pass
      this.repoAnalyses.set(repoName, analysis);

      // Write raw output
      const kbDir = path.join(KB_ROOT, "raw", repoName);
      fs.mkdirSync(kbDir, { recursive: true });
      writeRepoAnalysis(kbDir, repoName, analysis);

      // Save findings
      const findings = analysis.findings ?? [];
      await this.saveFindings(repoName, findings);

      const criticalCount = findings.filter((f) => f.severity === "critical").length;
      const highCount = findings.filter((f) => f.severity === "high").length;

      if (findings.length > 0) {
        this.progress(repoName, `Done — ${criticalCount} critical, ${highCount} high findings`, "finding");
      } else {
        this.progress(repoName, "Done — analysis complete", "success");
      }

      return findings.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[scan] ${repoName} error:`, msg);
      this.progress(repoName, `Error: ${msg.slice(0, 120)}`, "warning");
      return 0;
    }
  }

  // ── Cross-repo synthesis ──────────────────────────────────────

  private async synthesizeSystem(): Promise<SystemSynthesis | null> {
    if (this.repoAnalyses.size === 0) return null;

    // Build compact summaries for all repos
    const repoSummaries = Array.from(this.repoAnalyses.entries()).map(([name, a]) => ({
      repo: name,
      purpose: a.purpose,
      businessFeatures: a.businessFeatures,
      apis: a.apis,
      dependencies: a.dependencies,
      dataEntities: a.dataEntities,
      messagingPatterns: a.messagingPatterns,
      integrations: a.integrations,
      architecturePatterns: a.architecturePatterns,
      techStack: a.techStack,
    }));

    if (!isAIAvailable()) {
      // Write stub synthesis
      const stub: SystemSynthesis = {
        systemOverview: `System with ${repoSummaries.length} repositories.`,
        serviceMap: repoSummaries.map((r) => ({ repo: r.repo, role: r.purpose, communicatesWith: r.dependencies.map((d) => d.target) })),
        features: repoSummaries.flatMap((r) => r.businessFeatures.map((f) => ({ name: f, description: "", repos: [r.repo], dataFlow: "" }))),
        dataFlows: [],
        integrations: repoSummaries.flatMap((r) => r.integrations.map((i) => ({ ...i, repos: [r.repo] }))),
        dataModel: repoSummaries.flatMap((r) => r.dataEntities.map((e) => ({ entity: e.name, description: e.description, repos: [r.repo] }))),
        architecturePatterns: [],
      };
      fs.writeFileSync(path.join(KB_ROOT, "raw", "system-synthesis.json"), JSON.stringify(stub, null, 2), "utf8");
      return stub;
    }

    const raw = await complete(
      [
        {
          role: "user",
          content: `You are analyzing ${repoSummaries.length} repositories that form a single software system. Based on the per-repo analyses below, produce a system-level synthesis.

Return a JSON object with exactly these fields:

{
  "systemOverview": "2-3 paragraph description of what this system is, what business it serves, and how the repos work together.",
  "serviceMap": [{ "repo": "name", "role": "what it does in the system", "communicatesWith": ["other-repo-names"] }],
  "features": [{ "name": "feature name", "description": "what it does", "repos": ["repo1", "repo2"], "dataFlow": "describe the data flow for this feature" }],
  "dataFlows": [{ "name": "flow name", "description": "end-to-end description", "steps": ["step1", "step2"] }],
  "integrations": [{ "system": "external system name", "direction": "upstream|downstream|bidirectional", "protocol": "REST|messaging|etc", "repos": ["repo1"] }],
  "dataModel": [{ "entity": "entity name", "description": "what it represents", "repos": ["repo1"] }],
  "architecturePatterns": [{ "pattern": "pattern name", "description": "how it's used", "repos": ["repo1"] }]
}

Be thorough — identify ALL business features, data flows, and integrations. Cross-reference repos to show how they work together.

Per-repo analyses:
${JSON.stringify(repoSummaries, null, 2)}`,
        },
      ],
      {
        system: "You are a senior enterprise architect producing a system-level synthesis. Return valid JSON only — no markdown fences, no explanation outside the JSON.",
        maxTokens: 8192,
      }
    );

    const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();
    const synthesis = JSON.parse(cleaned) as SystemSynthesis;

    // Write to disk
    fs.writeFileSync(
      path.join(KB_ROOT, "raw", "system-synthesis.json"),
      JSON.stringify(synthesis, null, 2),
      "utf8"
    );

    return synthesis;
  }

  // ── Save findings ─────────────────────────────────────────────

  private async saveFindings(repoName: string, findings: AnalysisFinding[]): Promise<void> {
    if (findings.length === 0) return;

    const now = Date.now();
    const [repoRow] = await db
      .select({ id: repos.id, workspaceId: repos.workspaceId })
      .from(repos)
      .where(eq(repos.name, repoName))
      .limit(1);

    if (!repoRow) return;

    for (const finding of findings) {
      await db.insert(scanSuggestions).values({
        workspaceId: repoRow.workspaceId,
        repoId: repoRow.id,
        severity: finding.severity,
        category: finding.category,
        title: finding.title,
        description: finding.description,
        files: finding.files?.length ? JSON.stringify(finding.files) : null,
        createdAt: now,
      });
    }
  }
}

// ─── Filesystem helpers ──────────────────────────────────────────

function walkDir(dir: string, root: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "vendor" || entry.name === ".vs") {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, root));
    } else if (entry.isFile()) {
      results.push(path.relative(root, fullPath));
    }
  }
  return results;
}

function readLocalFiles(repoDir: string, filePaths: string[]): Array<{ path: string; content: string }> {
  const results: Array<{ path: string; content: string }> = [];
  for (const filePath of filePaths) {
    try {
      const fullPath = path.join(repoDir, filePath);
      const content = fs.readFileSync(fullPath, "utf8");
      const truncated =
        content.length > MAX_FILE_CHARS
          ? content.slice(0, MAX_FILE_CHARS) + `\n... [truncated, ${content.length - MAX_FILE_CHARS} chars omitted]`
          : content;
      results.push({ path: filePath, content: truncated });
    } catch {
      // Binary or unreadable — skip
    }
  }
  return results;
}

// ─── File selection ──────────────────────────────────────────────

function selectKeyFiles(tree: string[]): string[] {
  const selected: string[] = [];
  const seen = new Set<string>();

  const add = (file: string) => {
    if (!seen.has(file)) {
      selected.push(file);
      seen.add(file);
    }
  };

  // 1. Priority config/entry files
  for (const filename of PRIORITY_FILENAMES) {
    if (selected.length >= MAX_FILES_PER_REPO) break;
    const match = tree.find(
      (f) => f === filename || f.endsWith(`/${filename}`) || f === filename.toLowerCase()
    );
    if (match) add(match);
  }

  // 2. Business logic files (controllers, services, handlers, etc.)
  for (const file of tree) {
    if (selected.length >= MAX_FILES_PER_REPO) break;
    if (seen.has(file)) continue;
    const basename = path.basename(file);
    if (BUSINESS_LOGIC_PATTERNS.some((p) => p.test(basename))) {
      if (!file.includes("test") && !file.includes("spec") && !file.includes("__")) {
        add(file);
      }
    }
  }

  // 3. Remaining source files
  if (selected.length < MAX_FILES_PER_REPO) {
    const sourceExts = [".ts", ".go", ".py", ".java", ".cs", ".fs", ".rb", ".rs", ".kt", ".swift", ".js", ".jsx", ".tsx"];
    for (const file of tree) {
      if (selected.length >= MAX_FILES_PER_REPO) break;
      if (seen.has(file)) continue;
      if (!file.includes("node_modules/") && !file.includes("vendor/") && !file.includes(".min.")) {
        const ext = path.extname(file);
        if (sourceExts.includes(ext) && !file.includes("test") && !file.includes("spec") && !file.includes("__")) {
          add(file);
        }
      }
    }
  }

  return selected;
}

// ─── Deep per-repo analysis ──────────────────────────────────────

async function deepAnalyzeRepo(
  repoName: string,
  fileTree: string[],
  fileContents: Array<{ path: string; content: string }>
): Promise<DeepRepoAnalysis> {
  if (!isAIAvailable()) {
    return deepAnalyzeStub(repoName, fileTree);
  }

  const fileListSection = fileTree.slice(0, 150).join("\n");
  const fileContentSection = fileContents
    .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");

  try {
    const raw = await complete(
      [
        {
          role: "user",
          content: `Deeply analyze this repository and return a JSON object with exactly these fields:

{
  "purpose": "2-3 sentence description of what this repo does and its role in the larger system.",
  "businessFeatures": ["feature1", "feature2"],
  "apis": [{ "endpoint": "/api/...", "method": "GET|POST|...", "purpose": "what it does" }],
  "dependencies": [{ "target": "other-repo-or-service-name", "type": "http|messaging|shared-lib|database" }],
  "dataEntities": [{ "name": "EntityName", "description": "what it represents" }],
  "messagingPatterns": [{ "type": "outbox|queue|topic|event", "name": "pattern name", "description": "what it does" }],
  "integrations": [{ "system": "external system name", "direction": "upstream|downstream|bidirectional", "protocol": "REST|SOAP|messaging|file|etc" }],
  "architecturePatterns": ["pattern1", "pattern2"],
  "techStack": ["tech1", "tech2"],
  "findings": [{ "severity": "critical|high", "category": "security|architecture|optimization|bug", "title": "short title", "description": "detailed explanation and recommended fix", "files": ["path/to/file"] }]
}

Be thorough. Identify ALL business features, APIs, dependencies on other services/repos, data entities, messaging patterns, and external integrations visible in the code. For dependencies, infer the target from service names, URLs, message types, or shared contract references.

Only include critical and high severity findings. Return valid JSON only.

Repository: ${repoName}
Total files: ${fileTree.length}

File tree (first 150):
${fileListSection}

Key file contents:
${fileContentSection}`,
        },
      ],
      {
        system: "You are a senior software architect performing deep codebase analysis. Return valid JSON only — no markdown fences, no explanation outside the JSON. Be thorough in identifying business logic, integrations, and dependencies.",
        maxTokens: 4096,
      }
    );

    const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();
    return JSON.parse(cleaned) as DeepRepoAnalysis;
  } catch (err) {
    console.error(`[scan] Deep analysis failed for ${repoName}, falling back to stub:`, err);
    return deepAnalyzeStub(repoName, fileTree);
  }
}

function deepAnalyzeStub(repoName: string, fileTree: string[]): DeepRepoAnalysis {
  const extCounts: Record<string, number> = {};
  for (const f of fileTree) {
    const ext = path.extname(f).toLowerCase();
    if (ext) extCounts[ext] = (extCounts[ext] ?? 0) + 1;
  }

  const techStack: string[] = [];
  if (fileTree.some((f) => f.endsWith(".csproj"))) techStack.push(".NET/C#");
  if (fileTree.some((f) => f === "package.json" || f.endsWith("/package.json"))) techStack.push("Node.js");
  if (fileTree.some((f) => f.endsWith(".py"))) techStack.push("Python");
  if (fileTree.some((f) => f.endsWith(".go"))) techStack.push("Go");
  if (fileTree.some((f) => f.includes("Dockerfile"))) techStack.push("Docker");

  return {
    purpose: `Repository "${repoName}" contains ${fileTree.length} files. (Stub — re-scan with Claude API to get deep analysis.)`,
    businessFeatures: [],
    apis: [],
    dependencies: [],
    dataEntities: [],
    messagingPatterns: [],
    integrations: [],
    architecturePatterns: [],
    techStack,
    findings: [],
  };
}

// ─── KB file writing ─────────────────────────────────────────────

function writeRepoAnalysis(kbDir: string, repoName: string, analysis: DeepRepoAnalysis): void {
  // Write structured JSON
  fs.writeFileSync(
    path.join(kbDir, "analysis.json"),
    JSON.stringify(analysis, null, 2),
    "utf8"
  );

  // Write human-readable markdown
  const sections: string[] = [
    `# ${repoName}`,
    "",
    `## Purpose`,
    analysis.purpose,
    "",
  ];

  if (analysis.businessFeatures.length > 0) {
    sections.push(`## Business Features`, ...analysis.businessFeatures.map((f) => `- ${f}`), "");
  }
  if (analysis.apis.length > 0) {
    sections.push(`## APIs`, ...analysis.apis.map((a) => `- **${a.method} ${a.endpoint}** — ${a.purpose}`), "");
  }
  if (analysis.dependencies.length > 0) {
    sections.push(`## Dependencies`, ...analysis.dependencies.map((d) => `- **${d.target}** (${d.type})`), "");
  }
  if (analysis.dataEntities.length > 0) {
    sections.push(`## Data Entities`, ...analysis.dataEntities.map((e) => `- **${e.name}** — ${e.description}`), "");
  }
  if (analysis.messagingPatterns.length > 0) {
    sections.push(`## Messaging Patterns`, ...analysis.messagingPatterns.map((m) => `- **${m.name}** (${m.type}) — ${m.description}`), "");
  }
  if (analysis.integrations.length > 0) {
    sections.push(`## External Integrations`, ...analysis.integrations.map((i) => `- **${i.system}** — ${i.direction} via ${i.protocol}`), "");
  }
  if (analysis.architecturePatterns.length > 0) {
    sections.push(`## Architecture Patterns`, ...analysis.architecturePatterns.map((p) => `- ${p}`), "");
  }
  sections.push(`## Tech Stack`, ...analysis.techStack.map((t) => `- ${t}`), "");

  if (analysis.findings.length > 0) {
    sections.push(
      `## Findings`,
      ...analysis.findings.map(
        (f) =>
          `### [${f.severity.toUpperCase()}] ${f.title}\n\n**Category:** ${f.category}  \n**Files:** ${f.files?.join(", ") || "N/A"}\n\n${f.description}`
      ),
      ""
    );
  }

  fs.writeFileSync(path.join(kbDir, "analysis.md"), sections.join("\n"), "utf8");

  // Write INDEX.md
  const index = [
    `# ${repoName} — Raw Analysis`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Files",
    "- [analysis.json](./analysis.json) — structured analysis data",
    "- [analysis.md](./analysis.md) — human-readable analysis",
  ].join("\n");
  fs.writeFileSync(path.join(kbDir, "INDEX.md"), index, "utf8");
}
