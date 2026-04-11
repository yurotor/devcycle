// ScanEngine — clones Azure DevOps repos locally, calls Claude for analysis,
// writes KB files to kb/raw/<repo>/, and saves findings to scan_suggestions table.

import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { db } from "@/lib/db";
import { workspace, pats, repos, scanSuggestions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decryptPat } from "@/lib/crypto";
// import { complete } from "@/lib/anthropic"; // TODO: re-enable when Claude API is reachable
import { compileKnowledgeBase } from "@/lib/scan/kb-manager";

// ─── Types ────────────────────────────────────────────────────────

export interface ScanEvent {
  repo: string;
  message: string;
  type: "info" | "success" | "warning" | "finding";
}

export interface DoneEvent {
  type: "done";
  summary: { repos: number; findings: number };
}

// ─── Constants ────────────────────────────────────────────────────

// kb/ lives at the monorepo root, one level above the Next.js frontend/
const KB_ROOT = path.join(process.cwd(), "..", "kb");
const REPOS_DIR = path.join(KB_ROOT, "repos");

const PRIORITY_FILENAMES = [
  "README.md",
  "readme.md",
  "README",
  "package.json",
  "go.mod",
  "requirements.txt",
  "pom.xml",
  "Cargo.toml",
  "pyproject.toml",
  "tsconfig.json",
  ".env.example",
  "docker-compose.yml",
  "docker-compose.yaml",
  "Dockerfile",
  "index.ts",
  "index.js",
  "main.go",
  "main.ts",
  "main.py",
  "app.py",
  "server.ts",
  "server.js",
  "app.ts",
];

