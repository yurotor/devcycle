# DevCycle — Implementation Progress

> Status key: `[ ]` Not started · `[~]` In progress · `[x]` Complete · `[-]` Blocked

---

## Slices

### [x] 1 · Backend foundation + workspace persistence
**Type:** AFK · **Blocked by:** —

Wire the existing setup flow to a real backend. Create the SQLite database schema and Next.js API routes needed by all downstream slices.

**Scope:**
- SQLite schema: `workspace`, `repos`, `pats` (encrypted at rest), `tickets`, `tasks`, `waves`, `jobs`, `scan_suggestions`, `chat_messages`
- Next.js API routes scaffold under `app/api/`
- `POST /api/workspace` — save workspace name + Azure DevOps PAT (encrypted)
- `GET /api/workspace` — load workspace config on app boot
- ORM setup (Drizzle or Prisma with SQLite adapter)

**Acceptance criteria:**
- [ ] Workspace name + PAT survive a page refresh (persisted in SQLite)
- [ ] PAT is stored encrypted, not plaintext
- [ ] All SQLite tables exist and are migrated on first run
- [ ] API routes return correct shapes for success + error cases

**User stories:** 1

---

### [x] 2 · Azure DevOps client + repo listing
**Type:** AFK · **Blocked by:** 1

Build the Azure DevOps REST API wrapper and wire the repo selection step of the setup flow to real API calls.

**Scope:**
- `AzureDevOpsClient` module: auth header injection, pagination, error handling (401/403/404)
- Methods: `listProjects`, `listRepos`, `getDefaultBranch`, `getFileTree`, `getFileContent`, `createPR`, `addPRComment`
- Wire setup flow: PAT validation ping, repo listing, per-repo branch override saved to DB
- Unit tests: mock HTTP layer, verify endpoint construction, request payloads, response parsing, auth headers, pagination, error shapes

**Acceptance criteria:**
- [ ] Setup flow shows real repos from Azure DevOps after PAT entry
- [ ] Invalid PAT shows a clear error in the UI
- [ ] Per-repo branch override persists to DB
- [ ] Unit tests pass for all public client methods

**User stories:** 1, 2, 3

---

### [x] 3 · Jira client + live kanban board
**Type:** AFK · **Blocked by:** 1

Build the Jira REST API wrapper and replace mock kanban data with real tickets.

**Scope:**
- `JiraClient` module: auth, pagination, error handling
- Methods: `listIssues` (all types except epics), `getIssue`, `updateDescription`, `addComment`
- `POST /api/jira/connect` — save Jira URL + PAT, trigger initial ticket load
- `GET /api/tickets` — return tickets for kanban board
- Status mapping: configurable "done" statuses (default: "Done", "Won't Do")
- Wire kanban board to `/api/tickets` instead of `fake-data.ts`
- Unit tests: mock HTTP, status filtering, epic exclusion, pagination

**Acceptance criteria:**
- [ ] Kanban board shows real Jira tickets after Jira connection step
- [ ] Epics are excluded from the board
- [ ] Configurable "done" statuses filter correctly
- [ ] Ticket detail panel opens with real data
- [ ] Unit tests pass

**User stories:** 14, 15, 16, 17, 18

---

### [ ] 4 · Repo scanning → raw file generation
**Type:** AFK · **Blocked by:** 2

Build the Scan Engine that walks repos via the Azure DevOps API and produces raw KB files. Wire the existing scanning UI to real SSE progress events.

**Scope:**
- `ScanEngine`: parallel repo scanning (Azure DevOps API, no clone), capped at 2–3 concurrent
- Per-repo output in `kb/raw/<repo>/`: project summary, architecture overview, compiled wiki doc, prioritized fix suggestions (security/arch/optimization/bugs — critical + high only)
- `kb/raw/<repo>/INDEX.md` auto-generated and updated as files are added
- SSE endpoint `GET /api/scan/stream` — streams progress events to existing scanning UI
- Scan job tracked in SQLite (`jobs` table) with status + progress
- AI questions surfaced in UI only when inference is insufficient (mostly hands-off)
- Fix suggestions saved to `scan_suggestions` table

