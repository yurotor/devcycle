# DevCycle PRD — AI-Powered SDLC Orchestrator

## Problem Statement

Development teams working with Azure DevOps repos and Jira tickets lack a unified tool that connects codebase understanding with ticket execution. Today, developers context-switch between Azure DevOps (for code), Jira (for tickets), and their IDE (for implementation) with no intelligent layer tying them together. There is no automated way to scan a codebase and build institutional knowledge, no guided process for ensuring tickets have enough detail before implementation begins, and no structured approach to breaking work into dependency-aware, parallelizable deliverables across multiple repos. The result is underspecified tickets, blind implementations, and wasted review cycles.

## Solution

DevCycle is a web application that connects to Azure DevOps and Jira, builds an AI-powered knowledge base from scanned repositories, and guides developers through a 7-stage workflow — from ticket analysis to PR creation. It features an Obsidian-like file browser for the knowledge base, a Linear-style kanban board for workflow tracking, and AI-driven chat interactions for ticket enrichment and planning.

The prototype runs on localhost with SQLite for structured data and flat files for the knowledge base, designed as a compelling demo to secure management buy-in for further investment.

## User Stories

### Setup
1. As a team lead, I want to connect my Azure DevOps project by providing a PAT, so that the tool can access our repositories.
2. As a team lead, I want to select which repos to scan from my Azure DevOps project, so that I control what enters the knowledge base.
3. As a team lead, I want to override the default branch per repo, so that repos with non-standard branch names (not `main`) are scanned correctly.
4. As a team lead, I want to connect my Jira project by providing a PAT (email + API token) while repo scanning continues in the background, so that setup doesn't block on scanning.
5. As a team lead, I want to optionally map which Jira statuses mean "done" (defaulting to "Done" and "Won't Do"), so that only active tickets are loaded.

### Scanning & Knowledge Base
6. As a developer, I want the AI to clone and deeply analyze selected repos via Claude Code CLI, so that I don't have to manually document the codebase.
7. As a developer, I want the AI to ask me targeted questions after synthesis completes (interview phase), so that the scan is mostly hands-off with human input only for ambiguities.
8. As a developer, I want scanning to run in parallel across repos (max 4 concurrent), so that it completes faster.
9. As a developer, I want to see scan progress via a floating pill in the bottom-right corner, so that I know what's happening without leaving my current view.
10. As a developer, I want the scan to produce per-repo analysis (raw/) and compiled wiki docs (wiki/), so that the team has instant documentation.
11. As a developer, I want the scan to produce a machine-readable schema (JSON) and human-readable schema (Markdown), so that both humans and AI can reference the codebase structure.
12. As a developer, I want the scan to produce prioritized fix suggestions (security, architecture, optimization, bugs — critical and high only), so that I can see the most important issues immediately.
13. As a developer, I want to dismiss or promote each fix suggestion into a Jira ticket that enters the 5-phase workflow, so that discovered issues become trackable work.
14. As a developer, I want the knowledge base to have a lean CLAUDE.md at the root linking to wiki/INDEX.md, raw/INDEX.md, and the schema, so that AI interactions have fast access to the full KB.
15. As a developer, I want raw/ and wiki/ folders each with their own INDEX.md that auto-updates as files are added, so that the KB stays navigable.
16. As a developer, I want scan results cached by HEAD commit hash, so that re-scans skip unchanged repos.

### Kanban Board
17. As a developer, I want all Jira issue types except epics to be loaded, so that I see actionable work items.
18. As a developer, I want to see all loaded tickets on a kanban board with 5 columns (Analysis, Plan, Design, Execute, Done), so that I can track work through the full lifecycle.
19. As a developer, I want to click a ticket on the kanban board to open its detail view, so that I can work on it.
20. As a developer, I want to filter tickets by search text, so that I can find specific tickets quickly.

