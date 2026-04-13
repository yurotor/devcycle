// ScanEngine — clones Azure DevOps repos locally, calls Claude for deep analysis,
// runs cross-repo synthesis, writes KB files, and saves findings to scan_suggestions table.

import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { workspace, pats, repos, scanSuggestions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decryptPat } from "@/lib/crypto";
import { complete, isAIAvailable as isApiAvailable } from "@/lib/anthropic";
import { compileKnowledgeBase } from "@/lib/scan/kb-manager";
import { gitExec, claudeExec, isClaudeCliAvailable } from "@/lib/claude-cli";

// ─── Types ────────────────────────────────────────────────────────

export interface ScanEvent {
  repo: string;
  message: string;
  type: "info" | "success" | "warning" | "finding" | "phase";
  /** Current overall progress percentage (0-85 during analysis). */
  progress?: number;
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
  /** Key files with their purpose — config files, entry points, core business logic. */
  keyFiles?: Array<{ path: string; purpose: string }>;
  /** Things the model encountered but couldn't resolve from code alone. */
  ambiguities?: string[];
}

export interface SystemSynthesis {
  systemOverview: string;
  serviceMap: Array<{ repo: string; role: string; communicatesWith: string[] }>;
  features: Array<{ name: string; description: string; repos: string[]; dataFlow: string }>;
  dataFlows: Array<{ name: string; description: string; steps: string[] }>;
  integrations: Array<{ system: string; direction: string; protocol: string; repos: string[] }>;
  dataModel: Array<{ entity: string; description: string; repos: string[] }>;
  architecturePatterns: Array<{ pattern: string; description: string; repos: string[] }>;
  /** Unresolved gaps aggregated from per-repo analyses + cross-repo observations. */
  ambiguities?: string[];
}

// ─── Incremental synthesis types ──────────────────────────────────

export interface RepoDigest {
  repo: string;
  purpose: string;
  features: string[];
  dependsOn: string[];
  entities: string[];
  externalSystems: string[];
  messagePatterns: string[];
  ambiguities: string[];
}

export interface ClusterAnalysis {
  clusterName: string;
  sharedEntities: Array<{ entity: string; repos: string[]; description: string }>;
  dataFlows: Array<{ name: string; description: string; steps: string[] }>;
  integrationPoints: Array<{ from: string; to: string; mechanism: string; description: string }>;
  patterns: Array<{ pattern: string; description: string; repos: string[] }>;
  ambiguities: string[];
}

export interface BusinessFlowAnalysis {
  flowName: string;
  description: string;
  steps: string[];
  repos: string[];
  entities: string[];
  externalSystems: string[];
  ambiguities: string[];
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
const CONCURRENCY = 4;

/** Returns true if either Claude CLI or API is available. */
export function isAIAvailable(): boolean {
  return isClaudeCliAvailable() || isApiAvailable();
}

// ─── ScanEngine ───────────────────────────────────────────────────

export class ScanEngine {
  private completed = 0;
  private total = 0;
  /** Fractional progress per repo: 0.25 = cloned, 0.5 = tree scanned, 1.0 = analyzed */
  private repoProgress: Map<string, number> = new Map();
  private repoAnalyses: Map<string, DeepRepoAnalysis> = new Map();

  constructor(
    private workspaceId: number,
    private emit: (event: ScanEvent | DoneEvent) => void,
  ) {}

  /** Returns completion percentage (0-85 during analysis, 85-95 during synthesis, 95-100 during compilation). */
  getProgress(): number {
    if (this.total === 0) return 0;
    // Sum completed repos (1.0 each) + partial progress of in-flight repos
    const fractional = Array.from(this.repoProgress.values()).reduce((a, b) => a + b, 0);
    return Math.round((fractional / this.total) * 85);
  }

