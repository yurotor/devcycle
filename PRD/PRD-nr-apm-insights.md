## Problem Statement

Development teams have services reporting APM data to NewRelic (endpoint calls, database queries, error rates, latency metrics), but this data sits isolated in the NewRelic UI. When incidents occur, engineers must manually context-switch between NewRelic, Elastic logs, and internal documentation to piece together what's happening. There is no automated correlation between APM anomalies, application logs, and institutional knowledge about service architecture and ownership.

## Solution

A continuous NewRelic APM monitoring panel within DevCycle that automatically detects anomalies in error rates, endpoint latency, and database query performance. When anomalies are detected, the system cross-references them with Elastic log data and Knowledge Base documentation, then uses an LLM to generate root cause analysis. This mirrors the existing Log Insights feature but for APM data, with cross-source correlation as the key differentiator.

## User Stories

1. As a developer, I want to connect my workspace to a NewRelic account with an API key, so that the app can query APM data on my behalf.
2. As a developer, I want to select which NewRelic appNames my workspace should monitor, so that I only see relevant services.
3. As a developer, I want to test my NewRelic connection before saving it, so that I know the credentials work.
4. As a developer, I want to see a live APM Insights panel that shows detected anomalies, so that I don't have to watch NewRelic dashboards manually.
5. As a developer, I want error rate anomalies detected automatically when they exceed 2x (warning) or 5x (critical) the baseline, so that I'm alerted to failures.
6. As a developer, I want p95 latency anomalies detected when they exceed 1.5x (warning) or 3x (critical) the baseline, so that I know when endpoints degrade.
7. As a developer, I want slow database query anomalies detected when average DB duration exceeds 2x (warning) or 4x (critical) the baseline, so that I catch DB bottlenecks.
8. As a developer, I want each anomaly to show the appName, metric type, current value, baseline value, and severity, so that I can quickly assess impact.
9. As a developer, I want trend sparklines on each insight, so that I can see whether the anomaly is worsening or recovering.
10. As a developer, I want to mute specific insights, so that known issues don't clutter the panel.
11. As a developer, I want to drill into an anomaly and see related Elastic logs from the same timeframe, so that I can correlate APM data with application logs.
12. As a developer, I want the drill-in view to show relevant Knowledge Base documentation about the affected service, so that I have architectural context.
13. As a developer, I want service mapping between NewRelic appNames and Elastic namespaces managed via the KB service catalog, so that cross-referencing works automatically.
14. As a developer, I want a fallback manual mapping in workspace settings if the KB doesn't have service catalog entries yet, so that cross-referencing still works.
15. As a developer, I want critical anomalies to automatically trigger LLM analysis that combines NR metrics, Elastic logs, and KB context into a root cause summary, so that analysis is ready when I look at it.
16. As a developer, I want an "Analyze" button on warning-severity anomalies to trigger LLM analysis on demand, so that I can investigate when I choose to.
17. As a developer, I want the LLM analysis to provide a root cause summary, suggested next steps, and relevant NRQL queries for further investigation, so that I have actionable guidance.
18. As a developer, I want to create a Jira ticket from an anomaly with all context pre-filled (NR metrics, Elastic errors, KB notes, LLM analysis), so that I can escalate without manual copy-paste.
19. As a developer, I want the poller to run every 5 minutes in the background, so that anomalies are detected promptly without manual refresh.
20. As a developer, I want the UI to refresh every 30 seconds, so that new insights appear without page reload.
21. As a developer, I want my NewRelic API key stored encrypted, so that credentials are secure.
22. As a developer, I want APM Insights scoped to my workspace, so that different teams see only their services.

## Implementation Decisions

### Modules

1. **NR Connection Manager** — Stores and retrieves encrypted NR API key + account ID per workspace. CRUD for monitored appName list. Mirrors existing Elastic connection pattern with encrypted credential storage.

2. **NR Query Engine** — Executes NRQL queries via NR REST API. Three built-in aggregated queries using `FACET appName` to get all monitored apps in one call:
   - Error rate: `SELECT count(*) FROM TransactionError FACET appName SINCE 5 minutes ago`
   - P95 latency: `SELECT percentile(duration, 95) FROM Transaction FACET appName SINCE 5 minutes ago`
   - Slow DB: `SELECT average(databaseDuration) FROM Transaction WHERE databaseDuration > 1 FACET name, appName SINCE 5 minutes ago`

3. **NR Poller** — Background polling every 5 minutes. Runs 3 aggregated queries per cycle. Compares results against exponential moving average (EMA) baseline. Generates insights with metric-specific severity thresholds (error: 2x/5x, latency: 1.5x/3x, DB: 2x/4x).