### Analysis Phase
21. As a developer, I want the Analysis phase to present a chat-like interface where the AI asks business questions about the ticket using the KB as context, so that tickets are fully specified before planning.
22. As a developer, I want the AI to offer multiple-choice answers (derived from the KB and codebase) with a free-text option, so that analysis is fast and guided.
23. As a developer, I want the AI to determine when a ticket has enough detail for implementation planning (no rigid templates), so that the process adapts to each ticket.
24. As a developer, I want tickets to be locked once promoted from Analysis to Plan, so that the basis for planning doesn't shift.

### Plan Phase
25. As a developer, I want the Plan phase to generate a mid-level PRD covering architecture decisions, affected repos/services, API changes, data model changes, and technical risks, so that implementation has a clear blueprint.
26. As a developer, I want the PRD stored as a markdown file in the wiki folder and linked from the ticket, so that it becomes part of the KB.
27. As a developer, I want to approve the PRD before it moves to Design, so that there's a quality gate.

### Design Phase
28. As a developer, I want the Design phase to break the PRD into tasks where each task equals one PR in one repo, so that deliverables are atomic and reviewable.
29. As a developer, I want tasks grouped into waves where tasks within a wave have no dependencies on each other, and dependencies flow from later waves to earlier waves, so that work can be parallelized.
30. As a developer, I want tasks requiring tests in an external repo (e.g., e2e/automation) to include those tests in the same wave, so that testing isn't an afterthought.
31. As a developer, I want to see the wave breakdown as a swimlane grid (repos as rows, waves as columns), so that the structure is visually clear.

### Execute Phase
32. As a developer, I want to kick off implementation for a task, where the AI clones the repo, creates a branch (`JIRA-KEY/task-slug`), and writes code with unit/integration tests, so that implementation is automated.
33. As a developer, I want to see the AI's implementation progress streamed in real-time via SSE with phase labels (reading/editing/verifying), so that I can watch what's happening.
34. As a developer, I want to see a live diff preview while the AI is still working, so that I can assess progress before completion.
35. As a developer, I want to review the AI's code changes as a diff after completion, so that I can assess quality.
36. As a developer, I want to re-run implementation with additional guidance if the result isn't right, so that I can iterate without starting over.
37. As a developer, I want to mark a task as "implementing manually" and push my own branch, so that the tool tracks my work even when I code by hand.

### UI & Navigation
38. As a developer, I want the left sidebar to toggle between KB file browser and kanban board, so that I can switch contexts quickly.
39. As a developer, I want an Obsidian-like markdown viewer when browsing KB files, so that documentation is readable.
40. As a developer, I want every conversation transcript stored in raw/ and compiled to a clean wiki page on phase transition, so that institutional knowledge accumulates.
41. As a developer, I want the UI to have a dark-mode Linear + Obsidian aesthetic, so that it looks polished and professional for demos and daily use.

## Implementation Decisions

### Architecture
- **Next.js webapp** running on localhost for the prototype
- **SQLite** (via Drizzle ORM) for structured data: workspace config, encrypted PATs, tickets, tasks, waves, jobs, scan suggestions, chat messages
- **Flat files** for the knowledge base: raw/, wiki/ directories with INDEX.md files and a root CLAUDE.md
- **No authentication** for the prototype — to be added later (corporate SSO via Microsoft Entra ID)
- **Shared workspace model** — one workspace per team, all members see the same data

### Modules
1. **Azure DevOps Client** — REST API wrapper for project/repo listing, file tree browsing, file content fetching, branch resolution, PR creation (stubbed)
2. **Jira Client** — REST API wrapper for ticket loading (all types except epics), ticket reading
3. **Knowledge Base Manager** — flat file CRUD, INDEX.md maintenance, CLAUDE.md updates, raw-to-wiki compilation on phase transitions
4. **Claude CLI Wrapper** — Claude Code CLI subprocess manager for all AI interactions: streaming chat sessions (analysis, plan), agentic work (scanning, implementation). Supports session resumption via `resumeSessionId`. Background jobs tracked in SQLite, SSE streaming.
5. **Scan Engine** — orchestrates parallel repo scanning: clones repos locally, deep analysis via Claude Code CLI (API fallback), cross-repo synthesis, KB compilation, fix suggestions. Results cached by HEAD commit hash.
6. **Workflow Engine** — 5-phase state machine (Analysis → Plan → Design → Execute → Done) with phase locking and transition validation
7. **Task Planner** — generates wave-based task breakdowns from PRDs via Claude Code CLI with prd-to-issues skill, validates dependencies
8. **SQLite Store** — data access layer for all structured data via Drizzle ORM

