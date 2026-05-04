// Shared helpers for Claude Code CLI and git operations.
// Used by both the scan engine and the implement phase.

import { execFile, spawn } from "child_process";

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
  cwd?: string;
  model?: string;
  maxBudget?: number;
  systemPrompt?: string;
  timeoutMs?: number;
  /** Start a new session with this UUID (first turn of a multi-turn conversation). */
  sessionId?: string;
  /** Resume an existing session by UUID (subsequent turns). */
  resumeSessionId?: string;
  /** Restrict available tools (e.g. ["Read", "Grep", "Glob"] for read-only). */
  allowedTools?: string[];
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
  if (options.allowedTools?.length) {
    args.push("--allowedTools", options.allowedTools.join(","));
  }

  args.push("-p", prompt);

  // Resolve full path to claude CLI — execFile in Node may not find it in PATH
  let cliPath = process.env.CLAUDE_CLI_PATH || "";
  if (!cliPath) {
    try {
      cliPath = require("child_process").execSync("which claude", { encoding: "utf8" }).trim();
    } catch {
      cliPath = `${process.env.HOME}/.npm-global/bin/claude`;
    }
  }

  return new Promise<T>((resolve, reject) => {
    console.log(`[claude-cli] Spawning: ${cliPath} ${args.slice(0, 6).join(" ")}... (cwd: ${options.cwd ?? "default"}, timeout: ${options.timeoutMs ?? 600_000}ms)`);
    const child = execFile(cliPath, args, {
      timeout: options.timeoutMs ?? 600_000, // 10 min default
      maxBuffer: 50 * 1024 * 1024,
      encoding: "utf8",
      ...(options.cwd ? { cwd: options.cwd } : {}),
      env: { ...process.env, PATH: `${process.env.HOME}/.npm-global/bin:${process.env.PATH}` },
    }, (err, stdout, stderr) => {
      if (err) {
        const detail = stderr?.trim() || err.message;
        console.error(`[claude-cli] Failed: ${detail.slice(0, 300)}`);
        return reject(new Error(`Claude CLI failed: ${detail.slice(0, 500)}`));
      }
      console.log(`[claude-cli] Completed. Output length: ${stdout.length}`);

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
    child.stdin?.end();
  });
}

// ─── Claude Code CLI (streaming) ─────────────────────────────────

export interface ClaudeStreamCallbacks {
  /** Called each time Claude invokes a tool (Read, Edit, Bash, etc.) */
  onToolUse?: (toolName: string, toolInput: unknown) => void;
  /** Called when a text content block is received (streaming thinking / response text) */
  onText?: (text: string) => void;
}

export interface ClaudeStreamResult<T = string> {
  result: T;
  /** The session ID from the result event — use to resume this session. */
  sessionId?: string;
}

export async function claudeExecStreaming<T = string>(
  prompt: string,
  options: ClaudeExecOptions & ClaudeStreamCallbacks = {}
): Promise<ClaudeStreamResult<T>> {
  const isResume = !!options.resumeSessionId;

  const args = [
    "--print",
    "--output-format", "stream-json",
    "--verbose",
    "--dangerously-skip-permissions",
    "--model", options.model ?? "sonnet",
    "--max-budget-usd", String(options.maxBudget ?? 0.50),
  ];

  // Session management: --resume reuses an existing session, --session-id starts a new one.
  // --bare is incompatible with --resume (it disables session persistence).
  if (isResume) {
    args.push("--resume", options.resumeSessionId!);
  } else {
    args.push("--bare");
    if (options.sessionId) {
      args.push("--session-id", options.sessionId);
    }
  }

  if (options.jsonSchema) {
    args.push("--json-schema", JSON.stringify(options.jsonSchema));
  }
  if (options.addDirs) {
    for (const dir of options.addDirs) {
      args.push("--add-dir", dir);
    }
  }
  if (options.systemPrompt && !isResume) {
    // System prompt is only set on the first turn — resumed sessions already have it
    args.push("--append-system-prompt", options.systemPrompt);
  }
  if (options.allowedTools?.length) {
    args.push("--allowedTools", options.allowedTools.join(","));
  }

  args.push("-p", prompt);

  let cliPath = process.env.CLAUDE_CLI_PATH || "";
  if (!cliPath) {
    try {
      cliPath = require("child_process").execSync("which claude", { encoding: "utf8" }).trim();
    } catch {
      cliPath = `${process.env.HOME}/.npm-global/bin/claude`;
    }
  }

  return new Promise<ClaudeStreamResult<T>>((resolve, reject) => {
    console.log(`[claude-cli-stream] Spawning: ${cliPath} ${args.slice(0, 6).join(" ")}... (cwd: ${options.cwd ?? "default"}, timeout: ${options.timeoutMs ?? 600_000}ms)`);

    const child = spawn(cliPath, args, {
      cwd: options.cwd,
      env: { ...process.env, PATH: `${process.env.HOME}/.npm-global/bin:${process.env.PATH}` },
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdin?.end();

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Claude CLI timed out after ${options.timeoutMs ?? 600_000}ms`));
    }, options.timeoutMs ?? 600_000);

    let lastResult: (ClaudeCliResponse & { session_id?: string }) | null = null;
    let buffer = "";

    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      // Keep the last partial line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);

          // Assistant messages: tool_use and text content blocks
          if (event.type === "assistant" && event.message?.content) {
            for (const block of event.message.content) {
              if (block.type === "tool_use" && options.onToolUse) {
                options.onToolUse(block.name, block.input);
              }
              if (block.type === "text" && block.text && options.onText) {
                options.onText(block.text);
              }
            }
          }

          // Capture the final result event
          if (event.type === "result") {
            lastResult = event as ClaudeCliResponse;
          }
        } catch {
          // Partial or malformed JSON line — skip
        }
      }
    });

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timeout);

      if (code !== 0 && !lastResult) {
        const detail = stderr.trim() || `Process exited with code ${code}`;
        console.error(`[claude-cli-stream] Failed: ${detail.slice(0, 300)}`);
        return reject(new Error(`Claude CLI failed: ${detail.slice(0, 500)}`));
      }

      if (!lastResult) {
        return reject(new Error("Claude CLI produced no result event"));
      }

      console.log(`[claude-cli-stream] Completed. Session: ${lastResult.session_id ?? "none"}`);

      const sid = lastResult.session_id;
      if (lastResult.is_error) {
        return reject(new Error(`Claude CLI error: ${lastResult.result?.slice(0, 500) ?? "unknown"}`));
      }
      if (lastResult.structured_output !== undefined) {
        return resolve({ result: lastResult.structured_output as T, sessionId: sid });
      }
      if (lastResult.result !== undefined) {
        return resolve({ result: lastResult.result as T, sessionId: sid });
      }
      reject(new Error("Unexpected Claude CLI response"));
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to spawn Claude CLI: ${err.message}`));
    });
  });
}

