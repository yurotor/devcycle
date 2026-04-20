// Elastic Cloud uses certs that Node doesn't trust by default
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export interface ElasticBucket {
  key: string;
  doc_count: number;
}

export interface ElasticHit {
  _source: Record<string, unknown>;
}

export class ElasticError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ElasticError";
  }
}

export class ElasticClient {
  private url: string;
  private apiKey: string;
  private useKibanaProxy: boolean;

  constructor(url: string, apiKey: string) {
    this.url = url.replace(/\/$/, "");
    this.apiKey = apiKey;
    // Detect Kibana URL (port 9243 or /app/ in path) — route through console proxy
    this.useKibanaProxy = url.includes(":9243") || url.includes("/app/");
  }

  private async request(path: string, body: Record<string, unknown>): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      let fetchUrl: string;
      let headers: Record<string, string>;

      if (this.useKibanaProxy) {
        // Route through Kibana's console proxy (same as Dev Tools)
        const esPath = path.startsWith("/") ? path : `/${path}`;
        fetchUrl = `${this.url}/api/console/proxy?path=${encodeURIComponent(esPath)}&method=POST`;
        headers = {
          "Content-Type": "application/json",
          Authorization: `ApiKey ${this.apiKey}`,
          "kbn-xsrf": "true",
        };
      } else {
        fetchUrl = `${this.url}/${path}`;
        headers = {
          "Content-Type": "application/json",
          Authorization: `ApiKey ${this.apiKey}`,
        };
      }

      const res = await fetch(fetchUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (res.status === 401 || res.status === 403) {
        throw new ElasticError("Authentication failed", res.status);
      }

      const text = await res.text();

      // Kibana returns HTML for auth errors
      if (text.includes("<html") || text.includes("<!DOCTYPE")) {
        throw new ElasticError("Authentication failed (received HTML — check API key)", 401);
      }

      if (!res.ok) {
        throw new ElasticError(`Elastic error ${res.status}: ${text.slice(0, 300)}`, res.status);
      }

      return JSON.parse(text);
    } catch (err) {
      if (err instanceof ElasticError) throw err;
      if ((err as Error).name === "AbortError") {
        throw new ElasticError("Request timed out", 408);
      }
      throw new ElasticError((err as Error).message, 0);
    } finally {
      clearTimeout(timeout);
    }
  }

  async query(index: string, body: Record<string, unknown>): Promise<{ hits: ElasticHit[]; total: number }> {
    const data = (await this.request(`${index}/_search`, body)) as {
      hits?: { hits?: ElasticHit[]; total?: { value?: number } | number };
    };

    const hits = data.hits?.hits ?? [];
    const total =
      typeof data.hits?.total === "number"
        ? data.hits.total
        : (data.hits?.total as { value?: number })?.value ?? 0;

    return { hits, total };
  }

  async aggregate(
    index: string,
    aggs: Record<string, unknown>,
    query?: Record<string, unknown>,
    size: number = 0
  ): Promise<Record<string, { buckets: ElasticBucket[] }>> {
    const body: Record<string, unknown> = { size, aggs };
    if (query) body.query = query;

    const data = (await this.request(`${index}/_search`, body)) as {
      aggregations?: Record<string, { buckets: ElasticBucket[] }>;
    };

    return data.aggregations ?? {};
  }

  async fetchSample(
    index: string,
    filter: Record<string, unknown>,
    size: number = 5
  ): Promise<ElasticHit[]> {
    const { hits } = await this.query(index, {
      size,
      query: filter,
      sort: [{ "@timestamp": { order: "desc" } }],
    });
    return hits;
  }
}