### UI Components
9. **App Shell** — left sidebar (KB browser / kanban toggle) + main content area. shadcn/ui + Tailwind, dark mode only, Linear + Obsidian aesthetic
10. **Kanban Board** — 5 columns (Analysis, Plan, Design, Execute, Done), ticket cards with priority/type badges, search filter
11. **KB File Browser** — Obsidian-like tree view with markdown viewer, re-scan button in header
12. **Chat Interface** (ChoiceChat) — streaming chat for Analysis phase, multiple-choice + free-text input, tool event accordion showing Claude's tool usage
13. **Swimlane Editor** — repos as rows, waves as columns, task cards with expand/collapse
14. **Diff Viewer** — code change review with live diff updates during implementation
15. **Scan Pill** — floating bottom-right overlay showing background scan progress (scanning/interview/failed/complete states), expandable to detail dialog, auto-opens on interview ready or repeated failures
16. **Suggestions Panel** — scan findings list with dismiss/promote-to-ticket actions
17. **Setup Flow** — multi-step wizard: workspace name → Azure DevOps connection → repo selection → Jira connection → ticket sync

### Key Technical Decisions
- Repos are cloned locally for both scanning and implementation (not API-only browsing).
- Default branch is scanned (usually `main`) with per-repo override support.
- Claude Code CLI is the primary AI interface for all interactions — chat sessions, scanning, plan generation, code implementation. Direct Claude API is used only as a fallback.
- No Vercel AI SDK or other abstractions — direct CLI subprocess management.
- Background jobs use SSE for real-time progress streaming to the frontend.
- Jira statuses are not synced with internal workflow statuses — internal 5-phase workflow is independent.
- KB compilation (raw → wiki) triggers on phase transitions and scan completion.
- Implementation creates feature branches named `JIRA-KEY/task-slug` with automatic commit.
- Live diff snapshots (`.devcycle-live-diff.json`) written during implementation for real-time diff preview.
- Scan results cached by HEAD commit hash — re-scan skips repos whose HEAD hasn't changed.

### Async Background Scanning UX
Scanning runs asynchronously in the background while the user continues setup and work.

**Flow:**
1. User selects repos → workspace saved → scan starts in background → user proceeds to Jira connection step
2. After setup completes, user lands on the kanban board (no dedicated scanning screen)
3. A floating pill in the bottom-right corner shows scan progress throughout

**Floating Scan Pill:**
- **Position:** Fixed bottom-right corner, always visible during scan
- **States:**
  - Hidden (no scan running, or scan done and faded)
  - Scanning (cyan pulsing dot) — shows "Scanning... X/Y repos" with progress bar
  - Interview ready (violet) — auto-opens dialog when synthesis completes
  - Failed 3x (amber) — auto-opens dialog showing error details + retry button
  - Complete (green checkmark) — shows "KB ready", fades after 5 seconds
- **Interaction:** Click pill to expand into a detail view (dialog-style overlay) showing full scan log, progress, and actions
- **Auto-open triggers:** (a) interview ready, (b) 3 consecutive failures

**Scan Resilience:**
- Max 4 concurrent repo analyses
- Retry with exponential backoff for transient errors
- Individual repo failures don't block other repos (fail gracefully, continue)
- Results cached by HEAD commit hash — re-scan skips unchanged repos

**Interview Flow:**
- Interview is triggered after synthesis completes successfully
- Pill transitions to violet state and auto-opens the interview dialog
- Interview messages persist to DB incrementally (chat_messages pattern) so interview can resume across page refreshes
- On interview completion, KB recompiles incorporating interview data

