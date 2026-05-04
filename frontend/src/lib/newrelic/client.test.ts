import { describe, it, expect, vi, beforeEach } from "vitest";
import { NewRelicClient, NewRelicError } from "./client";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

describe("NewRelicClient", () => {
  let client: NewRelicClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new NewRelicClient("12345", "NRIQ-test-key");
  });

  describe("nrql", () => {
    it("sends correct URL and headers", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ results: [{ count: 42 }] }));

      await client.nrql("SELECT count(*) FROM Transaction");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("https://insights-api.newrelic.com/v1/accounts/12345/query"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "X-Query-Key": "NRIQ-test-key",
          }),
        })
      );
    });

    it("URL-encodes NRQL query", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }));

      await client.nrql("SELECT count(*) FROM Transaction WHERE appName='Selling'");

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("nrql=");
      expect(url).toContain(encodeURIComponent("SELECT count(*)"));
    });

    it("parses valid response", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          results: [{ count: 100 }],
          facets: [
            { name: "Selling", results: [{ count: 50 }] },
            { name: "Selling-Ingestion", results: [{ count: 50 }] },
          ],
        })
      );

      const result = await client.nrql("SELECT count(*) FROM TransactionError FACET appName");

      expect(result.results).toHaveLength(1);
      expect(result.facets).toHaveLength(2);
      expect(result.facets![0].name).toBe("Selling");
    });

    it("throws NewRelicError on 401", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: "unauthorized" }, 401));

      await expect(client.nrql("SELECT 1")).rejects.toThrow("Authentication failed");
    });

    it("throws NewRelicError on 500", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: "server error" }, 500));

      await expect(client.nrql("SELECT 1")).rejects.toThrow(NewRelicError);
    });

    it("throws on timeout", async () => {
      mockFetch.mockImplementationOnce(() => {
        const err = new Error("aborted");
        err.name = "AbortError";
        return Promise.reject(err);
      });

      await expect(client.nrql("SELECT 1")).rejects.toThrow("Request timed out");
    });
  });

  describe("getErrorRates", () => {
    it("sends correct NRQL", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ results: [], facets: [] }));

      await client.getErrorRates(10);

      const url = mockFetch.mock.calls[0][0] as string;
      const nrql = decodeURIComponent(url.split("nrql=")[1]);
      expect(nrql).toContain("TransactionError");
      expect(nrql).toContain("FACET appName");
      expect(nrql).toContain("10 minutes ago");
    });
  });

  describe("getLatencyP95", () => {
    it("sends correct NRQL", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ results: [], facets: [] }));

      await client.getLatencyP95();

      const url = mockFetch.mock.calls[0][0] as string;
      const nrql = decodeURIComponent(url.split("nrql=")[1]);
      expect(nrql).toContain("percentile(duration, 95)");
      expect(nrql).toContain("FACET name, appName");
    });
  });

  describe("getSlowDBQueries", () => {
    it("sends correct NRQL", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ results: [], facets: [] }));

      await client.getSlowDBQueries();

      const url = mockFetch.mock.calls[0][0] as string;
      const nrql = decodeURIComponent(url.split("nrql=")[1]);
      expect(nrql).toContain("databaseDuration");
      expect(nrql).toContain("FACET name, appName");
    });
  });

  describe("testConnection", () => {
    it("returns true on valid response", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ results: [{ count: 0 }] }));

      const ok = await client.testConnection();
      expect(ok).toBe(true);
    });

    it("throws on auth failure", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}, 403));

      await expect(client.testConnection()).rejects.toThrow("Authentication failed");
    });
  });
});