**Acceptance criteria:**
- [ ] Triggering a scan produces real files under `kb/raw/`
- [ ] Scanning UI shows real-time progress via SSE (file-by-file or repo-by-repo)
- [ ] Multiple repos scan in parallel
- [ ] `kb/raw/<repo>/INDEX.md` lists all generated files
- [ ] Fix suggestions appear in `scan_suggestions` table after scan completes

**User stories:** 4, 5, 6, 7, 8, 10

---

### [ ] 5 · Wiki + schema + CLAUDE.md compilation
**Type:** AFK · **Blocked by:** 4

Post-process raw scan output into human-readable wiki docs, machine-readable schema, and the root CLAUDE.md that ties everything together.

**Scope:**
- `KnowledgeBaseManager` module: raw→wiki compilation, INDEX.md maintenance, CLAUDE.md generation
- Per-repo output in `kb/wiki/<repo>/`: compiled markdown wiki pages
- `kb/wiki/<repo>/INDEX.md` auto-maintained
- `kb/schema/<repo>.json` (machine-readable) + `kb/schema/<repo>.md` (human-readable)
- Root `kb/CLAUDE.md`: lean file linking to `wiki/INDEX.md`, `raw/INDEX.md`, and schemas
- Compilation runs once after scanning completes (not in real-time)

**Acceptance criteria:**
- [ ] `kb/wiki/` populated with readable docs after scan
- [ ] `kb/schema/<repo>.json` and `.md` exist and are valid after scan
- [ ] Root `kb/CLAUDE.md` links correctly to all KB sections
- [ ] All INDEX.md files list current contents accurately

**User stories:** 8, 9, 12, 13

---

### [ ] 6 · KB file browser wired to disk
**Type:** AFK · **Blocked by:** 4

Replace mock data in the KB browser with real files read from `kb/` on disk.

**Scope:**
- `GET /api/kb/tree` — return directory tree of `kb/` as JSON
- `GET /api/kb/file?path=...` — return file content for markdown viewer
- Wire existing `kb-browser.tsx` and `markdown-viewer.tsx` to real API calls
- Tree updates as new files appear (polling or re-fetch on focus)

**Acceptance criteria:**
- [ ] KB browser shows real `raw/` and `wiki/` directory trees
- [ ] Clicking a file renders its markdown content
- [ ] Browser reflects new files added by scanning without full page reload

**User stories:** 46, 47

---

### [ ] 7 · Fix suggestions + promote to ticket
**Type:** AFK · **Blocked by:** 3, 4

Surface scan findings in the existing suggestions panel and wire dismiss + promote-to-Jira-ticket actions.

**Scope:**
- `GET /api/suggestions` — return suggestions from `scan_suggestions` table
- `POST /api/suggestions/:id/dismiss` — mark dismissed in DB
- `POST /api/suggestions/:id/promote` — create Jira ticket via `JiraClient`, set initial workflow status to "Analyze", update suggestions table
- Wire existing `suggestions-panel.tsx` to real API

**Acceptance criteria:**
- [ ] Suggestions panel shows real findings from the scan
- [ ] Dismiss removes the suggestion from the panel (persists across refresh)
- [ ] Promote creates a real Jira ticket and the new ticket appears on the kanban board in Analyze status

**User stories:** 10, 11

---

### [ ] 8 · Async background scanning UX
**Type:** AFK · **Blocked by:** 4, 5, 6

Rework scanning from a blocking full-screen view to an async background process with a floating status pill.

**Scope:**
- **Retry logic:** exponential backoff (3 retries, 2s/4s/8s) for 429/504 in `anthropic.ts`; reduce scan concurrency from 4 to 2; sequential per-feature Claude calls with 1s delay; 300s curl timeout
- **Scan API:** `POST /api/scan/start` (fire-and-forget), `GET /api/scan/status` (poll). Scan state in `jobs` table with phase/events in `meta` JSON
- **Floating scan pill (`ScanPill`):** fixed bottom-right, shows progress during scan. States: hidden → scanning (cyan) → interview ready (violet, auto-opens) → failed 3x (amber, auto-opens) → done (green, fades 5s). Click expands to detail dialog with full scan log
- **Setup flow change:** after repo selection, trigger `POST /api/scan/start` then proceed to Jira step. After setup completes, land on kanban board (remove `ScanningView` full-screen)
- **Interview integration:** pill transitions to violet on synthesis complete, auto-opens interview dialog. Messages persist to DB incrementally for resume across refreshes
- **Re-scan:** button in KB browser sidebar header triggers new scan job
- **Page refresh resilience:** pill reads job state from DB on mount

