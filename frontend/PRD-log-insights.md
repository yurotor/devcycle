# PRD: Log Insights — AI-Powered Log Analysis from Elastic

## Problem Statement

The Selling Web API runs as an ECS task in AWS, producing over 100M log entries per day streamed to Elastic Cloud. About 50% of these are errors — a mix of business-level warnings, timeouts, and genuine exceptions. Today, no one proactively monitors these logs for patterns, emerging issues, or recurring failures. Developers only look at logs reactively when a bug is reported. There is no connection between log events and actionable development work.

DevCycle already orchestrates the full SDLC from Jira ticket to deployed code, and already performs AI-powered failure analysis on Jenkins pipeline logs. Extending this to runtime application logs closes the feedback loop: the system that writes the code can also observe what the code does in production and suggest fixes before anyone files a bug.

## Solution

Add a **Log Insights** feature to DevCycle that connects to Elastic, polls for error patterns on a 5-minute interval, uses Claude to diagnose issues, and allows users to promote AI-suggested fixes directly into executable Jira tickets — skipping analysis, plan, and design phases entirely.

The flow:

1. User configures an Elastic connection in the UI (URL, API key, index pattern, repo)
2. DevCycle polls Elastic every 5 minutes, running aggregation queries to detect error patterns, rate spikes, new errors, and exceptions with stack traces
3. Detected patterns are compared against a stored baseline to identify anomalies
4. Each detected issue receives an AI diagnosis (category, severity, root cause hypothesis)
5. User reviews insights in a dedicated top-level Log Insights panel
6. User can click **Suggest Fix** — Claude analyzes sample logs + stack traces + KB source code to generate a fix with a mini PRD
7. User clicks **Accept** — DevCycle auto-creates a Jira ticket that lands directly in the Execute phase with a PRD and a single task, ready for Claude to write the code

## User Stories

1. As a developer, I want to connect DevCycle to my Elastic instance by entering a URL, API key, and index pattern, so that DevCycle can access my application logs
2. As a developer, I want my Elastic API key encrypted at rest, so that credentials are handled securely like other integrations (ADO, Jira, Jenkins)
3. As a developer, I want to select which repo a log connection belongs to, so that Claude can cross-reference stack traces with the correct source code in the KB
4. As a developer, I want DevCycle to poll Elastic every 5 minutes automatically, so that I get near-real-time awareness of log issues without manual action
5. As a developer, I want to see the top error patterns grouped by message template, so that I understand what errors are most frequent
6. As a developer, I want to see exception types grouped by class name with sample stack traces, so that I can identify the source of real bugs
7. As a developer, I want to see rate spike detection (2x = warning, 5x = critical), so that I know when something suddenly got worse
8. As a developer, I want to see newly appeared error patterns that were never seen before, so that I catch regressions and new issues immediately
9. As a developer, I want a stored baseline of known error patterns and their normal rates, so that spike and new-error detection is accurate over time
10. As a developer, I want the baseline to auto-decay toward current rates, so that permanent shifts in error patterns stop triggering false alerts
11. As a developer, I want to see "first seen" timestamps per error pattern, so that I can correlate new errors with deployments or config changes
12. As a developer, I want each detected issue to show an AI-generated diagnosis with category, severity, and root cause hypothesis, so that I understand the issue without reading raw logs
13. As a developer, I want to click "Suggest Fix" on any insight, so that Claude analyzes sample logs, stack traces, and KB source code to propose a concrete fix
14. As a developer, I want the fix suggestion to include a mini PRD and code-level guidance (file, method, what to change), so that the fix is actionable
15. As a developer, I want to click "Accept" on a suggested fix, so that a Jira ticket is auto-created and placed directly into the Execute phase
16. As a developer, I want the accepted fix ticket to include a PRD (which may be small) and a task breakdown (which may be a single task), so that the existing Execute flow can take over immediately
17. As a developer, I want to switch between dev and production environments using a dropdown, so that I can monitor either environment without separate configurations
18. As a developer, I want to mute specific error patterns, so that known/expected errors don't clutter the insights panel
19. As a developer, I want muted patterns to still be tracked but hidden from the default view, so that I can toggle visibility if needed
20. As a developer, I want the Log Insights panel accessible from the top-level icon rail, so that it's always one click away regardless of what I'm doing
21. As a developer, I want the Log Insights panel to show sparkline charts of error rates over the last 30 minutes, so that I can see trends at a glance
22. As a developer, I want severity badges (warning/critical) on each insight, so that I can quickly prioritize what to look at first
23. As a developer, I want the setup flow to be accessible from the UI where I point to a repo and configure its log location, so that adding new services is self-service
24. As a developer, I want the polling to only run when a connection is configured and active, so that there's no unnecessary background work