4. **NR Insights Storage** — Two new database tables:
   - `nrConnections`: id, workspaceId, apiKey (encrypted), accountId, appNames (JSON array)
   - `nrInsights`: id, workspaceId, appName, metricType (error_rate | latency_p95 | slow_db), currentValue, baselineValue, severity (info | warning | critical), nrqlQuery, detectedAt, mutedAt, analysisResult

5. **Cross-Reference Engine** — Given an NR insight, pulls related Elastic logs from the same timeframe using service mapping from KB service catalog (NR appName to Elastic namespace). Falls back to manual workspace config. Also retrieves relevant KB documentation about the affected service.

6. **LLM Analysis** — Takes NR insight + cross-reference data (Elastic logs + KB docs) and produces root cause summary, suggested next steps, and pre-filled ticket content. Auto-triggers for critical severity insights. On-demand via "Analyze" button for warning severity.

7. **API Routes** — REST endpoints mirroring Elastic pattern:
   - `POST /api/newrelic/connect` — save NR connection config
   - `GET /api/newrelic/insights` — list insights with severity/mute filtering
   - `POST /api/newrelic/analyze` — trigger LLM analysis for a specific insight
   - `POST /api/newrelic/test` — test NR connection validity

8. **APM Insights Panel** — React component mirroring Log Insights panel. Shows severity badges, trend sparklines, mute toggles. Drill-in view displays cross-referenced Elastic logs and KB context. Progressive disclosure: summary → LLM analysis → create Jira ticket.

### Architecture Decisions

- **3 queries per poll cycle regardless of entity count** — aggregated FACET queries scale without hitting NR rate limits.
- **EMA baseline with metric-specific thresholds** — different metric types have different sensitivity characteristics. Latency doubling is more severe than error count doubling.
- **Separate `nrInsights` table** — NR insights have fundamentally different fields than Elastic log insights. Avoids nullable column bloat and keeps Elastic code untouched.
- **KB-driven service mapping with manual fallback** — KB service catalog is the primary source for mapping NR appNames to Elastic namespaces. Manual config in workspace settings serves as fallback.
- **One NR account per workspace, user selects appNames** — NR accounts are typically org-wide. Each workspace configures which appNames it monitors.

## Testing Decisions

Good tests verify external behavior through the module's public interface, not implementation details. Tests should be resilient to refactoring — if the internal approach changes but the output stays the same, tests should still pass.

### Modules to test:

1. **NR Query Engine** — Test that NRQL queries are correctly constructed, HTTP requests are properly formatted with auth headers, and responses are correctly parsed into structured data. Mock HTTP responses to test error handling (auth failures, rate limits, malformed responses). Similar pattern to any API client tests in the codebase.

2. **NR Poller (baseline/severity logic)** — Test EMA calculation accuracy, threshold classification (given a baseline and current value, is severity correct?), and that metric-specific thresholds are applied correctly (error rate uses 2x/5x, latency uses 1.5x/3x, DB uses 2x/4x). Pure logic, no external dependencies needed.

### Prior art:
- Existing test pattern in `frontend/src/lib/db/migrations.test.ts`

## Out of Scope

- **Unified insight stream** — merging Elastic and NR insights into one correlated feed is phase 2.
- **NR alert ingestion** — pulling NR alert violations (NrAiIncident) instead of raw metrics is phase 2.
- **Proactive alerting** — correlating NR metrics with deploy events for predictive analysis.
- **Infrastructure metrics** — CPU, memory, disk monitoring from NR.
- **Distributed tracing** — cross-service trace analysis.
- **NR dashboard embedding** — embedding NR visualizations directly.
- **Throughput/Apdex monitoring** — nice-to-have metrics, not core to incident investigation.
- **Configurable polling intervals** — fixed 5-min interval for now.

## Further Notes

- NR appNames for current workspace: `Selling`, `Selling / Grooming`, `Selling / Purchase`, `Selling / Selling Monitoring`, `Selling-Ingestion`, `Selling-Ingestion / Application Monitoring`, `Selling-Ingestion / Host`, `Selling-Ingestion / Overview`, `Selling-Ingestion / Transactions`. All related to the same WebAPI, broken down by business topics.
- Current Elastic namespace is single: `logs-sellingwebapi*`. Mapping is many-NR-apps to one-Elastic-namespace for this workspace.
- Phase 2 should consider pulling NR's built-in alert violations once teams have alerts well-configured, which would replace custom baseline logic with NR's more sophisticated anomaly detection.