**Acceptance criteria:**
- [ ] After repo selection, scan starts in background and user proceeds to Jira setup
- [ ] Floating pill visible during scan with correct color states
- [ ] Clicking pill opens detail dialog with scan log and progress
- [ ] Pill auto-opens when interview is ready (violet state)
- [ ] Pill auto-opens after 3 consecutive failures (amber state)
- [ ] Pill shows "KB ready" and fades after scan + interview complete
- [ ] Re-scan from KB browser header works
- [ ] Scan progress survives page refresh (reads from jobs table)
- [ ] 429/504 errors are retried with exponential backoff
- [ ] No more than 2 concurrent repo analyses

**User stories:** 4, 5, 6, 7, 14

---

### [ ] 9 · Analyze phase with Claude API
**Type:** AFK · **Blocked by:** 3, 5

Replace mock chat in the Analyze phase with real streaming Claude API calls. Store conversation transcripts in `kb/raw/`. Enforce phase-transition lock.

**Scope:**
- `AIChatService`: direct Claude API calls (no Vercel AI SDK), streaming via SSE
- System prompt includes KB context (`kb/CLAUDE.md` + relevant wiki pages)
- AI generates business questions + multiple-choice answers derived from KB; free-text fallback
- AI determines readiness to advance (no rigid template)
- `POST /api/tickets/:id/analyze/message` — stream AI response
- Phase lock: once promoted to Plan, Analyze chat becomes read-only
- Transcript saved to `kb/raw/transcripts/<ticket-id>/analyze.md` after each message
- Optional Jira sync: `POST /api/tickets/:id/analyze/sync-to-jira`
- Wire existing `analyze-chat.tsx` to real API

**Acceptance criteria:**
- [ ] Chat streams real Claude responses into the existing UI
- [ ] Multiple-choice options are derived from KB content, not hardcoded
- [ ] Advancing to Plan is only enabled when AI signals sufficient detail
- [ ] Transcript file written to `kb/raw/transcripts/` after session
- [ ] Jira sync button posts analysis summary to Jira ticket as comment

**User stories:** 19, 20, 21, 22, 23, 24, 48 (partial)

---

### [ ] 10 · Plan phase — PRD generation
**Type:** AFK · **Blocked by:** 9

Wire the Plan phase to real Claude API calls that produce a PRD. Compile Analyze transcript to wiki on phase entry. Store PRD in `kb/wiki/`. Require approval before advancing.

**Scope:**
- Plan chat uses Claude with KB + Analyze transcript as context
- AI leads technical Q&A (architecture decisions, affected repos/services, API changes, data model changes, risks)
- PRD stored as `kb/wiki/tickets/<ticket-id>/prd.md`, linked from ticket record in DB
- `POST /api/tickets/:id/plan/approve` — marks PRD approved, enables Design phase
- Analyze transcript compiled to clean wiki page (`kb/wiki/transcripts/<ticket-id>/analyze.md`) on Plan entry
- Wire existing `plan-phase.tsx` to real API

**Acceptance criteria:**
- [ ] Plan chat streams real Claude responses
- [ ] Generated PRD saved to `kb/wiki/` and linked from the ticket
- [ ] Approve button is required before Design phase unlocks
- [ ] Analyze transcript wiki page created on transition from Analyze → Plan

**User stories:** 25, 26, 27, 28, 48 (partial)

---

### [ ] 11 · Design phase — wave/swimlane editor
**Type:** AFK · **Blocked by:** 10

Wire the Design phase to real AI-generated task breakdowns and connect the swimlane editor to a real task store with dependency validation.

**Scope:**
- `TaskPlanner`: generate wave-based task breakdown from PRD + KB; validate dependencies
- Tasks saved to `tasks` + `waves` tables in SQLite
- `GET /api/tickets/:id/tasks` — return tasks with wave/dependency data
- `PUT /api/tickets/:id/tasks/:taskId` — update task (wave reassignment, splits, merges)
- Dependency violation check on every edit (returns error if violated)
- Wire existing swimlane drag-and-drop to real task store
- Unit tests: dependency validation (move to earlier wave than dependency → fail), wave reorder cascades, split/merge validity