## Implementation Decisions

### Architecture

The feature follows the same architectural patterns as the existing pipeline monitoring: a background poller writes to SQLite, API routes serve the data, and React components render it. Claude integration reuses the Bedrock/Anthropic API client already in use for failure analysis and code generation.

### Modules

**Elastic Client** — REST client wrapping Elastic Search and Aggregation APIs. Interface: `query(index, body)`, `aggregate(index, aggs)`, `fetchSample(index, filter, size)`. Handles API key auth via `Authorization: ApiKey <encoded>` header. Connects to Elastic Cloud on port 9243.

**Log Poller** — 5-minute interval engine modeled after the pipeline monitor. Each cycle runs 3 Elastic aggregation queries: (1) top 50 error messageTemplates by count, (2) top 50 exception ClassNames, (3) error rate date_histogram in 1-minute buckets for 30 minutes. Results are compared against the baseline table. Detected anomalies (new patterns, rate spikes, exceptions) are written to the logInsights table with an auto-generated diagnosis.

**Log Analyzer** — Claude integration for two levels of analysis. Diagnose (background): takes aggregated pattern data + a few sample log entries, returns category, severity, root cause hypothesis. Fix suggestion (on-demand): takes sample logs + stack traces + relevant source code from KB, returns a mini PRD and specific code change guidance. Follows the same pattern as pipeline/analyzer.ts.

**Insight-to-Ticket Bridge** — Converts an accepted fix suggestion into a Jira ticket in Execute phase. Creates the ticket via existing Jira client, generates a compact PRD markdown file, creates a single task in the swimlane editor, and sets the ticket phase to "execute". Reuses all existing ticket creation and phase management logic.

### Schema

Three new tables:

- **elasticConnections** — id, workspaceId, repoId (nullable), name, url, apiKeyEncrypted, indexPattern, environment (default "production"), pollingEnabled (boolean), createdAt, updatedAt
- **logBaseline** — id, connectionId, messageTemplate, exceptionClassName (nullable), avgHourlyRate, lastSeen, firstSeen, updatedAt
- **logInsights** — id, connectionId, type (enum: pattern, spike, new_error, exception), severity (enum: info, warning, critical), messageTemplate, exceptionClassName (nullable), diagnosis (text), fixSuggestion (text, nullable), fixPrd (text, nullable), count (integer), baselineRate (float, nullable), currentRate (float), sampleData (JSON — array of sample log entries), status (enum: open, muted, accepted), jiraTicketId (nullable), detectedAt, updatedAt

### Elastic Query Strategy

Background poll (3 queries per 5-min cycle, ~864 queries/day):

1. Terms aggregation on `messageTemplate.keyword` filtered by `logLevel: Error`, time range last 5 minutes, size 50
2. Terms aggregation on `exceptions.ClassName` where `exceptions.StackTraceString` exists, time range last 5 minutes, size 50
3. Date histogram (1-min buckets, 30-min window) on `logLevel: Error` for sparkline data

On-demand (2 queries per user action):

4. Fetch 5 sample documents matching a specific `messageTemplate.keyword`, sorted by recency, including all fields
5. Fetch distinct `exceptions.StackTraceString` values for a specific `messageTemplate.keyword`

All queries include `data_stream.namespace` filter matching the selected environment.

### Key Log Fields

- `messageTemplate.keyword` — primary error pattern grouping key (Serilog structured template)
- `message` — rendered instance of the template with actual values
- `logLevel` — Error, Warning, Information, etc.
- `exceptions[].ClassName` — .NET exception type
- `exceptions[].Message` — exception message
- `exceptions[].StackTraceString` — full stack trace with file paths and line numbers
- `exceptions[].Depth` — for inner exception chains
- `fields.SourceContext` — C# class/namespace generating the log
- `data_stream.namespace` — environment (dev, production)
- `@timestamp` — log timestamp

### Spike Detection

Rate spikes are detected by comparing current 5-minute error counts against the stored baseline hourly rate (normalized to a 5-minute window). Thresholds: 2x baseline = warning severity, 5x baseline = critical severity. Baseline auto-decays toward current rates using exponential moving average to avoid permanent false alerts after legitimate traffic changes.

