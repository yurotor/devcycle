// Azure DevOps REST API client
// Docs: https://learn.microsoft.com/en-us/rest/api/azure/devops/
//
// Auth: Basic auth with PAT — base64(:<pat>)
// Pagination: responses include x-ms-continuationtoken header; pass as continuationToken query param
//
// Uses node:https directly instead of fetch() to bypass Next.js's fetch patching,
// which can route requests through an internal proxy with wrong IPs.

import https from "node:https";

const API_VERSION = "7.0";
const API_VERSION_PREVIEW = "7.0-preview";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30_000;

// ─── Error ────────────────────────────────────────────────────────

export class AzureDevOpsError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "AzureDevOpsError";
  }
}

// ─── Response shapes ──────────────────────────────────────────────

export interface AdoProject {
  id: string;
  name: string;
  state: string;
}

export interface AdoRepository {
  id: string;
  name: string;
  /** Stripped of refs/heads/ prefix */
  defaultBranch: string;
  project: { id: string; name: string };
  remoteUrl: string;
}

export interface AdoTreeItem {
  objectId: string;
  /** Absolute path from repo root, e.g. "/src/index.ts" */
  path: string;
  gitObjectType: "blob" | "tree";
  url: string;
}

export interface AdoFileContent {
  content: string;
  path: string;
}

export interface AdoPullRequest {
  pullRequestId: number;
  title: string;
  description: string;
  sourceRefName: string;
  targetRefName: string;
  url: string;
  webUrl?: string;
}

interface PolicyEvaluation {
  status: "approved" | "rejected" | "running" | "queued" | "notApplicable" | "broken";
  configuration: {
    type: {
      displayName: string;
    };
  };
}

export interface AdoPRComment {
  id: number;
  content: string;
}

export interface AdoBuildTimelineRecord {
  id: string;
  name: string;
  type: string;
  state: string;
  result: string | null;
  log?: { id: number; url: string };
  order: number;
}

// ─── List response wrapper ────────────────────────────────────────