  private progress(repo: string, message: string, type: ScanEvent["type"] = "info") {
    const pct = this.getProgress();
    this.emit({ repo, message: `[${this.completed}/${this.total}] ${message}`, type, progress: pct });
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

    // ── Phase 2: Cross-repo system synthesis (with retry) ────────
    this.emit({ repo: "system", message: "Phase 2: Synthesizing system-level knowledge...", type: "phase" });

    let synthesis: SystemSynthesis | null = null;
    const SYNTHESIS_RETRIES = 2;
    for (let attempt = 0; attempt <= SYNTHESIS_RETRIES; attempt++) {
      try {
        synthesis = await this.synthesizeSystem();
        this.emit({ repo: "system", message: "System synthesis complete.", type: "success" });
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (attempt < SYNTHESIS_RETRIES) {
          console.warn(`[scan] Synthesis attempt ${attempt + 1} failed, retrying: ${msg}`);
          this.emit({ repo: "system", message: `Synthesis retry ${attempt + 1}/${SYNTHESIS_RETRIES}...`, type: "info" });
          await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
        } else {
          console.error("[scan] Synthesis failed after retries:", msg);
          this.emit({ repo: "system", message: `Synthesis failed: ${msg.slice(0, 120)}`, type: "warning" });
        }
      }
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
    this.repoProgress.set(repoName, 0);

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

      // ── Sub-step: clone done (0.25) ──
      this.repoProgress.set(repoName, 0.25);

      this.progress(repoName, "Reading file tree...");
      const allFiles = walkDir(repoDir, repoDir);
      this.progress(repoName, `${allFiles.length} files found.`);

      // ── Sub-step: clone + tree done (0.5) ──
      this.repoProgress.set(repoName, 0.5);

      // ── Check cache: reuse previous analysis if HEAD hasn't changed ──
      const headHash = await getRepoHeadHash(repoDir);
      const kbDir = path.join(KB_ROOT, "raw", repoName);
      const cached = headHash ? loadCachedAnalysis(kbDir, headHash) : null;

      let analysis: DeepRepoAnalysis;
      if (cached) {
        this.progress(repoName, "Unchanged since last scan — using cached analysis.");
        analysis = cached;
      } else {
        this.progress(repoName, "Deep analysis...");
        analysis = await deepAnalyzeRepo(repoName, repoDir, allFiles);
      }

      // Ensure all required arrays exist (API fallback may return partial data)
      analysis.findings ??= [];
      analysis.businessFeatures ??= [];
      analysis.apis ??= [];
      analysis.dependencies ??= [];
      analysis.dataEntities ??= [];
      analysis.messagingPatterns ??= [];
      analysis.integrations ??= [];
      analysis.architecturePatterns ??= [];
      analysis.techStack ??= [];
      analysis.keyFiles ??= [];
      analysis.ambiguities ??= [];

      // ── Sub-step: analysis done (1.0) ──
      this.repoProgress.set(repoName, 1);

      // Store for synthesis pass
      this.repoAnalyses.set(repoName, analysis);

      // Write raw output (include HEAD hash for future cache hits)
      fs.mkdirSync(kbDir, { recursive: true });
      writeRepoAnalysis(kbDir, repoName, analysis, headHash);

      // Save findings (filter out malformed entries from Claude)
      const findings = (analysis.findings ?? []).filter(
        (f) => f.severity && f.category && f.title
      );
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
      this.repoProgress.set(repoName, 1); // count as done so progress keeps moving
      this.progress(repoName, `Error: ${msg.slice(0, 120)}`, "warning");
      return 0;
    }
  }

  // ── Cross-repo synthesis ──────────────────────────────────────

