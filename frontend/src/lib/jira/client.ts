// Jira REST API client
//
// Supports Jira Cloud (*.atlassian.net) and Jira Server/Data Center.
//   Cloud:  Basic auth  — base64(email:apiToken),  API v3
//   Server: Bearer auth — Bearer {pat},             API v2

const DEFAULT_DONE_STATUSES = ["Done", "Won't Do"];

// ─── Error ────────────────────────────────────────────────────────

export class JiraError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "JiraError";
  }
}

// ─── Types ────────────────────────────────────────────────────────

export type IssuePriority = "critical" | "high" | "medium" | "low";
export type IssueType = "story" | "bug" | "task";

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description: string | null;
  status: string;
  issueType: IssueType;
  priority: IssuePriority;
  assignee: string | null;
}

// ─── Client ───────────────────────────────────────────────────────

export class JiraClient {
  private readonly apiBase: string;
  private readonly isCloud: boolean;

  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly email?: string
  ) {
    // Accept full URLs (e.g. board or project URLs) — only the origin is needed.
    const parsed = new URL(baseUrl.trim());
    const normalised = parsed.origin; // e.g. https://myorg.atlassian.net
    this.isCloud = normalised.includes(".atlassian.net");
    this.apiBase = `${normalised}/rest/api/${this.isCloud ? "3" : "2"}`;
  }

  // ── Auth ──────────────────────────────────────────────────────

  private authHeader(): string {
    if (this.isCloud) {
      if (!this.email) throw new Error("email is required for Jira Cloud");
      return `Basic ${Buffer.from(`${this.email}:${this.token}`).toString("base64")}`;
    }
    return `Bearer ${this.token}`;
  }

  // ── Core fetch ────────────────────────────────────────────────

  async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader(),
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new JiraError(
        res.status,
        `Jira API error ${res.status}: ${body.slice(0, 300)}`
      );
    }

    return res.json() as Promise<T>;
  }

  // ── Search ────────────────────────────────────────────────────

  /**
   * Runs a JQL search, returning one page of results.
   */
  /**
   * Runs a JQL search, returning one page of results.
   * For Cloud (search/jql): returns { issues, total: issues.length, nextPageToken }
   * For Server (search):    returns { issues, total }
   */
  async searchIssues(
    jql: string,
    startAt = 0,
    maxResults = 100
  ): Promise<{ issues: JiraIssue[]; total: number }> {
    const { issues } = await this._searchRaw(jql, maxResults);
    return { issues, total: issues.length };
  }

  private async _searchRaw(
    jql: string,
    maxResults = 100,
    nextPageToken?: string,
    startAt = 0
  ): Promise<{ issues: JiraIssue[]; nextPageToken?: string; total?: number; isLast?: boolean }> {
    const fields = "summary,description,status,issuetype,priority,assignee";

    let url: string;
    if (this.isCloud) {
      // Cloud API v3: search/jql uses cursor-based pagination via nextPageToken
      url =
        `${this.apiBase}/search/jql?jql=${encodeURIComponent(jql)}` +
        `&fields=${fields}&maxResults=${maxResults}` +
        (nextPageToken ? `&nextPageToken=${encodeURIComponent(nextPageToken)}` : "");
    } else {
      url =
        `${this.apiBase}/search?jql=${encodeURIComponent(jql)}` +
        `&fields=${fields}&startAt=${startAt}&maxResults=${maxResults}`;
    }

    console.log("[jira] JQL:", jql, nextPageToken ? `(token: ${nextPageToken})` : `(startAt: ${startAt})`);
    const data = await this.request<Record<string, unknown>>(url);
    console.log("[jira] raw keys:", Object.keys(data));

    // Cloud search/jql → { values: RawJiraIssue[], nextPageToken?: string }
    // Server search   → { issues: RawJiraIssue[], total: number }
    const rawIssues = (
      (data as { values?: RawJiraIssue[] }).values ??
      (data as { issues?: RawJiraIssue[] }).issues ??
      []
    );
    const isLast = (data as { isLast?: boolean }).isLast;
    console.log("[jira] page size:", rawIssues.length, "isLast:", isLast);

    return {
      issues: rawIssues.map(mapIssue),
      nextPageToken: (data as { nextPageToken?: string }).nextPageToken,
      total: (data as { total?: number }).total,
      isLast,
    };
  }

  /**
   * Fetches all pages matching a JQL query (handles pagination automatically).
   */
  private buildJql(filter: string, doneStatuses: string[], projectKey?: string): string {
    const escaped = doneStatuses.map((s) => `"${s.replace(/"/g, '\\"')}"`);
    const statusClause = escaped.length
      ? ` AND status NOT IN (${escaped.join(",")})`
      : "";
    // Scope clause: prefer explicit project key; fall back to filter or broad "not empty" check.
    // Some Jira instances reject unrestricted JQL so we must always have a scope.
    const scopeClause = projectKey
      ? `project = "${projectKey}"`
      : filter
      ? `(${filter})`
      : "project is not EMPTY";
    return `issuetype NOT IN (Epic)${statusClause} AND ${scopeClause} ORDER BY updated DESC`;
  }

  private async paginate(jql: string): Promise<JiraIssue[]> {
    const results: JiraIssue[] = [];
    if (this.isCloud) {
      // Cloud: cursor-based via nextPageToken; stop when isLast=true or no token
      let token: string | undefined;
      const MAX_ISSUES = 500;
      do {
        const page = await this._searchRaw(jql, 100, token);
        results.push(...page.issues);
        if (page.isLast || !page.nextPageToken || results.length >= MAX_ISSUES) break;
        token = page.nextPageToken;
      } while (true);
      console.log(`[jira] paginate done, total loaded: ${results.length}`);
    } else {
      // Server: offset-based via startAt/total
      let startAt = 0;
      let total = Infinity;
      while (startAt < total) {
        const page = await this._searchRaw(jql, 100, undefined, startAt);
        results.push(...page.issues);
        total = page.total ?? page.issues.length;
        startAt += page.issues.length;
        if (page.issues.length === 0) break;
      }
    }
    return results;
  }

  async getAllIssues(
    projectKey: string,
    doneStatuses: string[] = DEFAULT_DONE_STATUSES
  ): Promise<JiraIssue[]> {
    return this.paginate(this.buildJql("", doneStatuses, projectKey));
  }

  /**
   * Loads issues with an optional project key scope.
   * When projectKey is provided, only issues from that project are returned.
   */
  async getAllAccessibleIssues(
    doneStatuses: string[] = DEFAULT_DONE_STATUSES,
    projectKey?: string
  ): Promise<JiraIssue[]> {
    return this.paginate(this.buildJql("", doneStatuses, projectKey));
  }

  // ── Auth validation ───────────────────────────────────────────

  /**
   * Validates credentials by calling /myself.
   * Throws JiraError(401) if credentials are invalid.
   */
  async validateCredentials(): Promise<{ accountId: string; displayName: string }> {
    return this.request<{ accountId: string; displayName: string }>(
      `${this.apiBase.replace(/\/rest\/api\/\d+$/, "")}/rest/api/3/myself`
    );
  }

  // ── Single issue ──────────────────────────────────────────────

  async getIssue(issueKey: string): Promise<JiraIssue> {
    const fields = "summary,description,status,issuetype,priority,assignee";
    const data = await this.request<RawJiraIssue>(
      `${this.apiBase}/issue/${issueKey}?fields=${fields}`
    );
    return mapIssue(data);
  }

  // ── Updates ───────────────────────────────────────────────────

  async updateDescription(issueKey: string, text: string): Promise<void> {
    const description = this.isCloud
      ? {
          version: 1,
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text }],
            },
          ],
        }
      : text;

    await this.request(`${this.apiBase}/issue/${issueKey}`, {
      method: "PUT",
      body: JSON.stringify({ fields: { description } }),
    });
  }

  async createIssue(
    projectKey: string,
    opts: { summary: string; description: string; issueType?: string }
  ): Promise<JiraIssue> {
    const description = this.isCloud
      ? {
          version: 1,
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: opts.description }],
            },
          ],
        }
      : opts.description;

    const data = await this.request<RawJiraIssue>(`${this.apiBase}/issue`, {
      method: "POST",
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          summary: opts.summary,
          description,
          issuetype: { name: opts.issueType ?? "Task" },
        },
      }),
    });

    return mapIssue(data);
  }

  async addComment(issueKey: string, text: string): Promise<void> {
    const body = this.isCloud
      ? {
          body: {
            version: 1,
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text }],
              },
            ],
          },
        }
      : { body: text };

    await this.request(`${this.apiBase}/issue/${issueKey}/comment`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}