interface ListResponse<T> {
  count: number;
  value: T[];
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
        port: 443,
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
  if (err instanceof AzureDevOpsError) {
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
  // Retry on timeout messages
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
          `[ado] ${label} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms...`,
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

export class AzureDevOpsClient {
  private readonly orgUrl: string;

  constructor(
    orgUrl: string,
    private readonly pat: string
  ) {
    // Normalise to org root: https://dev.azure.com/{org}
    // Users often paste a full project URL (e.g. .../crossriverbank/MyProject).
    // Strip everything beyond the first path segment so project names aren't doubled
    // when methods like getFileTree append the project themselves.
    const parsed = new URL(orgUrl.trim().replace(/\/$/, ""));
    const segments = parsed.pathname.split("/").filter(Boolean); // ['org'] or ['org', 'project', ...]
    parsed.pathname = `/${segments[0] ?? ""}`;
    this.orgUrl = parsed.toString().replace(/\/$/, "");
  }

  // ── Auth ──────────────────────────────────────────────────────

  private authHeader(): string {
    return `Basic ${Buffer.from(`:${this.pat}`).toString("base64")}`;
  }

  // ── Core request ──────────────────────────────────────────────

  async request<T>(
    url: string,
    options: { method?: string; headers?: Record<string, string>; body?: string } = {}
  ): Promise<{ data: T; continuationToken: string | null }> {
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
        throw new AzureDevOpsError(
          res.status,
          `Azure DevOps API error ${res.status}: ${res.body.slice(0, 300)}`
        );
      }

      const data = JSON.parse(res.body) as T;
      const continuationToken =
        (res.headers["x-ms-continuationtoken"] as string) ?? null;
      return { data, continuationToken };
    }, `request ${url.split("?")[0]}`);
  }

  /** Fetches all pages of a paginated list endpoint. */
  private async listAll<T>(baseUrl: string): Promise<T[]> {
    const results: T[] = [];
    let token: string | null = null;

    do {
      const pageUrl: string = token
        ? `${baseUrl}&continuationToken=${encodeURIComponent(token)}`
        : baseUrl;
      const { data, continuationToken }: { data: ListResponse<T>; continuationToken: string | null } =
        await this.request<ListResponse<T>>(pageUrl);
      results.push(...data.value);
      token = continuationToken;
    } while (token);

    return results;
  }

  // ── Projects ──────────────────────────────────────────────────

  async listProjects(): Promise<AdoProject[]> {
    const url = `${this.orgUrl}/_apis/projects?api-version=${API_VERSION}&$top=100`;
    return this.listAll<AdoProject>(url);
  }

  // ── Repositories ──────────────────────────────────────────────

  async listRepositories(project: string): Promise<AdoRepository[]> {
    const url = `${this.orgUrl}/${encodeURIComponent(project)}/_apis/git/repositories?api-version=${API_VERSION}`;
    const { data } = await this.request<ListResponse<AdoRepository>>(url);
    return data.value.map((r) => ({
      ...r,
      defaultBranch: stripRefsHeads(r.defaultBranch),
    }));
  }

  /**
   * Lists all repos accessible to the PAT.
   *
   * Strategy:
   * 1. Try the org-level /_apis/git/repositories endpoint (requires Code:Read only).
   * 2. If that 401s/403s (some orgs restrict it), fall back to listing projects
   *    first and querying per-project (requires Project:Read + Code:Read).
   */
  async listAllRepositories(): Promise<AdoRepository[]> {
    const orgReposUrl = `${this.orgUrl}/_apis/git/repositories?api-version=${API_VERSION}`;
    try {
      const { data } = await this.request<ListResponse<AdoRepository>>(orgReposUrl);
      return data.value.map((r) => ({
        ...r,
        defaultBranch: stripRefsHeads(r.defaultBranch),
      }));
    } catch (err) {
      // Org-level endpoint not accessible — fall back to per-project enumeration.
      if (err instanceof AzureDevOpsError && (err.status === 401 || err.status === 403)) {
        const projects = await this.listProjects();
        const repoLists = await Promise.all(
          projects.map((p) => this.listRepositories(p.name))
        );
        return repoLists.flat();
      }
      throw err;
    }
  }

  // ── File tree ─────────────────────────────────────────────────

  async getFileTree(
    project: string,
    repoId: string,
    branch: string
  ): Promise<AdoTreeItem[]> {
    const url =
      `${this.orgUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/items` +
      `?scopePath=/&recursionLevel=Full&versionDescriptor.version=${encodeURIComponent(branch)}` +
      `&versionDescriptor.versionType=branch&api-version=${API_VERSION}`;
    const { data } = await this.request<ListResponse<AdoTreeItem>>(url);
    return data.value;
  }

  // ── File content ──────────────────────────────────────────────

  async getFileContent(
    project: string,
    repoId: string,
    filePath: string,
    branch: string
  ): Promise<string> {
    const url =
      `${this.orgUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/items` +
      `?path=${encodeURIComponent(filePath)}&versionDescriptor.version=${encodeURIComponent(branch)}` +
      `&versionDescriptor.versionType=branch&$format=text&api-version=${API_VERSION}`;
    return withRetry(async () => {
      const res = await httpsRequest(url, {
        headers: { Authorization: this.authHeader() },
      });
      if (res.status < 200 || res.status >= 300) {
        throw new AzureDevOpsError(res.status, `Failed to fetch ${filePath}`);
      }
      return res.body;
    }, `getFileContent ${filePath}`);
  }

  // ── Pull Requests ─────────────────────────────────────────────

  async createPullRequest(
    project: string,
    repoId: string,
    opts: {
      title: string;
      description: string;
      sourceBranch: string;
      targetBranch: string;
    }
  ): Promise<AdoPullRequest> {
    const url =
      `${this.orgUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/pullrequests` +
      `?api-version=${API_VERSION}`;
    const { data } = await this.request<AdoPullRequest>(url, {
      method: "POST",
      body: JSON.stringify({
        title: opts.title,
        description: opts.description,
        sourceRefName: `refs/heads/${opts.sourceBranch}`,
        targetRefName: `refs/heads/${opts.targetBranch}`,
      }),
    });
    return data;
  }

  async addPRComment(
    project: string,
    repoId: string,
    pullRequestId: number,
    content: string
  ): Promise<AdoPRComment> {
    const url =
      `${this.orgUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}` +
      `/pullrequests/${pullRequestId}/threads?api-version=${API_VERSION}`;
    const { data } = await this.request<{ id: number; comments: AdoPRComment[] }>(url, {
      method: "POST",
      body: JSON.stringify({
        comments: [{ parentCommentId: 0, content, commentType: 1 }],
        status: 1,
      }),
    });
    return data.comments[0];
  }

  async getPullRequestStatus(
    project: string,
    repoId: string,
    pullRequestId: number
  ): Promise<"active" | "completed" | "abandoned"> {
    const url =
      `${this.orgUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}` +
      `/pullrequests/${pullRequestId}?api-version=${API_VERSION}`;
    const { data } = await this.request<{ status: string }>(url);
    return data.status as "active" | "completed" | "abandoned";
  }

  /**
   * Check build policy evaluations on a PR.
   * Returns "approved" if all build policies passed, "rejected" if any failed,
   * "running" if any are queued/running, "none" if no build policies exist.
   */
  async getPrBuildPolicyStatus(
    project: string,
    pullRequestId: number
  ): Promise<"approved" | "rejected" | "running" | "none"> {
    const url =
      `${this.orgUrl}/${encodeURIComponent(project)}/_apis/policy/evaluations` +
      `?artifactId=${encodeURIComponent(`vstfs:///CodeReview/CodeReviewId/${await this.getProjectId(project)}/${pullRequestId}`)}` +
      `&api-version=${API_VERSION_PREVIEW}`;
    const { data } = await this.request<{ value: PolicyEvaluation[] }>(url);

    // Filter to build policies only (type.id for build validation = varies, check displayName)
    const buildEvals = (data.value ?? []).filter(
      (e) => e.configuration?.type?.displayName?.toLowerCase().includes("build")
    );

    if (buildEvals.length === 0) return "none";

    // Filter out notApplicable evals — they don't indicate pass or fail
    const applicableEvals = buildEvals.filter((e) => e.status !== "notApplicable");
    if (applicableEvals.length === 0) return "none";

    const hasRejected = applicableEvals.some((e) => e.status === "rejected" || e.status === "broken");
    if (hasRejected) return "rejected";

    const hasRunning = applicableEvals.some((e) => e.status === "running" || e.status === "queued");
    if (hasRunning) return "running";

    const allApproved = applicableEvals.every((e) => e.status === "approved");
    if (allApproved) return "approved";

    // Unknown status — treat as rejected so we don't get stuck pending
    return "rejected";
  }

  /**
   * Get the build ID from a PR's build policy evaluation.
   * Returns the build ID if found, null otherwise.
   */
  async getPrBuildId(
    project: string,
    pullRequestId: number
  ): Promise<number | null> {
    const projectId = await this.getProjectId(project);
    const artifactId = `vstfs:///CodeReview/CodeReviewId/${projectId}/${pullRequestId}`;
    const url =
      `${this.orgUrl}/${encodeURIComponent(project)}/_apis/policy/evaluations` +
      `?artifactId=${encodeURIComponent(artifactId)}` +
      `&api-version=${API_VERSION_PREVIEW}`;
    const { data } = await this.request<{ value: PolicyEvaluation[] }>(url);

    // Find build eval — prefer rejected, but fall back to any build policy with a buildId
    const buildEvals = (data.value ?? []).filter(
      (e) => e.configuration?.type?.displayName?.toLowerCase().includes("build")
    );
    const buildEval = buildEvals.find((e) => e.status === "rejected" || e.status === "broken")
      ?? buildEvals.find((e) => e.status !== "notApplicable")
      ?? buildEvals[0];

    // The build URL is embedded in the context — extract build ID from it
    const evalAny = buildEval as unknown as Record<string, unknown> | undefined;
    const context = evalAny?.context as Record<string, unknown> | undefined;
    const buildId = context?.buildId as number | undefined;
    if (buildId) return buildId;

    // Fallback: check if there's a "latestPolicyEvaluation" with buildId
    const latest = evalAny?.latestPolicyEvaluation as Record<string, unknown> | undefined;
    const latestContext = latest?.context as Record<string, unknown> | undefined;
    return (latestContext?.buildId as number) ?? null;
  }

  /**
   * Fetch the timeline for a build (contains log references per step).
   */
  async getBuildTimeline(
    project: string,
    buildId: number
  ): Promise<{ records: AdoBuildTimelineRecord[] }> {
    const url =
      `${this.orgUrl}/${encodeURIComponent(project)}/_apis/build/builds/${buildId}/timeline` +
      `?api-version=${API_VERSION}`;
    const { data } = await this.request<{ records: AdoBuildTimelineRecord[] }>(url);
    return data;
  }

  /**
   * Fetch a specific log from a build.
   */
  async getBuildLog(
    project: string,
    buildId: number,
    logId: number
  ): Promise<string> {
    const url =
      `${this.orgUrl}/${encodeURIComponent(project)}/_apis/build/builds/${buildId}/logs/${logId}` +
      `?api-version=${API_VERSION}`;
    return withRetry(async () => {
      const res = await httpsRequest(url, {
        headers: {
          Authorization: this.authHeader(),
          Accept: "text/plain",
        },
      });
      if (res.status < 200 || res.status >= 300) {
        throw new AzureDevOpsError(res.status, `Failed to fetch build log ${logId}`);
      }
      return res.body;
    }, `getBuildLog ${buildId}/${logId}`);
  }

  /** Get the project GUID (cached). */
  private projectIdCache = new Map<string, string>();
  private async getProjectId(project: string): Promise<string> {
    if (this.projectIdCache.has(project)) return this.projectIdCache.get(project)!;
    const url = `${this.orgUrl}/_apis/projects/${encodeURIComponent(project)}?api-version=${API_VERSION}`;
    const { data } = await this.request<{ id: string }>(url);
    this.projectIdCache.set(project, data.id);
    return data.id;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Strips refs/heads/ prefix from a branch ref string. */
export function stripRefsHeads(ref: string): string {
  return ref?.replace(/^refs\/heads\//, "") ?? ref;
}