### New Error Detection

A messageTemplate is "new" if it does not exist in the logBaseline table. On first detection, it is flagged as a new_error insight and added to the baseline. First-seen timestamp is recorded and displayed in the UI.

### Environment Handling

The environment dropdown filters by `data_stream.namespace`. The Elastic connection stores a default environment, but the user can switch freely in the UI. Queries, baselines, and insights are all scoped by environment — a pattern can be "new" in production even if it's known in dev.

### Fix Acceptance Flow

When a user accepts a fix: (1) create Jira issue via existing Jira client with title derived from the error pattern, (2) write a compact PRD markdown file containing the diagnosis, fix suggestion, and relevant log samples, (3) create a single task in the task/wave system pointing to the affected file(s) from the stack trace, (4) set ticket phase to "execute", (5) update the logInsight record with the Jira ticket ID and status "accepted".

## Testing Decisions

Good tests verify external behavior through the module's public interface, not internal implementation details. Tests should be resilient to refactoring — if the behavior doesn't change, the test shouldn't break.

### Elastic Client (tested)

Test the client's ability to construct correct Elastic query payloads and parse responses. Mock HTTP responses to simulate: successful aggregation results, authentication failures, timeout errors, malformed responses, empty result sets. Verify that the client correctly extracts aggregation buckets, handles pagination, and surfaces errors.

### Log Poller (tested)

Test the polling logic end-to-end with a mocked Elastic client. Verify: (1) baseline creation on first poll, (2) spike detection at 2x and 5x thresholds, (3) new error detection for unknown messageTemplates, (4) baseline decay over multiple cycles, (5) correct environment scoping, (6) muted patterns are tracked but not surfaced as new insights. Use the existing test patterns in the codebase (if any) as reference for async polling tests.

### Analyzer and Bridge (not tested)

These modules are thin wrappers around existing infrastructure (Claude API client, Jira client, ticket creation). Their logic is mostly composition and data transformation. Test coverage would duplicate tests of the underlying modules. If they grow complex enough to warrant testing, extract the complex parts into testable pure functions.

## Out of Scope

- **Real-time streaming** (WebSocket/SSE from Elastic) — polling at 5-min intervals is sufficient for the suggest-fix workflow
- **Multi-service support** — designed for one service at a time. Schema supports multiple connections, but UI and polling are single-service for now
- **Auto-creating Jira tickets without user approval** — too noisy at 50% error rate. User must explicitly accept
- **Full code generation from the insights panel** — accepted fixes flow into the existing Execute phase. No new code generation infrastructure
- **Log search/exploration** — DevCycle is not a Kibana replacement. It surfaces patterns and insights, not raw log browsing
- **Alerting/notifications** (email, Slack, PagerDuty) — insights are visible in the UI only
- **CloudWatch direct integration** — Elastic is the single data source, CloudWatch is upstream and already streamed to Elastic
- **Custom aggregation queries** — the 3-query poll strategy is fixed. Users cannot define custom Elastic queries

## Further Notes

- The Elastic instance is Elastic Cloud (hosted on `aws.found.io`), accessed via API key auth. The user accesses Kibana via corporate SSO, but programmatic access requires an API key generated by an Elastic admin.
- The Selling Web API uses Serilog for structured logging, which provides the `messageTemplate` field — the key enabler for pattern grouping without AI involvement.
- The `exceptions` array in Elastic follows the .NET exception serialization format with `Depth` for inner exceptions, `ClassName` for the exception type, and `StackTraceString` with full file paths and line numbers (e.g., `VolumeFeeOutboxProcessor.cs:line 131`). These paths map to the repo source code, enabling Claude to cross-reference with the KB.
- The `fields.Massage` typo in the log schema is intentional (existing codebase typo, not ours) — queries must use `fields.Massage.*` not `fields.Message.*`.
- The service processes webhook events (payments, transfers) and runs background outbox processors — it is event-driven, not a traditional request/response API. Error analysis should account for async processing patterns (timeouts, retries, outbox failures) rather than HTTP request/response metrics.
- At ~112M logs/day in dev with ~55M errors, the aggregation-first approach is essential. DevCycle never downloads bulk logs — it queries aggregations (server-side computation in Elastic) and fetches small samples for AI analysis.
