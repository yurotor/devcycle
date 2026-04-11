// Claude API client — supports Amazon Bedrock Converse API and direct Anthropic API.
//
// Uses curl via child_process to bypass Next.js Turbopack's fetch patching,
// which routes requests through an internal proxy with wrong IPs.
//
// Bedrock (env vars):
//   BEDROCK_URL     — full endpoint, e.g. https://.../prod/converse
//   BEDROCK_API_KEY — Bearer token
//   MODEL_ID        — e.g. anthropic.claude-3-7-sonnet-20250219-v1:0
//
// Anthropic fallback:
//   ANTHROPIC_API_KEY

import { execFile } from "child_process";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

// ─── HTTP via curl (async) ───────────────────────────────────────

function httpPost(url: string, headers: Record<string, string>, body: string, timeoutMs = 300_000): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const args = ["-sS", "-X", "POST", "-w", "\n__HTTP_STATUS__%{http_code}", "--max-time", String(Math.ceil(timeoutMs / 1000))];
    for (const [k, v] of Object.entries(headers)) {
      args.push("-H", `${k}: ${v}`);
    }
    args.push("--data-binary", "@-");
    args.push(url);

    const child = execFile("curl", args, {
      encoding: "utf8",
      timeout: timeoutMs + 5_000, // node timeout slightly longer than curl's
      maxBuffer: 10 * 1024 * 1024,
    }, (err, stdout, stderr) => {
      if (err) {
        const detail = stderr?.trim() || err.message;
        return reject(new Error(`API request failed: ${detail}`));
      }

      const statusMatch = stdout.match(/__HTTP_STATUS__(\d+)$/);
      const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
      const responseBody = stdout.replace(/__HTTP_STATUS__\d+$/, "").trim();

      resolve({ status, body: responseBody });
    });

    child.stdin?.write(body);
    child.stdin?.end();
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Bedrock Converse API ─────────────────────────────────────────

interface ConverseRequest {
  modelId: string;
  messages: Array<{ role: string; content: Array<{ text: string }> }>;
  system?: Array<{ text: string }>;
  inferenceConfig?: { maxTokens?: number };
}

interface ConverseResponse {
  // Standard Bedrock Converse API shape
  output?: {
    message: {
      content: Array<{ text: string }>;
    };
  };
  // Custom gateway wrapper shape
  bedrock_response?: {
    message: {
      content: Array<{ text: string }>;
    };
  };
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000]; // exponential backoff

async function completeViaBedrock(
  messages: Message[],
  system: string | undefined,
  maxTokens: number
): Promise<string> {
  const url = process.env.BEDROCK_URL!.trim();
  const key = process.env.BEDROCK_API_KEY!.trim();
  const modelId = process.env.MODEL_ID!.trim();

  const body: ConverseRequest = {
    modelId,
    messages: messages.map((m) => ({
      role: m.role,
      content: [{ text: m.content }],
    })),
    ...(system ? { system: [{ text: system }] } : {}),
    inferenceConfig: { maxTokens },
  };

  const payload = JSON.stringify(body);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS[attempt - 1] ?? 8000;
      console.log(`[bedrock] Retry ${attempt}/${MAX_RETRIES} after ${delay}ms...`);
      await sleep(delay);
    }

    try {
      const res = await httpPost(
        url,
        {
          "Content-Type": "application/json",
          "x-api-key": key,
        },
        payload
      );

      // Retryable status codes
      if ((res.status === 429 || res.status === 504) && attempt < MAX_RETRIES) {
        console.warn(`[bedrock] Got ${res.status}, will retry...`);
        lastError = new Error(`Bedrock API error ${res.status}: ${res.body.slice(0, 300)}`);
        continue;
      }

      if (res.status < 200 || res.status >= 300) {
        throw new Error(`Bedrock API error ${res.status}: ${res.body.slice(0, 300)}`);
      }

      const data = JSON.parse(res.body) as ConverseResponse;
      const message = data.bedrock_response?.message ?? data.output?.message;
      if (!message) {
        throw new Error(`Unexpected Bedrock response shape: ${res.body.slice(0, 300)}`);
      }
      return message.content.map((c) => c.text).join("");
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Only retry on network/timeout errors or if we haven't exhausted retries
      if (attempt < MAX_RETRIES && !lastError.message.startsWith("Bedrock API error")) {
        console.warn(`[bedrock] Request failed: ${lastError.message}, will retry...`);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("Bedrock request failed after retries");
}

// ─── Anthropic API ────────────────────────────────────────────────

interface AnthropicResponse {
  content: Array<{ type: "text"; text: string }>;
}

async function completeViaAnthropic(
  messages: Message[],
  system: string | undefined,
  maxTokens: number
): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY!.trim();

  const res = await httpPost(
    "https://api.anthropic.com/v1/messages",
    {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages,
    })
  );

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Anthropic API error ${res.status}: ${res.body.slice(0, 300)}`);
  }

  const data = JSON.parse(res.body) as AnthropicResponse;
  return data.content.map((c) => c.text).join("");
}

// ─── Public API ───────────────────────────────────────────────────

/** Returns true if a real Claude API is configured. */
export function isAIAvailable(): boolean {
  return !!(
    (process.env.BEDROCK_URL?.trim() &&
      process.env.BEDROCK_API_KEY?.trim() &&
      process.env.MODEL_ID?.trim()) ||
    process.env.ANTHROPIC_API_KEY?.trim()
  );
}

export async function complete(
  messages: Message[],
  options: { system?: string; maxTokens?: number; stubResponse?: string } = {}
): Promise<string> {
  const { system, maxTokens = 4096, stubResponse } = options;

  const useBedrock =
    process.env.BEDROCK_URL?.trim() &&
    process.env.BEDROCK_API_KEY?.trim() &&
    process.env.MODEL_ID?.trim();

  if (useBedrock) {
    return completeViaBedrock(messages, system, maxTokens);
  }

  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    return completeViaAnthropic(messages, system, maxTokens);
  }

  // No API configured — return stub if provided, otherwise throw
  if (stubResponse !== undefined) {
    return stubResponse;
  }

  throw new Error(
    "No Claude credentials found. Set BEDROCK_URL + BEDROCK_API_KEY + MODEL_ID, or ANTHROPIC_API_KEY."
  );
}
