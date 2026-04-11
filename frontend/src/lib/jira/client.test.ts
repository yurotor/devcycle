import { describe, it, expect, vi, beforeEach } from "vitest";
import { JiraClient, JiraError } from "./client";

// ─── Helpers ──────────────────────────────────────────────────────

const CLOUD_URL = "https://myorg.atlassian.net";
const SERVER_URL = "https://jira.mycompany.com";
const EMAIL = "dev@example.com";
const TOKEN = "my-api-token";

const CLOUD_AUTH = `Basic ${Buffer.from(`${EMAIL}:${TOKEN}`).toString("base64")}`;
const SERVER_AUTH = `Bearer ${TOKEN}`;

function makeRawIssue(overrides: {
  key?: string;
  type?: string;
  priority?: string;
  status?: string;
} = {}) {
  return {
    id: "10001",
    key: overrides.key ?? "PROJ-1",
    fields: {
      summary: "Test issue",
      description: null,
      status: { name: overrides.status ?? "In Progress" },
      issuetype: { name: overrides.type ?? "Story" },
      priority: { name: overrides.priority ?? "High" },
      assignee: null,
    },
  };
}

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

function mockSearch(issues: ReturnType<typeof makeRawIssue>[], total?: number) {
  return mockFetch({ total: total ?? issues.length, issues });
}

// ─── Tests ────────────────────────────────────────────────────────