**Scan State Persistence:**
- Scan state stored in `jobs` table (type='scan', status='running'|'done'|'failed', progress=0-100, meta=JSON with phase/events)
- `GET /api/scan/status` returns current scan state for pill polling
- `POST /api/scan/start` triggers scan (fire-and-forget, returns immediately)
- `GET /api/scan/stream` provides SSE stream of scan events
- On page refresh, pill reads job state from DB and resumes display

**Re-scan:**
- Re-scan button in KB browser sidebar header
- Triggers a new scan job, pill reappears

## Testing Decisions

A good test validates external behavior through the module's public interface. It should not depend on internal implementation details, private methods, or specific data structures that may change. Tests should be deterministic, fast, and test one behavior per case.

### Modules to test:
- **Azure DevOps Client** — mock HTTP layer, verify correct API endpoints are called, request payloads are built correctly, and responses are parsed into expected shapes. Cover: auth header injection, pagination handling, error responses (403/404).
- **Jira Client** — same approach as Azure DevOps Client. Cover: status filtering, issue type exclusion (epics), pagination.
- **Workflow Engine** — test the state machine transitions: valid transitions succeed, invalid transitions fail, phase locking works, edge cases (e.g., transitioning from Analysis to Plan compiles raw → wiki).
- **Task Planner** — test dependency validation: moving a task to an earlier wave than its dependency should fail, wave reordering should cascade dependency checks, split/merge operations maintain validity.

### Modules NOT tested (prototype):
- UI components — tested manually during the demo
- Agent Runner — depends on Claude Code CLI, integration-tested manually
- Scan Engine — depends on external APIs and AI, integration-tested manually

## Out of Scope

- **User authentication** — no login, no SSO, no role-based access for the prototype
- **Multi-workspace support** — single workspace only for the prototype
- **Public deployment** — localhost only, no hosted infrastructure
- **TFVC repos** — Git repos in Azure DevOps only
- **Epic-level tracking** — epics are excluded from ticket loading
- **Bidirectional Jira status sync** — internal workflow statuses are independent of Jira statuses
- **Jira write-back** — analysis findings are not synced back to Jira yet
- **Real PR creation** — PR creation on Azure DevOps is stubbed, not yet functional
- **AI code review** — review phase UI exists but is not wired to the workflow
- **Wiki editing** in the browser — KB files are read-only in the UI
- **Light mode** — dark mode only for the prototype
- **Going back from Plan to Analysis** — phase transitions are forward-only
- **Auto-assigning PR reviewers** — reviewers are not set automatically
- **Feature branch scanning** — only the default (or overridden) branch is scanned
- **Real database** — SQLite only, no PostgreSQL/cloud DB
- **Drag-and-drop on kanban board** — tickets are advanced through phase-specific UI, not by dragging

## Further Notes

### Demo Priority Tiers
The prototype is built to secure management buy-in. Prioritization if time is constrained:

**Must-have (all implemented):**
- Killer UX/UI (dark-mode Linear + Obsidian aesthetic)
- Connect to Azure DevOps + repo scanning with real-time KB generation
- Obsidian-like file browser showing the KB
- Jira integration with kanban board (5 columns: Analysis, Plan, Design, Execute, Done)
- Analysis phase with chat-like Q&A

**Should-have (all implemented):**
- Fix suggestions from scanning (with dismiss/promote-to-ticket)
- Plan phase (PRD generation via Claude Code CLI)
- Design phase (wave/swimlane visualization)

**Nice-to-have (partially implemented):**
- Execute phase (AI writing code with streaming output + live diff) ✓
- Create PR (stubbed — not yet creating real PRs on Azure DevOps)
- AI code review (UI exists, not wired to workflow)

### Future Considerations (post-prototype)
- Corporate SSO via Microsoft Entra ID
- Multi-workspace support for expanding to other teams
- Hosted deployment (likely Vercel)
- Real database migration (SQLite → PostgreSQL)
- Periodic re-scanning of repos
- Bidirectional Jira status sync
- Going back from Plan to Analyze
- Light mode
- Auto-assigning PR reviewers