  private async synthesizeSystem(): Promise<SystemSynthesis | null> {
    if (this.repoAnalyses.size === 0) return null;

    // Skip synthesis if cached result is newer than all repo analyses
    const rawDir = path.join(KB_ROOT, "raw");
    const synthPath = path.join(rawDir, "system-synthesis.json");
    if (fs.existsSync(synthPath)) {
      const synthMtime = fs.statSync(synthPath).mtimeMs;
      const analysisPaths = Array.from(this.repoAnalyses.keys()).map(
        (name) => path.join(rawDir, name, "analysis.json")
      );
      const allOlder = analysisPaths.every((p) => {
        try { return fs.statSync(p).mtimeMs <= synthMtime; } catch { return true; }
      });
      if (allOlder) {
        console.log("[synthesis] Cached synthesis is up to date — skipping.");
        this.emit({ repo: "system", message: "Synthesis unchanged — using cached result.", type: "info" });
        return JSON.parse(fs.readFileSync(synthPath, "utf8")) as SystemSynthesis;
      }
    }

    return runSynthesis(this.repoAnalyses);
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

const DEEP_ANALYSIS_SCHEMA = {
  type: "object",
  required: ["purpose", "businessFeatures", "apis", "dependencies", "dataEntities", "messagingPatterns", "integrations", "architecturePatterns", "techStack", "findings"],
  properties: {
    purpose: { type: "string" },
    businessFeatures: { type: "array", items: { type: "string" } },
    apis: { type: "array", items: { type: "object", properties: { endpoint: { type: "string" }, method: { type: "string" }, purpose: { type: "string" } }, required: ["endpoint", "method", "purpose"] } },
    dependencies: { type: "array", items: { type: "object", properties: { target: { type: "string" }, type: { type: "string" } }, required: ["target", "type"] } },
    dataEntities: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" } }, required: ["name", "description"] } },
    messagingPatterns: { type: "array", items: { type: "object", properties: { type: { type: "string" }, name: { type: "string" }, description: { type: "string" } }, required: ["type", "name", "description"] } },
    integrations: { type: "array", items: { type: "object", properties: { system: { type: "string" }, direction: { type: "string" }, protocol: { type: "string" } }, required: ["system", "direction", "protocol"] } },
    architecturePatterns: { type: "array", items: { type: "string" } },
    techStack: { type: "array", items: { type: "string" } },
    findings: { type: "array", items: { type: "object", properties: { severity: { type: "string" }, category: { type: "string" }, title: { type: "string" }, description: { type: "string" }, files: { type: "array", items: { type: "string" } } }, required: ["severity", "category", "title", "description"] } },
    keyFiles: { type: "array", items: { type: "object", properties: { path: { type: "string" }, purpose: { type: "string" } }, required: ["path", "purpose"] } },
    ambiguities: { type: "array", items: { type: "string" } },
  },
};

const REPO_ANALYSIS_PROMPT = `Deeply analyze this repository. Read the key files to understand its purpose, business features, APIs, data entities, dependencies, integrations, and architecture patterns.

Adapt your focus to the type of repository:
- Infrastructure-as-code (Terraform, Bicep, ARM, Pulumi): focus on environments, deployed resources, networking topology, service-to-service wiring, secrets/config references.
- UI/frontend (React, Angular, Vue, Blazor): focus on screens, user flows, forms, navigation, which API endpoints the UI calls, state management.
- WebAPI/backend service (.NET controllers, Express routes, FastAPI): focus on endpoints, request/response contracts, downstream service calls, queue consumers/producers.
- Database/migrations: focus on tables, columns, relationships, indexes, stored procedures, seed data.
- Multi-purpose repos: identify ALL roles the repo serves.

For ambiguities: list ONLY CONCRETE things referencing a specific service, config value, entity, or code reference by name. Examples:
- "References 'VampireClient' in LoanController but the Vampire system's purpose and API contract are unknown"
- "Config key 'GROOMING_THRESHOLD' is used in batch processing but its business meaning is unclear"
Do NOT flag: vague questions, auth/authz, security, tech stack, CI/CD, compliance, team structure.

For keyFiles: list the most important files in the repo — configuration files, entry points, core business logic, data models, mapping files. Include the file path relative to the repo root and a one-line description of what the file does. Aim for 5-15 files.

Be thorough. Identify ALL business features, APIs, dependencies, data entities, messaging patterns, and external integrations visible in the code. Only include critical and high severity findings.`;

async function deepAnalyzeRepo(
  repoName: string,
  repoDir: string,
  fileTree: string[],
): Promise<DeepRepoAnalysis> {
  // Prefer Claude CLI (no API Gateway timeout, can read files directly)
  if (isClaudeCliAvailable()) {
    try {
      console.log(`[scan] Analyzing ${repoName} via Claude CLI (${fileTree.length} files)...`);
      const result = await claudeExec<DeepRepoAnalysis>(REPO_ANALYSIS_PROMPT, {
        jsonSchema: DEEP_ANALYSIS_SCHEMA,
        addDirs: [repoDir],
        model: "sonnet",
        maxBudget: 0.50,
        systemPrompt: "You are a senior software architect performing deep codebase analysis. Explore the repository using Read, Grep, and Glob tools to understand its structure and purpose.",
        timeoutMs: 300_000, // 5 min per repo
      });
      return result;
    } catch (err) {
      console.error(`[scan] CLI analysis failed for ${repoName}:`, err instanceof Error ? err.message : err);
      // Fall through to API or stub
    }
  }

  // Fallback: use API with file-stuffing approach
  if (isApiAvailable()) {
    try {
      const fileListSection = fileTree.slice(0, 150).join("\n");
      const fileContents = readLocalFiles(repoDir, selectKeyFiles(fileTree));
      const fileContentSection = fileContents
        .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
        .join("\n\n");

      const raw = await complete(
        [
          {
            role: "user",
            content: `${REPO_ANALYSIS_PROMPT}\n\nRepository: ${repoName}\nTotal files: ${fileTree.length}\n\nFile tree (first 150):\n${fileListSection}\n\nKey file contents:\n${fileContentSection}`,
          },
        ],
        {
          system: "You are a senior software architect performing deep codebase analysis. Return valid JSON only — no markdown fences, no explanation outside the JSON.",
          maxTokens: 4096,
        }
      );

      const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();
      return JSON.parse(cleaned) as DeepRepoAnalysis;
    } catch (err) {
      console.error(`[scan] API analysis failed for ${repoName}, falling back to stub:`, err);
    }
  }

  return deepAnalyzeStub(repoName, fileTree);
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
    ambiguities: [],
  };
}

// ─── Synthesis (reusable — called during scan and after interview) ──

const cleanJson = (s: string) => s.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();

const SYNTHESIS_SCHEMA = {
  type: "object",
  required: ["systemOverview", "serviceMap", "features", "dataFlows", "integrations", "dataModel", "architecturePatterns"],
  properties: {
    systemOverview: { type: "string" },
    serviceMap: { type: "array", items: { type: "object", properties: { repo: { type: "string" }, role: { type: "string" }, communicatesWith: { type: "array", items: { type: "string" } } }, required: ["repo", "role", "communicatesWith"] } },
    features: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, repos: { type: "array", items: { type: "string" } }, dataFlow: { type: "string" } }, required: ["name", "description", "repos", "dataFlow"] } },
    dataFlows: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, steps: { type: "array", items: { type: "string" } } }, required: ["name", "description", "steps"] } },
    integrations: { type: "array", items: { type: "object", properties: { system: { type: "string" }, direction: { type: "string" }, protocol: { type: "string" }, repos: { type: "array", items: { type: "string" } } }, required: ["system", "direction", "protocol", "repos"] } },
    dataModel: { type: "array", items: { type: "object", properties: { entity: { type: "string" }, description: { type: "string" }, repos: { type: "array", items: { type: "string" } } }, required: ["entity", "description", "repos"] } },
    architecturePatterns: { type: "array", items: { type: "object", properties: { pattern: { type: "string" }, description: { type: "string" }, repos: { type: "array", items: { type: "string" } } }, required: ["pattern", "description", "repos"] } },
    ambiguities: { type: "array", items: { type: "string" } },
  },
};

