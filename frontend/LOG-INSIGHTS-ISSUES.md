# Log Insights — Implementation Issues

Parent PRD: `frontend/PRD-log-insights.md`

## Dependency Graph

```
1 → 2 → 3 → 4, 5, 6, 7, 8, 9 (parallel)
                6 + 9 → 10 → 11
                4 + 5 → 12
```

---

## Issue 1: Elastic Connection Setup

- **Status:** DONE
- **Type:** AFK
- **Blocked by:** None
- **Implemented in:** `src/lib/db/schema.ts` (elasticConnections + logBaseline + logInsights tables), `src/lib/db/index.ts` (DDL), `src/app/api/elastic/connect/route.ts` (POST/GET)

### What to build

End-to-end connection setup: user enters Elastic URL, API key, index pattern, and selects a repo. Credentials encrypted at rest using existing AES encryption (same as Jira/ADO PATs). Connection test ping verifies credentials before saving.

Schema: `elasticConnections` table (id, workspaceId, repoId, name, url, apiKeyEncrypted, indexPattern, environment, pollingEnabled, createdAt, updatedAt).

API routes: POST to save connection, GET to retrieve. Setup UI form accessible from settings or setup flow.

### Acceptance criteria

- [ ] `elasticConnections` table created in schema with migration
- [ ] API key encrypted at rest using existing ENCRYPTION_KEY mechanism
- [ ] POST `/api/elastic/connect` saves connection with encrypted key
- [ ] GET `/api/elastic/connect` returns connection (without raw key)
- [ ] UI form: URL, API key, index pattern input, repo selector dropdown
- [ ] Connection test pings Elastic on save, shows error if credentials invalid
- [ ] Connection scoped to workspace

### User stories addressed

- User story 1 (connect to Elastic)
- User story 2 (encrypted credentials)
- User story 3 (repo association)
- User story 23 (self-service setup)

---

## Issue 2: Elastic Client + Tests

- **Status:** DONE
- **Type:** AFK
- **Blocked by:** Issue 1
- **Implemented in:** `src/lib/elastic/client.ts`, `src/lib/elastic/client.test.ts`

### What to build

REST client wrapping Elastic Search and Aggregation APIs. Simple interface: `query(index, body)`, `aggregate(index, aggs)`, `fetchSample(index, filter, size)`. Handles API key auth via `Authorization: ApiKey <encoded>` header. Targets Elastic Cloud on port 9243.

Unit tests with mocked HTTP responses covering: successful aggregation results, authentication failures, timeout errors, malformed responses, empty result sets. Verify correct query payload construction and response parsing.

### Acceptance criteria

- [ ] `src/lib/elastic/client.ts` with `query()`, `aggregate()`, `fetchSample()` methods
- [ ] API key auth header correctly formatted
- [ ] Proper error handling: auth failures, timeouts, malformed responses
- [ ] Aggregation bucket extraction from Elastic response format
- [ ] Unit tests: successful aggregation, auth failure, timeout, empty results, malformed response
- [ ] Tests use mocked HTTP, no real Elastic dependency

### User stories addressed

- Infrastructure module — enables all log querying

---

## Issue 3: First Poll + Error Patterns + Nav

- **Status:** DONE
- **Type:** AFK
- **Blocked by:** Issue 2
- **Implemented in:** `src/lib/elastic/poller.ts`, `src/app/api/elastic/insights/route.ts`, `src/components/log-insights-panel.tsx`, `src/components/app-shell.tsx` (Activity icon + insights view)

### What to build

The tracer bullet. Full vertical slice from Elastic query to UI display.

Schema: `logBaseline` table (connectionId, messageTemplate, avgHourlyRate, lastSeen, firstSeen) and `logInsights` table (connectionId, type, severity, messageTemplate, diagnosis, count, currentRate, sampleData, status, detectedAt).

Poller: 5-min interval engine (modeled after pipeline monitor). First cycle runs top-50 error `messageTemplate.keyword` terms aggregation. Stores initial baseline. Writes pattern-type insights.

API: GET `/api/elastic/insights` returns insights list.

