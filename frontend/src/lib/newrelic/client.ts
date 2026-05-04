export interface NRQLResult {
  results: Array<Record<string, unknown>>;
  facets?: NRQLFacet[];
}

export interface NRQLFacet {
  name: string;
  results: Array<Record<string, unknown>>;
}

export class NewRelicError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "NewRelicError";
  }
}

export class NewRelicClient {
  private accountId: string;
  private apiKey: string;

  constructor(accountId: string, apiKey: string) {
    this.accountId = accountId;
    this.apiKey = apiKey;
  }

  async nrql(query: string): Promise<NRQLResult> {
    const url = "https://api.newrelic.com/graphql";
    const gql = {
      query: `{ actor { account(id: ${this.accountId}) { nrql(query: ${JSON.stringify(query)}) { results } } } }`,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": this.apiKey,
        },
        body: JSON.stringify(gql),
        signal: controller.signal,
      });

      if (res.status === 401 || res.status === 403) {
        throw new NewRelicError("Authentication failed", res.status);
      }

      const text = await res.text();

      if (!res.ok) {
        throw new NewRelicError(
          `NewRelic API error ${res.status}: ${text.slice(0, 300)}`,
          res.status
        );
      }

      const json = JSON.parse(text) as {
        data?: { actor?: { account?: { nrql?: { results?: unknown[] } } } };
        errors?: Array<{ message: string }>;
      };

      if (json.errors?.length) {
        throw new NewRelicError(json.errors[0].message, 400);
      }

      const nrqlData = json.data?.actor?.account?.nrql;
      if (!nrqlData) {
        throw new NewRelicError("No data returned from NerdGraph", 500);
      }

      const results = (nrqlData.results ?? []) as Array<Record<string, unknown>>;

      // NerdGraph returns FACET results flat with a "facet" key per row
      const hasFacets = results.length > 0 && results[0].facet !== undefined;
      if (hasFacets) {
        const facetMap = new Map<string, Array<Record<string, unknown>>>();
        for (const row of results) {
          const facetName = Array.isArray(row.facet) ? row.facet.join(", ") : String(row.facet);
          const { facet: _, ...rest } = row;
          let bucket = facetMap.get(facetName);
          if (!bucket) {
            bucket = [];
            facetMap.set(facetName, bucket);
          }
          bucket.push(rest);
        }
        const facets: NRQLFacet[] = [];
        for (const [name, fResults] of facetMap) {
          facets.push({ name, results: fResults });
        }
        return { results, facets };
      }

      return { results };
    } catch (err) {
      if (err instanceof NewRelicError) throw err;
      if ((err as Error).name === "AbortError") {
        throw new NewRelicError("Request timed out", 408);
      }
      throw new NewRelicError((err as Error).message, 0);
    } finally {
      clearTimeout(timeout);
    }
  }

  async testConnection(): Promise<boolean> {
    const result = await this.nrql("SELECT count(*) FROM Transaction SINCE 1 minute ago");
    return Array.isArray(result.results);
  }

  private appFilter(appNames: string[], table: string = "appName"): string {
    if (appNames.length === 0) return "";
    const list = appNames.map((n) => `'${n.replace(/'/g, "\\'")}'`).join(", ");
    return ` WHERE ${table} IN (${list})`;
  }

  async getErrorRates(appNames: string[] = [], sinceMinutes: number = 5): Promise<NRQLResult> {
    return this.nrql(
      `SELECT count(*) FROM TransactionError${this.appFilter(appNames)} FACET appName SINCE ${sinceMinutes} minutes ago LIMIT 100`
    );
  }

  async getLatencyP95(appNames: string[] = [], sinceMinutes: number = 5): Promise<NRQLResult> {
    return this.nrql(
      `SELECT percentile(duration, 95) FROM Transaction${this.appFilter(appNames)} FACET name, appName SINCE ${sinceMinutes} minutes ago LIMIT 100`
    );
  }

  async getSlowDBQueries(appNames: string[] = [], sinceMinutes: number = 5): Promise<NRQLResult> {
    const where = appNames.length > 0
      ? `WHERE appName IN (${appNames.map((n) => `'${n.replace(/'/g, "\\'")}'`).join(", ")}) AND databaseDuration > 0.1`
      : "WHERE databaseDuration > 0.1";
    return this.nrql(
      `SELECT average(databaseDuration) FROM Transaction ${where} FACET name, appName SINCE ${sinceMinutes} minutes ago LIMIT 100`
    );
  }

  async getErrorHistogram(appNames: string[] = [], sinceMinutes: number = 30): Promise<NRQLResult> {
    return this.nrql(
      `SELECT count(*) FROM TransactionError${this.appFilter(appNames)} FACET appName TIMESERIES 1 minute SINCE ${sinceMinutes} minutes ago LIMIT 100`
    );
  }
}