export async function runSynthesis(
  repoAnalyses: Map<string, DeepRepoAnalysis>,
  interviewTranscript?: string,
): Promise<SystemSynthesis | null> {
  if (repoAnalyses.size === 0) return null;

  const rawDir = path.join(KB_ROOT, "raw");

  const interviewSection = interviewTranscript
    ? `\n\nAdditional context from user interview (takes precedence over inferences from code):\n${interviewTranscript}`
    : "";

  const synthesisPrompt = `Read all the analysis.json files in the subdirectories of the raw/ folder. Each subdirectory is a repository analysis. Cross-reference all repositories to produce a system-level synthesis.

Identify:
- System overview: what the system does, its business purpose, how repos work together
- Service map: each repo's role and which other repos it communicates with
- Business features: end-to-end features spanning multiple repos, with data flow descriptions
- Data flows: major end-to-end data flows through the system
- Integrations: external systems the system communicates with
- Data model: shared entities across repos
- Architecture patterns: patterns used across the system

For ambiguities: ONLY flag CONCRETE gaps with specific references. Examples of GOOD ambiguities:
- "[repo-name] References 'VampireClient' but the Vampire system's purpose is unknown"
- "[repo-name] Config 'GROOMING_THRESHOLD' has unclear business meaning"
Examples of BAD ambiguities (do NOT include):
- "How pricing decisions are made" (too vague)
- "Authentication model" (visible in code)
Do NOT flag: auth/authz, security, tech stack, CI/CD, compliance, team structure.${interviewSection}`;

  // Prefer Claude CLI (single session, reads files directly, no timeout)
  if (isClaudeCliAvailable()) {
    try {
      console.log(`[synthesis] Running via Claude CLI (${repoAnalyses.size} repos)...`);
      const synthesis = await claudeExec<SystemSynthesis>(synthesisPrompt, {
        jsonSchema: SYNTHESIS_SCHEMA,
        addDirs: [rawDir],
        model: "sonnet",
        maxBudget: 1.00,
        systemPrompt: "You are a senior enterprise architect producing a system-level synthesis. Read the analysis.json files using the Read tool to understand each repository before synthesizing.",
        timeoutMs: 600_000, // 10 min for full synthesis
      });

      fs.writeFileSync(
        path.join(rawDir, "system-synthesis.json"),
        JSON.stringify(synthesis, null, 2),
        "utf8"
      );

      console.log(`[synthesis] Complete: ${synthesis.features?.length ?? 0} features, ${synthesis.dataFlows?.length ?? 0} flows, ${synthesis.ambiguities?.length ?? 0} ambiguities`);
      return synthesis;
    } catch (err) {
      console.error("[synthesis] CLI synthesis failed:", err instanceof Error ? err.message : err);
      // Fall through to API fallback
    }
  }

  // Fallback: API-based synthesis (compact payload for gateway timeout)
  if (isApiAvailable()) {
    const repoSummaries = Array.from(repoAnalyses.entries()).map(([name, a]) => ({
      repo: name,
      purpose: a.purpose,
      features: a.businessFeatures,
      dependsOn: a.dependencies.map((d) => d.target),
      entities: a.dataEntities.map((e) => e.name),
      integrations: a.integrations.map((i) => i.system),
      ambiguities: a.ambiguities ?? [],
    }));

    try {
      const raw = await complete(
        [
          {
            role: "user",
            content: `${synthesisPrompt}\n\nRepo summaries:\n${JSON.stringify(repoSummaries)}`,
          },
        ],
        {
          system: "You are a senior enterprise architect. Return valid JSON only — no markdown fences. Be concise.",
          maxTokens: 4096,
        }
      );
      const synthesis = JSON.parse(cleanJson(raw)) as SystemSynthesis;
      fs.writeFileSync(path.join(rawDir, "system-synthesis.json"), JSON.stringify(synthesis, null, 2), "utf8");
      return synthesis;
    } catch (err) {
      console.error("[synthesis] API synthesis failed:", err instanceof Error ? err.message : err);
    }
  }

  // Stub fallback
  const stub: SystemSynthesis = {
    systemOverview: `System with ${repoAnalyses.size} repositories.`,
    serviceMap: Array.from(repoAnalyses.entries()).map(([name, a]) => ({
      repo: name,
      role: a.purpose,
      communicatesWith: a.dependencies.map((d) => d.target),
    })),
    features: Array.from(repoAnalyses.entries()).flatMap(([name, a]) =>
      a.businessFeatures.map((f) => ({ name: f, description: "", repos: [name], dataFlow: "" }))
    ),
    dataFlows: [],
    integrations: Array.from(repoAnalyses.entries()).flatMap(([name, a]) =>
      a.integrations.map((i) => ({ ...i, repos: [name] }))
    ),
    dataModel: Array.from(repoAnalyses.entries()).flatMap(([name, a]) =>
      a.dataEntities.map((e) => ({ entity: e.name, description: e.description, repos: [name] }))
    ),
    architecturePatterns: [],
    ambiguities: Array.from(repoAnalyses.entries()).flatMap(([name, a]) =>
      (a.ambiguities ?? []).map((amb) => `[${name}] ${amb}`)
    ),
  };
  fs.writeFileSync(path.join(rawDir, "system-synthesis.json"), JSON.stringify(stub, null, 2), "utf8");
  return stub;
}