UI: Log Insights icon added to icon rail in app-shell. Clicking it switches main view to Log Insights panel showing error patterns table (message template, count, detected time).

### Acceptance criteria

- [ ] `logBaseline` and `logInsights` tables created in schema
- [ ] Poller starts on app boot when an active connection exists
- [ ] Poller runs terms aggregation on `messageTemplate.keyword` where `logLevel: Error` every 5 min
- [ ] First poll populates baseline table with all discovered templates + rates
- [ ] Insights written to `logInsights` table
- [ ] GET `/api/elastic/insights` returns insights filtered by connectionId
- [ ] Log Insights icon in app-shell icon rail (top-level nav)
- [ ] Main view shows error patterns table with template, count, detected time
- [ ] Poller only runs when `pollingEnabled` is true on the connection

### User stories addressed

- User story 4 (automatic polling)
- User story 5 (error patterns by template)
- User story 20 (top-level nav)
- User story 24 (polling only when configured)

---

## Issue 4: Spike Detection + Severity Badges

- **Status:** DONE
- **Type:** AFK
- **Blocked by:** Issue 3
- **Implemented in:** `src/lib/elastic/poller.ts` (processErrorPatterns: 2x/5x thresholds, EMA decay), `src/components/log-insights-panel.tsx` (severity badges)

### What to build

Baseline comparison logic in the poller. Each cycle: compare current 5-min error counts per template against stored baseline hourly rate (normalized to 5-min window). Thresholds: 2x = warning, 5x = critical. Update insight severity accordingly.

Baseline auto-decay using exponential moving average — slowly adjusts toward current rates so permanent shifts stop triggering false alerts.

UI: severity badges (yellow for warning, red for critical) displayed per row in the insights table.

### Acceptance criteria

- [ ] Poller compares current rates against baseline on each cycle
- [ ] 2x baseline rate → insight marked severity "warning"
- [ ] 5x baseline rate → insight marked severity "critical"
- [ ] Baseline auto-decays via EMA on each poll cycle
- [ ] Severity badges rendered in insights table (yellow/red)
- [ ] Patterns below threshold shown as "info" severity

### User stories addressed

- User story 7 (rate spike detection)
- User story 9 (stored baseline)
- User story 10 (baseline auto-decay)
- User story 22 (severity badges)

---

## Issue 5: New Error Detection

- **Status:** DONE
- **Type:** AFK
- **Blocked by:** Issue 3
- **Implemented in:** `src/lib/elastic/poller.ts` (processErrorPatterns: new_error type + firstSeen), `src/components/log-insights-panel.tsx` ("New" badge)

### What to build

During each poll cycle, compare discovered `messageTemplate` values against the baseline table. Any template not present in baseline is flagged as `type: new_error`. Record `firstSeen` timestamp in baseline when adding.

UI: "New" badge on insights that are type `new_error`. Display first-seen timestamp per pattern.

### Acceptance criteria

- [ ] Poller detects messageTemplates not in baseline table
- [ ] New templates create insight with `type: new_error`
- [ ] `firstSeen` timestamp recorded in baseline on first detection
- [ ] "New" badge displayed in UI for new_error type insights
- [ ] First-seen timestamp visible per pattern row

### User stories addressed

- User story 8 (new error patterns)
- User story 11 (first-seen timestamps)

---

## Issue 6: Exception Grouping + Stack Traces

- **Status:** DONE
- **Type:** AFK
- **Blocked by:** Issue 3
- **Implemented in:** `src/lib/elastic/poller.ts` (processExceptionPatterns), `src/lib/elastic/analyzer.ts` (stack trace fetch in suggestFix), `src/components/log-insights-panel.tsx` (expandable rows + sampleData display)

### What to build

Second aggregation query in the poll cycle: top 50 `exceptions.ClassName` terms aggregation where `exceptions.StackTraceString` exists, last 5 minutes.

On-demand sample fetch: when user expands an exception insight, fetch distinct `exceptions.StackTraceString` values + `exceptions.Message` for that pattern.

UI: exception insights shown in the same table (or filterable tab). Expandable row showing stack trace with syntax highlighting. `exceptions.ClassName` displayed as the pattern identifier for exception-type insights.

