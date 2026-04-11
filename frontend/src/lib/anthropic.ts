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

function httpPost(url: string, headers: Record<string, string>, body: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const args = ["-sS", "-X", "POST", "-w", "\n__HTTP_STATUS__%{http_code}"];
    for (const [k, v] of Object.entries(headers)) {
      args.push("-H", `${k}: ${v}`);
    }
    args.push("--data-binary", "@-");
    args.push(url);

    const child = execFile("curl", args, {
      encoding: "utf8",
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    }, (err, stdout, stderr) => {
      if (err) {
        // Include curl's stderr for useful diagnostics (e.g. "Could not resolve host")
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

// ─── Bedrock Converse API ─────────────────────────────────────────

interface ConverseRequest {
  modelId: string;
  messages: Array<{ role: string; content: Array<{ text: string }> }>;
  system?: Array<{ text: string }>;
  inferenceConfig?: { maxTokens?: number };
}

interface ConverseResponse {
  output: {
    message: {
      content: Array<{ text: string }>;
    };
  };
}

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

  const res = await httpPost(
    url,
    {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    JSON.stringify(body)
  );

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Bedrock API error ${res.status}: ${res.body.slice(0, 300)}`);
  }

  const data = JSON.parse(res.body) as ConverseResponse;
  return data.output.message.content.map((c) => c.text).join("");
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

export async function complete(
  messages: Message[],
  options: { system?: string; maxTokens?: number } = {}
): Promise<string> {
  const { system, maxTokens = 4096 } = options;

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

  throw new Error(
    "No Claude credentials found. Set BEDROCK_URL + BEDROCK_API_KEY + MODEL_ID, or ANTHROPIC_API_KEY."
  );
}