const MAX_FILES_PER_REPO = 20;
const MAX_FILE_CHARS = 4000;
const CONCURRENCY = 4;

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

  constructor(
    private workspaceId: number,
    private emit: (event: ScanEvent | DoneEvent) => void
  ) {}

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

    // Get credentials for git clone
    const [ws] = await db.select().from(workspace).where(eq(workspace.id, this.workspaceId));
    if (!ws) throw new Error("Workspace not configured");

    const [pat] = await db.select().from(pats).where(eq(pats.workspaceId, ws.id)).limit(1);
    if (!pat) throw new Error("Azure DevOps PAT not found");

    const plainPat = decryptPat(pat.encryptedPat, pat.iv);

    // Parse org name from azureOrgUrl (e.g. "https://dev.azure.com/crossriverbank")
    const orgUrl = new URL(ws.azureOrgUrl.trim().replace(/\/$/, ""));
    const orgName = orgUrl.pathname.split("/").filter(Boolean)[0];
    if (!orgName) throw new Error("Could not parse org name from Azure DevOps URL");

    // Clear old suggestions
    await db.delete(scanSuggestions).where(eq(scanSuggestions.workspaceId, this.workspaceId));

    // Ensure directories exist
    fs.mkdirSync(KB_ROOT, { recursive: true });
    fs.mkdirSync(path.join(KB_ROOT, "raw"), { recursive: true });
    fs.mkdirSync(REPOS_DIR, { recursive: true });

    this.emit({
      repo: "system",
      message: `Starting scan of ${repoRows.length} repos (${CONCURRENCY} parallel)...`,
      type: "info",
    });

    // Scan repos with concurrency cap
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

    // ── Compile knowledge base (wiki, schema, CLAUDE.md) ────────
    this.emit({ repo: "system", message: "Compiling knowledge base...", type: "info" });
    const kb = compileKnowledgeBase();
    this.emit({
      repo: "system",
      message: `KB compiled: ${kb.wikiFiles} wiki pages, ${kb.schemaFiles} schema files, CLAUDE.md generated.`,
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

      // ── Clone (skip if already exists) ─────────────────────────
      if (fs.existsSync(path.join(repoDir, ".git"))) {
        this.progress(repoName, "Already cloned, skipping.");
      } else {
        this.progress(repoName, `Cloning (branch: ${branch})...`);
        fs.rmSync(repoDir, { recursive: true, force: true });
        await gitExec(["clone", "--depth", "1", "--branch", branch, cloneUrl, repoDir]);
        this.progress(repoName, "Cloned.");
      }

      // ── Walk local file tree ───────────────────────────────────
      this.progress(repoName, "Reading file tree...");
      const allFiles = walkDir(repoDir, repoDir);
      const selected = selectKeyFiles(allFiles);
      this.progress(repoName, `${allFiles.length} files found, ${selected.length} selected for analysis.`);

      // ── Read file contents from disk ───────────────────────────
      const fileContents = readLocalFiles(repoDir, selected);

      // ── Analysis (stub until Claude API is connected) ─────────
      this.progress(repoName, "Analyzing...");
      const analysis = analyzeRepo(repoName, allFiles, fileContents);

      // ── Write KB files ─────────────────────────────────────────
      const kbDir = path.join(KB_ROOT, "raw", repoName);
      fs.mkdirSync(kbDir, { recursive: true });
      writeKbFiles(kbDir, repoName, analysis);

      // ── Save findings ──────────────────────────────────────────
      const findings = analysis.findings ?? [];
      await this.saveFindings(repoName, findings);

      const criticalCount = findings.filter((f) => f.severity === "critical").length;
      const highCount = findings.filter((f) => f.severity === "high").length;

      if (findings.length > 0) {
        this.progress(repoName, `Done — ${criticalCount} critical, ${highCount} high findings`, "finding");
      } else {
        this.progress(repoName, "Done — no critical findings", "success");
      }

      return findings.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[scan] ${repoName} error:`, msg);
      this.progress(repoName, `Error: ${msg.slice(0, 120)}`, "warning");
      return 0;
    }
  }

  // ── Save findings ─────────────────────────────────────────────

  private async saveFindings(
    repoName: string,
    findings: AnalysisFinding[]
  ): Promise<void> {
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

/** Walk a directory recursively and return relative file paths. */
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

/** Read files from disk, truncating to MAX_FILE_CHARS. */
function readLocalFiles(
  repoDir: string,
  filePaths: string[]
): Array<{ path: string; content: string }> {
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
      // File not readable — skip (binary, permissions, etc.)
    }
  }

  return results;
}

// ─── File selection ───────────────────────────────────────────────

function selectKeyFiles(tree: string[]): string[] {
  const selected: string[] = [];
  const seen = new Set<string>();

  for (const filename of PRIORITY_FILENAMES) {
    const match = tree.find(
      (f) =>
        f === filename ||
        f.endsWith(`/${filename}`) ||
        f === filename.toLowerCase()
    );
    if (match && !seen.has(match)) {
      selected.push(match);
      seen.add(match);
    }
    if (selected.length >= MAX_FILES_PER_REPO) break;
  }

  if (selected.length < MAX_FILES_PER_REPO) {
    const sourceExts = [".ts", ".go", ".py", ".java", ".cs", ".rb", ".rs", ".kt", ".swift", ".js", ".jsx", ".tsx"];
    for (const file of tree) {
      if (seen.has(file)) continue;
      if (!file.includes("node_modules/") && !file.includes("vendor/") && !file.includes(".min.")) {
        const ext = path.extname(file);
        if (sourceExts.includes(ext) && !file.includes("test") && !file.includes("spec") && !file.includes("__")) {
          selected.push(file);
          seen.add(file);
          if (selected.length >= MAX_FILES_PER_REPO) break;
        }
      }
    }
  }

  return selected;
}

// ─── Claude analysis ──────────────────────────────────────────────

interface AnalysisFinding {
  severity: "critical" | "high";
  category: "security" | "architecture" | "optimization" | "bug";
  title: string;
  description: string;
  files?: string[];
}

interface RepoAnalysis {
  summary: string;
  architecture: string;
  findings: AnalysisFinding[];
}

// TODO: replace stub with real Claude analysis when API is reachable
function analyzeRepo(
  repoName: string,
  fileTree: string[],
  fileContents: Array<{ path: string; content: string }>
): RepoAnalysis {
  // Detect tech stack from file extensions
  const extCounts: Record<string, number> = {};
  for (const f of fileTree) {
    const ext = path.extname(f).toLowerCase();
    if (ext) extCounts[ext] = (extCounts[ext] ?? 0) + 1;
  }
  const topExts = Object.entries(extCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ext, count]) => `${ext} (${count})`)
    .join(", ");

  const hasPackageJson = fileTree.some((f) => f === "package.json" || f.endsWith("/package.json"));
  const hasCsproj = fileTree.some((f) => f.endsWith(".csproj"));
  const hasPython = fileTree.some((f) => f.endsWith(".py"));
  const hasGo = fileTree.some((f) => f.endsWith(".go"));
  const hasDockerfile = fileTree.some((f) => f.includes("Dockerfile"));

  const stack: string[] = [];
  if (hasCsproj) stack.push(".NET/C#");
  if (hasPackageJson) stack.push("Node.js");
  if (hasPython) stack.push("Python");
  if (hasGo) stack.push("Go");
  if (hasDockerfile) stack.push("Docker");

  const summary = [
    `Repository "${repoName}" contains ${fileTree.length} files.`,
    stack.length > 0 ? `Tech stack: ${stack.join(", ")}.` : "",
    `Top file types: ${topExts}.`,
    `Key files analyzed: ${fileContents.map((f) => f.path).join(", ") || "none"}.`,
    "",
    "(Stub analysis — AI analysis will replace this when Claude API is connected.)",
  ].filter(Boolean).join(" ");

  const architecture = [
    `## ${repoName} — Structure`,
    "",
    `Total files: ${fileTree.length}`,
    `Top-level directories: ${[...new Set(fileTree.map((f) => f.split("/")[0]))].slice(0, 10).join(", ")}`,
    "",
    "(Stub analysis — AI-generated architecture overview will appear here.)",
  ].join("\n");

  return { summary, architecture, findings: [] };
}

// ─── KB file writing ──────────────────────────────────────────────

function writeKbFiles(repoDir: string, repoName: string, analysis: RepoAnalysis): void {
  const files: Array<{ name: string; content: string }> = [
    {
      name: "summary.md",
      content: `# ${repoName} — Summary\n\n${analysis.summary}\n`,
    },
    {
      name: "architecture.md",
      content: `# ${repoName} — Architecture\n\n${analysis.architecture}\n`,
    },
  ];

  if (analysis.findings.length > 0) {
    const findingsMd = analysis.findings
      .map(
        (f) =>
          `## [${f.severity.toUpperCase()}] ${f.title}\n\n` +
          `**Category:** ${f.category}  \n` +
          `**Files:** ${f.files?.join(", ") || "N/A"}\n\n` +
          `${f.description}\n`
      )
      .join("\n---\n\n");

    files.push({
      name: "findings.md",
      content: `# ${repoName} — Findings\n\n${findingsMd}`,
    });
  }

  for (const file of files) {
    fs.writeFileSync(path.join(repoDir, file.name), file.content, "utf8");
  }

  const index = [
    `# ${repoName} — Index\n`,
    `Generated: ${new Date().toISOString()}\n`,
    "## Files\n",
    ...files.map((f) => `- [${f.name}](./${f.name})`),
  ].join("\n");
  fs.writeFileSync(path.join(repoDir, "INDEX.md"), index, "utf8");
}