### Acceptance criteria

- [ ] Poller runs second aggregation query for exception class names
- [ ] Exception-type insights written to `logInsights` with `exceptionClassName`
- [ ] API endpoint to fetch sample stack traces for a specific insight
- [ ] UI: expandable stack trace display per exception insight
- [ ] Stack trace shows file paths and line numbers from `StackTraceString`
- [ ] `exceptions.Message` shown alongside class name

### User stories addressed

- User story 6 (exception types with stack traces)

---

## Issue 7: Sparkline Charts

- **Status:** DONE
- **Type:** AFK
- **Blocked by:** Issue 3
- **Implemented in:** `src/lib/elastic/poller.ts` (date_histogram + storeHistogramData), `src/components/log-insights-panel.tsx` (Sparkline SVG component)

### What to build

Third aggregation query in the poll cycle: `date_histogram` with 1-minute buckets over a 30-minute window, filtered by `logLevel: Error`. Store the histogram data per poll cycle.

UI: inline sparkline chart per pattern row showing the error rate trend over the last 30 minutes.

### Acceptance criteria

- [ ] Poller runs date_histogram aggregation (1-min buckets, 30-min window)
- [ ] Histogram data stored and served via insights API
- [ ] Sparkline chart rendered inline per insight row
- [ ] Chart updates on each poll cycle

### User stories addressed

- User story 21 (sparkline charts)

---

## Issue 8: Environment Selector

- **Status:** DONE
- **Type:** AFK
- **Blocked by:** Issue 3
- **Implemented in:** `src/components/log-insights-panel.tsx` (environment dropdown), `src/lib/elastic/poller.ts` (data_stream.namespace filter + per-env baselines)

### What to build

Environment dropdown in the Log Insights panel header. Options derived from `data_stream.namespace` (dev, production). Selecting an environment filters all Elastic queries by namespace.

Baselines and insights are scoped per environment — a pattern can be "new" in production even if known in dev. The `elasticConnections` table stores a default environment, but the UI allows switching freely.

### Acceptance criteria

- [ ] Environment dropdown in insights panel header
- [ ] All Elastic queries include `data_stream.namespace` filter
- [ ] Baseline table scoped per environment (separate baseline per env)
- [ ] Insights filtered by selected environment
- [ ] Default environment loaded from connection config
- [ ] Switching environment refreshes the insights view

### User stories addressed

- User story 17 (environment selector)

---

## Issue 9: AI Diagnosis

- **Status:** DONE
- **Type:** AFK
- **Blocked by:** Issue 3
- **Implemented in:** `src/lib/elastic/analyzer.ts` (diagnose function), `src/app/api/elastic/insights/[id]/analyze/route.ts`

### What to build

`src/lib/elastic/analyzer.ts` — diagnose function. For each detected insight during the background poll: Claude receives the error pattern (messageTemplate, count, sample log entries) and returns a structured diagnosis: category (e.g., "data retrieval failure", "timeout", "configuration error"), severity assessment, and root cause hypothesis.

Diagnosis text stored in `logInsights.diagnosis` field and displayed per insight row in the UI.

### Acceptance criteria

- [ ] `analyzer.ts` with `diagnose()` function
- [ ] Claude receives pattern data + 3 sample log entries
- [ ] Returns structured output: category, severity, root cause hypothesis
- [ ] Diagnosis stored in insight record
- [ ] Diagnosis text displayed per row in insights table
- [ ] Uses existing Bedrock/Anthropic API client

### User stories addressed

- User story 12 (AI diagnosis per insight)

---

## Issue 10: Suggest Fix

- **Status:** DONE
- **Type:** AFK
- **Blocked by:** Issue 9, Issue 6
- **Implemented in:** `src/lib/elastic/analyzer.ts` (suggestFix function with KB source lookup), `src/app/api/elastic/insights/[id]/analyze/route.ts`, `src/components/log-insights-panel.tsx` (Suggest Fix button + inline display)

### What to build

"Suggest Fix" button per insight row. On click: fetch 5 sample logs + distinct stack traces for the pattern from Elastic. Load relevant source code from KB using file paths extracted from stack traces. Send all to Claude with instruction to generate: (1) a specific fix description with file/method/change guidance, (2) a mini PRD suitable for the Execute phase.