// ─── Repo lock (in-memory mutex per repo) ────────────────────────

const repoLocks = new Map<string, { promise: Promise<void>; acquiredAt: number }>();
const LOCK_TIMEOUT = 10 * 60 * 1000; // 10 minutes — if a lock is held longer, it's dead

export async function withRepoLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  // Check for stale locks
  const existing = repoLocks.get(key);
  if (existing && Date.now() - existing.acquiredAt > LOCK_TIMEOUT) {
    console.warn(`[repo-lock] Clearing stale lock for "${key}" (held for ${Math.round((Date.now() - existing.acquiredAt) / 1000)}s)`);
    repoLocks.delete(key);
  }

  const prev = repoLocks.get(key)?.promise ?? Promise.resolve();
  let release: () => void;
  const next = new Promise<void>((r) => { release = r; });
  repoLocks.set(key, { promise: next, acquiredAt: Date.now() });

  // Wait for previous lock with a timeout
  await Promise.race([
    prev,
    new Promise<void>((resolve) => setTimeout(() => {
      console.warn(`[repo-lock] Timed out waiting for lock "${key}", proceeding anyway`);
      resolve();
    }, 30_000)),
  ]);

  try {
    return await fn();
  } finally {
    release!();
    if (repoLocks.get(key)?.promise === next) repoLocks.delete(key);
  }
}
