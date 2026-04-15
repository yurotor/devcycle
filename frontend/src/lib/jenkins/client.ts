// Jenkins REST API client
//
// Supports three Jenkins hosts:
//   1. sharedservices     — autoDeploy (always), some pullRequest builds
//   2. sharedservices-dev — some pullRequest builds
//   3. platform           — UI and contracts repos
//
// Auth: Basic auth with Azure AD Object ID + API token
// CSRF: Jenkins requires a crumb header for mutating requests (useCrumbs: true)
//
// Uses node:https directly (same pattern as azure-devops/client.ts) to bypass
// Next.js fetch patching.

import https from "node:https";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30_000;

// ─── Error ────────────────────────────────────────────────────────

export class JenkinsError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "JenkinsError";
  }
}

// ─── Response shapes ──────────────────────────────────────────────

export interface JenkinsBuild {
  number: number;
  displayName: string;
  result: "SUCCESS" | "FAILURE" | "ABORTED" | "UNSTABLE" | null;
  building: boolean;
  timestamp: number;
  duration: number;
  estimatedDuration: number;
  url: string;
  description: string | null;
  actions: JenkinsBuildAction[];
}

export interface JenkinsBuildAction {
  _class?: string;
  parameters?: JenkinsBuildParameter[];
  causes?: JenkinsBuildCause[];
}

export interface JenkinsBuildParameter {
  _class?: string;
  name: string;
  value: string | number | boolean;
}

export interface JenkinsBuildCause {
  _class?: string;
  shortDescription: string;
}

export interface JenkinsBuildSummary {
  number: number;
  displayName: string;
  result: string | null;
  building: boolean;
  url: string;
}

export interface JenkinsJob {
  name: string;
  url: string;
  builds: JenkinsBuildSummary[];
}

export interface JenkinsStage {
  id: string;
  name: string;
  status: "SUCCESS" | "FAILED" | "IN_PROGRESS" | "NOT_EXECUTED" | "PAUSED_PENDING_INPUT" | "ABORTED";
  startTimeMillis: number;
  durationMillis: number;
  pauseDurationMillis: number;
}

export interface JenkinsWfApiDescribe {
  id: string;
  name: string;
  status: string;
  startTimeMillis: number;
  durationMillis: number;
  stages: JenkinsStage[];
}

export interface JenkinsStageLog {
  nodeId: string;
  text: string;
  length: number;
  hasMore: boolean;
}

export interface JenkinsCrumb {
  crumb: string;
  crumbRequestField: string;
}

// ─── Native HTTPS helper ─────────────────────────────────────────

interface HttpResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

function httpsRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: options.method ?? "GET",
        headers: options.headers,
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          const headers: Record<string, string | string[] | undefined> = {};
          for (const [key, val] of Object.entries(res.headers)) {
            headers[key] = val;
          }
          resolve({ status: res.statusCode ?? 0, headers, body });
        });
        res.on("error", reject);
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms: ${url.split("?")[0]}`));
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ─── Retry helper ────────────────────────────────────────────────

function isRetryable(err: unknown): boolean {
  if (err instanceof JenkinsError) {
    // Jenkins returns HTML error pages (<!DOCTYPE html>) when a job/build
    // doesn't exist — that's not transient, don't retry.
    if (err.message.includes("<!DOCTYPE") || err.message.includes("<html")) {
      return false;
    }
    return err.status >= 500 || err.status === 429;
  }
  if (err instanceof TypeError) return true;
  const code = (err as NodeJS.ErrnoException).code;
  if (
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "UND_ERR_CONNECT_TIMEOUT"
  ) {
    return true;
  }
  if (err instanceof Error && err.message.includes("timed out")) return true;
  return false;
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES && isRetryable(err)) {
        const delay = BASE_DELAY_MS * 2 ** attempt;
        console.warn(
          `[jenkins] ${label} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms...`,
          (err as Error).message ?? err
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// ─── Client ───────────────────────────────────────────────────────

export class JenkinsClient {
  private crumbCache: Map<string, { crumb: JenkinsCrumb; fetchedAt: number }> = new Map();
  private static readonly CRUMB_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly host: string,
    private readonly username: string,
    private readonly token: string
  ) {
    this.host = host.replace(/\/$/, "");
  }

  // ── Auth ──────────────────────────────────────────────────────

  private authHeader(): string {
    return `Basic ${Buffer.from(`${this.username}:${this.token}`).toString("base64")}`;
  }

  // ── Core request ──────────────────────────────────────────────

  private async request<T>(
    url: string,
    options: { method?: string; headers?: Record<string, string>; body?: string } = {}
  ): Promise<T> {
    return withRetry(async () => {
      const res = await httpsRequest(url, {
        method: options.method,
        body: options.body,
        headers: {
          Authorization: this.authHeader(),
          Accept: "application/json",
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (res.status < 200 || res.status >= 300) {
        throw new JenkinsError(
          res.status,
          `Jenkins API error ${res.status}: ${res.body.slice(0, 500)}`
        );
      }

      if (!res.body.trim()) return {} as T;
      return JSON.parse(res.body) as T;
    }, `request ${url.split("?")[0]}`);
  }

  // ── Crumb (CSRF) ─────────────────────────────────────────────

  async getCrumb(): Promise<JenkinsCrumb> {
    const cached = this.crumbCache.get(this.host);
    if (cached && Date.now() - cached.fetchedAt < JenkinsClient.CRUMB_TTL_MS) {
      return cached.crumb;
    }
    const crumb = await this.request<JenkinsCrumb>(
      `${this.host}/crumbIssuer/api/json`
    );
    this.crumbCache.set(this.host, { crumb, fetchedAt: Date.now() });
    return crumb;
  }

  // ── Job info ──────────────────────────────────────────────────

  async getJob(jobPath: string): Promise<JenkinsJob> {
    const url = `${this.host}/${jobPath}/api/json`;
    return this.request<JenkinsJob>(url);
  }

  async getRecentBuilds(jobPath: string, count: number = 20): Promise<JenkinsBuildSummary[]> {
    const job = await this.getJob(jobPath);
    return job.builds.slice(0, count);
  }

  // ── Build details ─────────────────────────────────────────────

  async getBuild(jobPath: string, buildNumber: number): Promise<JenkinsBuild> {
    const url = `${this.host}/${jobPath}/${buildNumber}/api/json`;
    return this.request<JenkinsBuild>(url);
  }

  async getBuildByUrl(buildUrl: string): Promise<JenkinsBuild> {
    const url = `${buildUrl.replace(/\/$/, "")}/api/json`;
    return this.request<JenkinsBuild>(url);
  }

  // ── Pipeline stages (wfapi) ───────────────────────────────────

  async getBuildStages(jobPath: string, buildNumber: number): Promise<JenkinsWfApiDescribe> {
    const url = `${this.host}/${jobPath}/${buildNumber}/wfapi/describe`;
    return this.request<JenkinsWfApiDescribe>(url);
  }

  // ── Stage log ─────────────────────────────────────────────────

  async getStageLog(jobPath: string, buildNumber: number, nodeId: string): Promise<string> {
    const url = `${this.host}/${jobPath}/${buildNumber}/execution/node/${nodeId}/wfapi/log`;
    const data = await this.request<JenkinsStageLog>(url);
    return data.text ?? "";
  }

  // ── Console output (full build log, plain text) ──────────────

  async getConsoleOutput(jobPath: string, buildNumber: number): Promise<string> {
    const url = `${this.host}/${jobPath}/${buildNumber}/consoleText`;
    return withRetry(async () => {
      const res = await httpsRequest(url, {
        headers: {
          Authorization: this.authHeader(),
          Accept: "text/plain",
        },
      });
      if (res.status < 200 || res.status >= 300) {
        throw new JenkinsError(res.status, `Console output error ${res.status}`);
      }
      return res.body;
    }, `consoleText ${jobPath}/${buildNumber}`);
  }

  // ── Trigger build ─────────────────────────────────────────────

  async triggerBuild(
    jobPath: string,
    params?: Record<string, string>
  ): Promise<void> {
    const crumb = await this.getCrumb();
    let url: string;
    let body: string | undefined;

    if (params && Object.keys(params).length > 0) {
      url = `${this.host}/${jobPath}/buildWithParameters`;
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    } else {
      url = `${this.host}/${jobPath}/build`;
    }

    await this.request<void>(url, {
      method: "POST",
      headers: {
        [crumb.crumbRequestField]: crumb.crumb,
      },
      body,
    });
  }

  // ── Rebuild (same params as previous build) ───────────────────

  async rebuildBuild(jobPath: string, buildNumber: number): Promise<void> {
    const build = await this.getBuild(jobPath, buildNumber);
    const paramsAction = build.actions.find(
      (a) => a._class === "hudson.model.ParametersAction"
    );
    const params: Record<string, string> = {};
    if (paramsAction?.parameters) {
      for (const p of paramsAction.parameters) {
        params[p.name] = String(p.value);
      }
    }
    await this.triggerBuild(jobPath, params);
  }

  // ── Utility: find build by PR number ──────────────────────────

  async findBuildByPrNumber(
    jobPath: string,
    prNumber: number,
    maxBuildsToScan: number = 20
  ): Promise<JenkinsBuildSummary | null> {
    const builds = await this.getRecentBuilds(jobPath, maxBuildsToScan);
    const prStr = String(prNumber);
    // The job-level builds list may not include displayName,
    // so fetch individual build details to check.
    for (const build of builds) {
      // If displayName is already populated, check it
      if (build.displayName) {
        const parts = build.displayName.split(" - ");
        const lastPart = parts[parts.length - 1]?.trim();
        if (lastPart === prStr) return build;
        continue;
      }
      // Otherwise fetch the full build details
      try {
        const details = await this.getBuild(jobPath, build.number);
        // displayName format: "#842 - Guy Dadon - 79983"
        const parts = details.displayName.split(" - ");
        const lastPart = parts[parts.length - 1]?.trim();
        if (lastPart === prStr) {
          return {
            number: details.number,
            displayName: details.displayName,
            result: details.result,
            building: details.building,
            url: details.url,
          };
        }
      } catch {
        // Skip builds we can't fetch
      }
    }
    return null;
  }

  // ── Utility: find latest build for repo (autoDeploy) ──────────

  async findLatestBuild(
    jobPath: string,
    afterTimestamp?: number
  ): Promise<JenkinsBuildSummary | null> {
    const builds = await this.getRecentBuilds(jobPath, 10);
    if (!afterTimestamp) return builds[0] ?? null;
    // Find most recent build that started after the given timestamp
    // We need full build details to get the timestamp
    for (const build of builds) {
      const details = await this.getBuild(jobPath, build.number);
      if (details.timestamp >= afterTimestamp) {
        return build;
      }
    }
    return null;
  }
}

// ─── Host configuration ──────────────────────────────────────────

export interface JenkinsHostConfig {
  url: string;
  username: string;
  token: string;
}

export function getJenkinsHosts(): {
  sharedservices: JenkinsHostConfig;
  sharedservicesDev: JenkinsHostConfig;
  platform: JenkinsHostConfig;
} {
  return {
    sharedservices: {
      url: process.env.JENKINS_SHAREDSERVICES_URL ?? "",
      username: process.env.JENKINS_SHAREDSERVICES_USER ?? "",
      token: process.env.JENKINS_SHAREDSERVICES_TOKEN ?? "",
    },
    sharedservicesDev: {
      url: process.env.JENKINS_SHAREDSERVICES_DEV_URL ?? "",
      username: process.env.JENKINS_SHAREDSERVICES_USER ?? "",
      token: process.env.JENKINS_SHAREDSERVICES_TOKEN ?? "",
    },
    platform: {
      url: process.env.JENKINS_PLATFORM_URL ?? "",
      username: process.env.JENKINS_PLATFORM_USER ?? "",
      token: process.env.JENKINS_PLATFORM_TOKEN ?? "",
    },
  };
}

export function createJenkinsClient(host: JenkinsHostConfig): JenkinsClient {
  return new JenkinsClient(host.url, host.username, host.token);
}

export function createJenkinsClientForHost(hostUrl: string): JenkinsClient {
  const hosts = getJenkinsHosts();
  const normalized = hostUrl.replace(/\/$/, "");

  if (normalized === hosts.sharedservices.url) {
    return createJenkinsClient(hosts.sharedservices);
  }
  if (normalized === hosts.sharedservicesDev.url) {
    return createJenkinsClient(hosts.sharedservicesDev);
  }
  if (normalized === hosts.platform.url) {
    return createJenkinsClient(hosts.platform);
  }
  throw new Error(`Unknown Jenkins host: ${hostUrl}`);
}