API: POST `/api/elastic/insights/[id]/analyze`. Response stored in `logInsights.fixSuggestion` and `logInsights.fixPrd`.

UI: fix suggestion displayed inline below the insight when available. Loading state while Claude analyzes.

### Acceptance criteria

- [ ] "Suggest Fix" button per insight row
- [ ] Fetches 5 sample logs + stack traces from Elastic on click
- [ ] Extracts file paths from stack traces, loads source from KB
- [ ] Claude generates fix description + mini PRD
- [ ] Fix suggestion and PRD stored in insight record
- [ ] Fix displayed inline in UI with loading state
- [ ] API route POST `/api/elastic/insights/[id]/analyze`

### User stories addressed

- User story 13 (suggest fix button)
- User story 14 (actionable fix with code guidance)

---

## Issue 11: Accept Fix → Execute Phase

- **Status:** DONE
- **Type:** AFK
- **Blocked by:** Issue 10
- **Implemented in:** `src/lib/elastic/ticket-bridge.ts` (acceptFix: Jira ticket + PRD + wave/task + execute phase), `src/app/api/elastic/insights/[id]/accept/route.ts`, `src/components/log-insights-panel.tsx` (Accept Fix button)

### What to build

"Accept" button on insights that have a fix suggestion. `src/lib/elastic/ticket-bridge.ts` handles the full flow:

1. Create Jira issue via existing Jira client — title derived from error pattern
2. Write compact PRD markdown file containing diagnosis, fix suggestion, and relevant log samples
3. Create single task in task/wave system pointing to affected file(s) from stack trace
4. Set ticket phase to "execute"
5. Update `logInsights` record: status → "accepted", store Jira ticket ID

The new ticket appears on the Kanban board in Execute phase, ready for the existing code generation flow.

### Acceptance criteria

- [ ] "Accept" button visible on insights with fix suggestions
- [ ] Clicking Accept creates Jira ticket with descriptive title
- [ ] PRD markdown file generated and associated with ticket
- [ ] Single task created in wave/task system
- [ ] Ticket phase set to "execute" immediately
- [ ] Insight status updated to "accepted" with Jira ticket link
- [ ] Ticket visible on Kanban board in Execute column
- [ ] Existing Execute flow (Claude code gen → PR) works on the created ticket

### User stories addressed

- User story 15 (accept fix creates ticket)
- User story 16 (ticket in Execute phase with PRD + task)

---

## Issue 12: Mute Patterns + Poller Tests

- **Status:** DONE
- **Type:** AFK
- **Blocked by:** Issue 4, Issue 5
- **Implemented in:** `src/app/api/elastic/insights/[id]/mute/route.ts`, `src/components/log-insights-panel.tsx` (mute/unmute + show muted toggle), `src/lib/elastic/poller.test.ts`

### What to build

Mute/unmute toggle per insight row. Muted patterns: still tracked in baseline and polled, but hidden from default insights view. Toggle in UI to show/hide muted patterns.

API: PATCH `/api/elastic/insights/[id]/mute` to toggle status.

Poller unit tests covering: baseline creation on first poll, spike detection at 2x and 5x thresholds, new error detection for unknown templates, baseline EMA decay over multiple cycles, correct environment scoping, muted patterns tracked but not surfaced as new insights.

### Acceptance criteria

- [ ] Mute/unmute toggle button per insight row
- [ ] Muted insights hidden from default view
- [ ] "Show muted" toggle reveals muted patterns
- [ ] Muted patterns still tracked in baseline
- [ ] API PATCH route for mute toggle
- [ ] Poller test: baseline creation on first poll
- [ ] Poller test: spike detection at 2x → warning
- [ ] Poller test: spike detection at 5x → critical
- [ ] Poller test: new error detection
- [ ] Poller test: baseline EMA decay
- [ ] Poller test: environment scoping
- [ ] Poller test: muted patterns tracked but not surfaced

### User stories addressed

- User story 18 (mute patterns)
- User story 19 (muted still tracked, toggle visibility)
