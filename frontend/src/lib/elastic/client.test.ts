import { describe, it, expect, vi, beforeEach } from "vitest";
import { ElasticClient, ElasticError } from "./client";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe("ElasticClient", () => {
  let client: ElasticClient;

  beforeEach(() => {
    client = new ElasticClient("https://elastic.example.com:9243", "test-api-key");
    mockFetch.mockReset();
  });

  describe("aggregate", () => {
    it("returns buckets from successful aggregation", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          aggregations: {
            error_templates: {
              buckets: [
                { key: "Failed to connect to DB", doc_count: 42 },
                { key: "Timeout waiting for response", doc_count: 15 },
              ],
            },
          },
        })
      );

      const result = await client.aggregate(
        "logs-*",
        { error_templates: { terms: { field: "messageTemplate.keyword", size: 50 } } },
        { bool: { filter: [{ term: { logLevel: "Error" } }] } }
      );

      expect(result.error_templates.buckets).toHaveLength(2);
      expect(result.error_templates.buckets[0].key).toBe("Failed to connect to DB");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://elastic.example.com:9243/logs-*/_search",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "ApiKey test-api-key",
          }),
        })
      );
    });

    it("returns empty aggregations for empty result", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ aggregations: {} }));

      const result = await client.aggregate("logs-*", {
        templates: { terms: { field: "messageTemplate.keyword" } },
      });

      expect(result).toEqual({});
    });
  });

  describe("query", () => {
    it("returns hits and total", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          hits: {
            total: { value: 100 },
            hits: [{ _source: { message: "test error" } }],
          },
        })
      );

      const result = await client.query("logs-*", { size: 1 });
      expect(result.total).toBe(100);
      expect(result.hits).toHaveLength(1);
    });
  });

  describe("fetchSample", () => {
    it("returns sample documents", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          hits: {
            total: { value: 50 },
            hits: [
              { _source: { message: "error 1" } },
              { _source: { message: "error 2" } },
            ],
          },
        })
      );

      const result = await client.fetchSample("logs-*", { match_all: {} }, 2);
      expect(result).toHaveLength(2);
    });
  });

  describe("error handling", () => {
    it("throws ElasticError on auth failure (401)", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: "Unauthorized" }, 401));

      await expect(
        client.aggregate("logs-*", {})
      ).rejects.toThrow(ElasticError);

      try {
        await client.aggregate("logs-*", {});
      } catch (err) {
        expect((err as ElasticError).status).toBe(401);
        expect((err as ElasticError).message).toBe("Authentication failed");
      }
    });

    it("throws ElasticError on timeout", async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          })
      );

      await expect(client.query("logs-*", {})).rejects.toThrow("timed out");
    });

    it("handles malformed response gracefully", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ unexpected: "shape" })
      );

      const result = await client.query("logs-*", { size: 1 });
      expect(result.hits).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