// ─── Raw API shapes ───────────────────────────────────────────────

interface RawJiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description: unknown;
    status: { name: string };
    issuetype: { name: string };
    priority: { name: string } | null;
    assignee: { displayName: string } | null;
  };
}

// ─── Mapping helpers ──────────────────────────────────────────────

function mapIssue(raw: RawJiraIssue): JiraIssue {
  return {
    id: raw.id,
    key: raw.key,
    summary: raw.fields.summary,
    description: extractDescription(raw.fields.description),
    status: raw.fields.status.name,
    issueType: mapIssueType(raw.fields.issuetype.name),
    priority: mapPriority(raw.fields.priority?.name ?? "Medium"),
    assignee: raw.fields.assignee?.displayName ?? null,
  };
}

function extractDescription(desc: unknown): string | null {
  if (!desc) return null;
  if (typeof desc === "string") return desc;
  // Atlassian Document Format — extract plain text from paragraphs
  if (typeof desc === "object" && desc !== null && "content" in desc) {
    const doc = desc as { content: unknown[] };
    return extractAdfText(doc.content);
  }
  return null;
}

function extractAdfText(nodes: unknown[]): string {
  return nodes
    .map((node) => {
      if (typeof node !== "object" || node === null) return "";
      const n = node as { type?: string; text?: string; content?: unknown[] };
      if (n.type === "text") return n.text ?? "";
      if (n.content) return extractAdfText(n.content);
      return "";
    })
    .join("");
}

function mapIssueType(name: string): IssueType {
  const lower = name.toLowerCase();
  if (lower.includes("bug")) return "bug";
  if (lower.includes("story") || lower.includes("user story")) return "story";
  return "task";
}

function mapPriority(name: string): IssuePriority {
  const lower = name.toLowerCase();
  if (lower === "highest" || lower === "critical") return "critical";
  if (lower === "high") return "high";
  if (lower === "low" || lower === "lowest") return "low";
  return "medium";
}