describe("JiraClient", () => {
  beforeEach(() => vi.unstubAllGlobals());

  // ── Auth ────────────────────────────────────────────────────

  describe("auth headers", () => {
    it("uses Basic auth for Jira Cloud", async () => {
      const client = new JiraClient(CLOUD_URL, TOKEN, EMAIL);
      const fetch = mockSearch([]);
      vi.stubGlobal("fetch", fetch);

      await client.searchIssues("project = PROJ");

      const [, opts] = fetch.mock.calls[0];
      expect(opts.headers.Authorization).toBe(CLOUD_AUTH);
    });

    it("uses Bearer auth for Jira Server", async () => {
      const client = new JiraClient(SERVER_URL, TOKEN);
      const fetch = mockSearch([]);
      vi.stubGlobal("fetch", fetch);

      await client.searchIssues("project = PROJ");

      const [, opts] = fetch.mock.calls[0];
      expect(opts.headers.Authorization).toBe(SERVER_AUTH);
    });

    it("uses API v3 for Cloud", async () => {
      const client = new JiraClient(CLOUD_URL, TOKEN, EMAIL);
      vi.stubGlobal("fetch", mockSearch([]));
      await client.searchIssues("project = PROJ");
      const [url] = vi.mocked(fetch).mock.calls[0];
      expect(String(url)).toContain("/rest/api/3/");
    });

    it("uses API v2 for Server", async () => {
      const client = new JiraClient(SERVER_URL, TOKEN);
      vi.stubGlobal("fetch", mockSearch([]));
      await client.searchIssues("project = PROJ");
      const [url] = vi.mocked(fetch).mock.calls[0];
      expect(String(url)).toContain("/rest/api/2/");
    });
  });

  // ── Error handling ──────────────────────────────────────────

  describe("error handling", () => {
    it("throws JiraError with status 401 for bad credentials", async () => {
      const client = new JiraClient(CLOUD_URL, TOKEN, EMAIL);
      vi.stubGlobal("fetch", mockFetch({ message: "Unauthorized" }, 401));
      await expect(client.searchIssues("project = PROJ")).rejects.toMatchObject({
        status: 401,
      });
      await expect(client.searchIssues("project = PROJ")).rejects.toBeInstanceOf(JiraError);
    });

    it("throws JiraError with status 403 for insufficient permissions", async () => {
      const client = new JiraClient(CLOUD_URL, TOKEN, EMAIL);
      vi.stubGlobal("fetch", mockFetch({}, 403));
      await expect(client.searchIssues("project = PROJ")).rejects.toMatchObject({ status: 403 });
    });

    it("throws JiraError with status 404 for unknown project", async () => {
      const client = new JiraClient(CLOUD_URL, TOKEN, EMAIL);
      vi.stubGlobal("fetch", mockFetch({}, 404));
      await expect(client.getIssue("PROJ-999")).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── Issue mapping ───────────────────────────────────────────

  describe("issue type mapping", () => {
    const client = new JiraClient(CLOUD_URL, TOKEN, EMAIL);

    it.each([
      ["Story", "story"],
      ["User Story", "story"],
      ["Bug", "bug"],
      ["Task", "task"],
      ["Sub-task", "task"],
      ["Improvement", "task"],
    ])("maps Jira type %s → %s", async (jiraType, expected) => {
      vi.stubGlobal("fetch", mockSearch([makeRawIssue({ type: jiraType })]));
      const { issues } = await client.searchIssues("project = PROJ");
      expect(issues[0].issueType).toBe(expected);
    });
  });

  describe("priority mapping", () => {
    const client = new JiraClient(CLOUD_URL, TOKEN, EMAIL);

    it.each([
      ["Highest", "critical"],
      ["Critical", "critical"],
      ["High", "high"],
      ["Medium", "medium"],
      ["Low", "low"],
      ["Lowest", "low"],
    ])("maps Jira priority %s → %s", async (jiraPriority, expected) => {
      vi.stubGlobal("fetch", mockSearch([makeRawIssue({ priority: jiraPriority })]));
      const { issues } = await client.searchIssues("project = PROJ");
      expect(issues[0].priority).toBe(expected);
    });
  });

  // ── getAllAccessibleIssues: JQL construction ─────────────────

  describe("getAllAccessibleIssues", () => {
    it("excludes epics in the JQL", async () => {
      const client = new JiraClient(CLOUD_URL, TOKEN, EMAIL);
      const fetch = mockSearch([]);
      vi.stubGlobal("fetch", fetch);

      await client.getAllAccessibleIssues();

      const [url] = fetch.mock.calls[0];
      expect(decodeURIComponent(String(url))).toContain("issuetype NOT IN (Epic)");
    });

    it("excludes default done statuses in the JQL", async () => {
      const client = new JiraClient(CLOUD_URL, TOKEN, EMAIL);
      const fetch = mockSearch([]);
      vi.stubGlobal("fetch", fetch);

      await client.getAllAccessibleIssues();

      const [url] = fetch.mock.calls[0];
      const decoded = decodeURIComponent(String(url));
      expect(decoded).toContain("status NOT IN");
      expect(decoded).toContain('"Done"');
      expect(decoded).toContain("\"Won't Do\"");
    });

    it("respects custom done statuses", async () => {
      const client = new JiraClient(CLOUD_URL, TOKEN, EMAIL);
      const fetch = mockSearch([]);
      vi.stubGlobal("fetch", fetch);

      await client.getAllAccessibleIssues(["Closed", "Resolved"]);

      const decoded = decodeURIComponent(String(fetch.mock.calls[0][0]));
      expect(decoded).toContain('"Closed"');
      expect(decoded).toContain('"Resolved"');
      expect(decoded).not.toContain('"Done"');
    });

    it("paginates until all issues are fetched", async () => {
      const client = new JiraClient(CLOUD_URL, TOKEN, EMAIL);
      // Page 1: 2 issues, total=3
      // Page 2: 1 issue, total=3
      const fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true, status: 200,
          json: async () => ({ total: 3, issues: [makeRawIssue({ key: "P-1" }), makeRawIssue({ key: "P-2" })] }),
          text: async () => "",
        })
        .mockResolvedValueOnce({
          ok: true, status: 200,
          json: async () => ({ total: 3, issues: [makeRawIssue({ key: "P-3" })] }),
          text: async () => "",
        });
      vi.stubGlobal("fetch", fetch);

      const issues = await client.getAllAccessibleIssues();
      expect(issues).toHaveLength(3);
      expect(fetch).toHaveBeenCalledTimes(2);
      // Second call should have startAt=2
      const [secondUrl] = fetch.mock.calls[1];
      expect(String(secondUrl)).toContain("startAt=2");
    });
  });
});