// ─── Load repo analyses from disk (for re-synthesis after interview) ──

export function loadRepoAnalyses(): Map<string, DeepRepoAnalysis> {
  const analyses = new Map<string, DeepRepoAnalysis>();
  const rawDir = path.join(KB_ROOT, "raw");
  if (!fs.existsSync(rawDir)) return analyses;

  for (const entry of fs.readdirSync(rawDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const jsonPath = path.join(rawDir, entry.name, "analysis.json");
    if (!fs.existsSync(jsonPath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      const { _headHash, ...analysis } = raw;
      analyses.set(entry.name, analysis as DeepRepoAnalysis);
    } catch { /* skip */ }
  }

  return analyses;
}

// ─── Cache helpers ──────────────────────────────────────────────

async function getRepoHeadHash(repoDir: string): Promise<string | undefined> {
  try {
    const hash = await gitExec(["rev-parse", "HEAD"], { timeout: 5000, cwd: repoDir });
    return hash.trim() || undefined;
  } catch {
    return undefined;
  }
}

function loadCachedAnalysis(kbDir: string, headHash: string): DeepRepoAnalysis | null {
  try {
    const jsonPath = path.join(kbDir, "analysis.json");
    if (!fs.existsSync(jsonPath)) return null;
    const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    if (raw._headHash !== headHash) return null;
    // Reject stubs — they need re-analysis with Claude
    if (typeof raw.purpose === "string" && raw.purpose.includes("(Stub —")) return null;
    // Strip the cache key before returning
    const { _headHash, ...analysis } = raw;
    return analysis as DeepRepoAnalysis;
  } catch {
    return null;
  }
}

// ─── KB file writing ─────────────────────────────────────────────

function writeRepoAnalysis(kbDir: string, repoName: string, analysis: DeepRepoAnalysis, headHash?: string): void {
  // Write structured JSON (include HEAD hash for cache validation)
  const payload = headHash ? { _headHash: headHash, ...analysis } : analysis;
  fs.writeFileSync(
    path.join(kbDir, "analysis.json"),
    JSON.stringify(payload, null, 2),
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

  const validFindings = analysis.findings.filter((f) => f.severity && f.category && f.title);
  if (validFindings.length > 0) {
    sections.push(
      `## Findings`,
      ...validFindings.map(
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