**Acceptance criteria:**
- [ ] AI generates a real wave breakdown from the PRD
- [ ] Swimlane shows real tasks from DB with dependency arrows
- [ ] Drag-and-drop persists to DB
- [ ] Moving a task before its dependency shows an error and reverts the move
- [ ] Unit tests pass for `TaskPlanner` dependency logic

**User stories:** 29, 30, 31, 32, 33, 34

---

### [ ] 12 · Implement phase — Agent Runner *(HITL)*
**Type:** HITL · **Blocked by:** 11

Wire the Implement phase to a real Agent Runner that invokes Claude Code CLI as a subprocess, streams progress via SSE, and surfaces a diff for human review before continuing.

**Scope:**
- `AgentRunner`: spawns `claude` CLI subprocess per task, tracks job in `jobs` table, caps at 2–3 concurrent
- Repos cloned locally to a working directory on task start
- SSE endpoint `GET /api/jobs/:id/stream` — streams stdout to existing implement UI
- `GET /api/tasks/:id/diff` — return git diff of working branch
- `POST /api/tasks/:id/implement/retry` — re-run with additional guidance
- `POST /api/tasks/:id/implement/manual` — mark task as "implementing manually", accept branch name
- Wire existing `implement-phase.tsx` + diff viewer to real API

**Human review required:** Developer must inspect the diff and approve/reject before the task advances to Create PR.

**Acceptance criteria:**
- [ ] Kicking off implementation spawns a real `claude` CLI process
- [ ] Progress streams into existing implement UI in real time
- [ ] Diff viewer shows real code changes from the working branch
- [ ] Re-run with guidance produces a new attempt
- [ ] "Implementing manually" path tracks the human branch in DB
- [ ] No more than 3 jobs run concurrently

**User stories:** 35, 36, 37, 38, 39, 40

---

### [ ] 13 · Create PR + AI code review
**Type:** AFK · **Blocked by:** 12

Wire the Create PR and Review phases to real Azure DevOps PR creation and AI-powered code review.

**Scope:**
- `PRManager`: create PR on Azure DevOps with auto-generated description (task + PRD context + Jira link)
- `POST /api/tasks/:id/pr` — create PR, store PR URL in DB
- `POST /api/tickets/:id/wave/:waveId/pr` — batch "create all PRs in wave"
- AI code review: propose comments by priority via Claude API
- `POST /api/tasks/:id/review` — run AI review, return proposed comments
- Comment submission modes: all at once / one-by-one / skip (manual)
- `GET /api/tasks/:id/pr/status` — poll PR approval status; auto-advance ticket to Done when approved
- Wire existing `create-pr-phase.tsx` and `review-phase.tsx` to real API

**Acceptance criteria:**
- [ ] Create PR produces a real PR on Azure DevOps with correct description and Jira link
- [ ] Batch "create all PRs in wave" creates all PRs in one click
- [ ] AI review returns prioritized comments
- [ ] All three submission modes work correctly
- [ ] Ticket moves to Done automatically when PR is approved on Azure DevOps

**User stories:** 41, 42, 43, 44, 45

---

## Dependency graph

```
1 (backend)
├── 2 (ADO client)      → 4 (scan raw)
│                            ├── 5 (wiki/schema)
│                            ├── 6 (KB browser)
│                            ├── 7 (suggestions) ← also needs 3
│                            └── 8 (async scan UX) ← also needs 5, 6
└── 3 (Jira client)     → 7 (suggestions)
                         → 9 (Analyze) ← also needs 5
                              → 10 (Plan)
                                   → 11 (Design)
                                        → 12 (Implement) HITL
                                              → 13 (PR + review)
```

---

## Notes

- The frontend prototype (`frontend/`) is complete with mock data. All slices wire existing UI to real backends — avoid rewriting UI unless strictly necessary.
- AI interactions use direct Claude API calls. No Vercel AI SDK or other abstractions.
- Claude Code CLI (`claude`) is used only in Slice 11 (Agent Runner). All other AI work uses the API directly.
- KB base directory: `kb/` at the repo root (created by Slice 4).
- SQLite database file: `devcycle.db` at the repo root (created by Slice 1).
