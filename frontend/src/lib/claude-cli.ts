// Shared helpers for Claude Code CLI and git operations.
// Used by both the scan engine and the implement phase.

import { execFile } from "child_process";

// ─── Git helper ──────────────────────────────────────────────────

export function gitExec(args: string[], options?: { timeout?: number; cwd?: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("git", args, {
      timeout: options?.timeout ?? 120_000,
      maxBuffer: 10 * 1024 * 1024,
      ...(options?.cwd ? { cwd: options.cwd } : {}),
    }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

// ─── Claude Code CLI ─────────────────────────────────────────────

let _claudeCliAvailable: boolean | null = null;

export function isClaudeCliAvailable(): boolean {
  if (_claudeCliAvailable !== null) return _claudeCliAvailable;
  try {
    require("child_process").execSync("which claude", { stdio: "ignore" });
    _claudeCliAvailable = true;
  } catch {
    _claudeCliAvailable = false;
  }
  return _claudeCliAvailable;
}

export interface ClaudeExecOptions {
  jsonSchema?: object;
  addDirs?: string[];
  model?: string;
  maxBudget?: number;
  systemPrompt?: string;
  timeoutMs?: number;
}

interface ClaudeCliResponse {
  type: string;
  subtype: string;
  is_error: boolean;
  result?: string;
  structured_output?: unknown;
}

export async function claudeExec<T = string>(prompt: string, options: ClaudeExecOptions = {}): Promise<T> {
  const args = [
    "--print",
    "--output-format", "json",
    "--bare",
    "--dangerously-skip-permissions",
    "--model", options.model ?? "sonnet",
    "--max-budget-usd", String(options.maxBudget ?? 0.50),
  ];

  if (options.jsonSchema) {
    args.push("--json-schema", JSON.stringify(options.jsonSchema));
  }
  if (options.addDirs) {
    for (const dir of options.addDirs) {
      args.push("--add-dir", dir);
    }
  }
  if (options.systemPrompt) {
    args.push("--append-system-prompt", options.systemPrompt);
  }

  args.push("-p", prompt);

  return new Promise<T>((resolve, reject) => {
    const child = execFile("claude", args, {
      timeout: options.timeoutMs ?? 600_000, // 10 min default
      maxBuffer: 50 * 1024 * 1024,
      encoding: "utf8",
    }, (err, stdout, stderr) => {
      if (err) {
        const detail = stderr?.trim() || err.message;
        return reject(new Error(`Claude CLI failed: ${detail.slice(0, 500)}`));
      }

      try {
        const response = JSON.parse(stdout.trim()) as ClaudeCliResponse;
        if (response.is_error) {
          return reject(new Error(`Claude CLI error: ${response.result?.slice(0, 500) ?? "unknown"}`));
        }
        if (response.structured_output !== undefined) {
          return resolve(response.structured_output as T);
        }
        if (response.result !== undefined) {
          return resolve(response.result as T);
        }
        reject(new Error(`Unexpected Claude CLI response: ${stdout.slice(0, 300)}`));
      } catch (parseErr) {
        reject(new Error(`Failed to parse Claude CLI output: ${stdout.slice(0, 300)}`));
      }
    });
    // Close stdin immediately so Claude CLI doesn't wait for input
    child.stdin?.end();
  });
}

// ─── Repo lock (in-memory mutex per repo) ────────────────────────

const repoLocks = new Map<string, Promise<void>>();

export async function withRepoLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = repoLocks.get(key) ?? Promise.resolve();
  let release: () => void;
  const next = new Promise<void>((r) => { release = r; });
  repoLocks.set(key, next);
  await prev;
  try {
    return await fn();
  } finally {
    release!();
    if (repoLocks.get(key) === next) repoLocks.delete(key);
  }
}
