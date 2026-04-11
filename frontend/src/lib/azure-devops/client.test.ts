import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AzureDevOpsClient,
  AzureDevOpsError,
  stripRefsHeads,
} from "./client";

// ─── Helpers ──────────────────────────────────────────────────────

const ORG_URL = "https://dev.azure.com/my-org";
const PAT = "test-pat-value";

/** Build the expected Basic auth header for the test PAT. */
const AUTH_HEADER = `Basic ${Buffer.from(`:${PAT}`).toString("base64")}`;

/** Creates a minimal fetch mock that returns the given body + status. */
function mockFetch(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

// ─── stripRefsHeads ───────────────────────────────────────────────

describe("stripRefsHeads", () => {
  it("strips refs/heads/ prefix", () => {
    expect(stripRefsHeads("refs/heads/main")).toBe("main");
    expect(stripRefsHeads("refs/heads/develop")).toBe("develop");
  });

  it("leaves bare branch names unchanged", () => {
    expect(stripRefsHeads("main")).toBe("main");
  });

  it("handles undefined/null gracefully", () => {
    expect(stripRefsHeads(undefined as unknown as string)).toBeUndefined();
  });
});

// ─── AzureDevOpsClient ────────────────────────────────────────────

describe("AzureDevOpsClient", () => {
  let client: AzureDevOpsClient;

  beforeEach(() => {
    client = new AzureDevOpsClient(ORG_URL, PAT);
    vi.unstubAllGlobals();
  });

  // ── Auth header ─────────────────────────────────────────────

  describe("auth header injection", () => {
    it("injects Basic auth header on every request", async () => {
      const fetchMock = mockFetch({ count: 0, value: [] });
      vi.stubGlobal("fetch", fetchMock);

      await client.listProjects();

      const [, opts] = fetchMock.mock.calls[0];
      expect(opts.headers.Authorization).toBe(AUTH_HEADER);
    });

    it("normalises a trailing slash in orgUrl", async () => {
      const clientWithSlash = new AzureDevOpsClient(ORG_URL + "/", PAT);
      const fetchMock = mockFetch({ count: 0, value: [] });
      vi.stubGlobal("fetch", fetchMock);

      await clientWithSlash.listProjects();

      const [url] = fetchMock.mock.calls[0];
      // No double-slash after the origin (trailing slash was normalised)
      expect(url.replace("https://", "")).not.toContain("//");
      expect(url.startsWith(ORG_URL)).toBe(true);
    });
  });

  // ── Error handling ──────────────────────────────────────────

  describe("error handling", () => {
    it("throws AzureDevOpsError with status 401 for bad PAT", async () => {
      vi.stubGlobal("fetch", mockFetch({ message: "Unauthorized" }, 401));
      await expect(client.listProjects()).rejects.toThrow(AzureDevOpsError);
      await expect(client.listProjects()).rejects.toMatchObject({ status: 401 });
    });

    it("throws AzureDevOpsError with status 403 for insufficient permissions", async () => {
      vi.stubGlobal("fetch", mockFetch({ message: "Forbidden" }, 403));
      await expect(client.listProjects()).rejects.toMatchObject({ status: 403 });
    });

    it("throws AzureDevOpsError with status 404 for unknown org", async () => {
      vi.stubGlobal("fetch", mockFetch({ message: "Not Found" }, 404));
      await expect(client.listProjects()).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── listProjects ────────────────────────────────────────────

  describe("listProjects", () => {
    it("returns parsed projects from the API response", async () => {
      vi.stubGlobal(
        "fetch",
        mockFetch({
          count: 2,
          value: [
            { id: "p1", name: "Alpha", state: "wellFormed" },
            { id: "p2", name: "Beta", state: "wellFormed" },
          ],
        })
      );

      const projects = await client.listProjects();
      expect(projects).toHaveLength(2);
      expect(projects[0].name).toBe("Alpha");
    });

    it("builds the correct API endpoint", async () => {
      const fetchMock = mockFetch({ count: 0, value: [] });
      vi.stubGlobal("fetch", fetchMock);

      await client.listProjects();

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain("/_apis/projects");
      expect(url).toContain("api-version=7.1");
    });

    it("follows pagination via continuationToken", async () => {
      // First page returns a continuation token; second page returns none.
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: (k: string) => (k === "x-ms-continuationtoken" ? "tok1" : null) },
          json: async () => ({ count: 1, value: [{ id: "p1", name: "Alpha" }] }),
          text: async () => "",
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => null },
          json: async () => ({ count: 1, value: [{ id: "p2", name: "Beta" }] }),
          text: async () => "",
        });
      vi.stubGlobal("fetch", fetchMock);

      const projects = await client.listProjects();
      expect(projects).toHaveLength(2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      // Second call includes the token
      const [secondUrl] = fetchMock.mock.calls[1];
      expect(secondUrl).toContain("continuationToken=tok1");
    });
  });

  // ── listRepositories ────────────────────────────────────────

  describe("listRepositories", () => {
    it("returns repos with defaultBranch stripped of refs/heads/", async () => {
      vi.stubGlobal(
        "fetch",
        mockFetch({
          count: 1,
          value: [
            {
              id: "r1",
              name: "payments-api",
              defaultBranch: "refs/heads/main",
              project: { id: "p1", name: "FinTech" },
              remoteUrl: "https://...",
            },
          ],
        })
      );

      const repos = await client.listRepositories("FinTech");
      expect(repos[0].defaultBranch).toBe("main");
    });

    it("URL-encodes the project name", async () => {
      const fetchMock = mockFetch({ count: 0, value: [] });
      vi.stubGlobal("fetch", fetchMock);

      await client.listRepositories("My Project");

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain("My%20Project");
    });
  });

  // ── createPullRequest ────────────────────────────────────────

  describe("createPullRequest", () => {
    it("posts to the correct endpoint with refs/heads/ prefix on branch names", async () => {
      const prResponse = {
        pullRequestId: 42,
        title: "My PR",
        description: "desc",
        sourceRefName: "refs/heads/feature",
        targetRefName: "refs/heads/main",
        url: "https://...",
      };
      const fetchMock = mockFetch(prResponse, 201);
      vi.stubGlobal("fetch", fetchMock);

      const pr = await client.createPullRequest("FinTech", "r1", {
        title: "My PR",
        description: "desc",
        sourceBranch: "feature",
        targetBranch: "main",
      });

      expect(pr.pullRequestId).toBe(42);

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain("/pullrequests");
      expect(opts.method).toBe("POST");

      const body = JSON.parse(opts.body);
      expect(body.sourceRefName).toBe("refs/heads/feature");
      expect(body.targetRefName).toBe("refs/heads/main");
    });
  });

  // ── addPRComment ─────────────────────────────────────────────

  describe("addPRComment", () => {
    it("posts a thread with the comment content", async () => {
      const fetchMock = mockFetch({
        id: 1,
        comments: [{ id: 10, content: "Hello" }],
      });
      vi.stubGlobal("fetch", fetchMock);

      const comment = await client.addPRComment("FinTech", "r1", 42, "Hello");
      expect(comment.content).toBe("Hello");

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain("/threads");
      expect(opts.method).toBe("POST");
    });
  });
});
