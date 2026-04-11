# DevCycle PRD — AI-Powered SDLC Orchestrator

## Problem Statement

Development teams working with Azure DevOps repos and Jira tickets lack a unified tool that connects codebase understanding with ticket execution. Today, developers context-switch between Azure DevOps (for code), Jira (for tickets), and their IDE (for implementation) with no intelligent layer tying them together. There is no automated way to scan a codebase and build institutional knowledge, no guided process for ensuring tickets have enough detail before implementation begins, and no structured approach to breaking work into dependency-aware, parallelizable deliverables across multiple repos. The result is underspecified tickets, blind implementations, and wasted review cycles.

## Solution

DevCycle is a web application that connects to Azure DevOps and Jira, builds an AI-powered knowledge base from scanned repositories, and guides developers through a 7-stage workflow — from ticket analysis to PR creation. It features an Obsidian-like file browser for the knowledge base, a Linear-style kanban board for workflow tracking, and AI-driven chat interactions for ticket enrichment and planning.

The prototype runs on localhost with SQLite for structured data and flat files for the knowledge base, designed as a compelling demo to secure management buy-in for further investment.

## User Stories

1. As a team lead, I want to connect my Azure DevOps project by providing a PAT, so that the tool can access our repositories.
2. As a team lead, I want to select which repos to scan from my Azure DevOps project, so that I control what enters the knowledge base.
3. As a team lead, I want to override the default branch per repo, so that repos with non-standard branch names (not `main`) are scanned correctly.
4. As a developer, I want the AI to autonomously scan selected repos via the Azure DevOps API, so that I don't have to manually document the codebase.
5. As a developer, I want the AI to ask me targeted questions during scanning only when it can't infer something from the code, so that the scan is mostly hands-off.
6. As a developer, I want scanning to run in parallel across repos, so that it completes faster.
7. As a developer, I want to see the knowledge base populate in real-time during scanning via the file browser, so that I can watch progress and feel confident in the output.
8. As a developer, I want the scan to produce a project summary, architecture overview, and compiled wiki docs per repo, so that the team has instant documentation.
9. As a developer, I want the scan to produce a machine-readable schema (JSON) and human-readable schema (Markdown), so that both humans and AI can reference the codebase structure.
10. As a developer, I want the scan to produce prioritized fix suggestions (security, architecture, optimization, bugs — critical and high only), so that I can see the most important issues immediately.
11. As a developer, I want to dismiss or promote each fix suggestion into a Jira ticket that enters the 7-stage workflow, so that discovered issues become trackable work.
12. As a developer, I want the knowledge base to have a lean CLAUDE.md at the root linking to wiki/INDEX.md, raw/INDEX.md, and the schema, so that AI interactions have fast access to the full KB.
13. As a developer, I want raw/ and wiki/ folders each with their own INDEX.md that auto-updates as files are added, so that the KB stays navigable.
14. As a team lead, I want to connect my Jira project by providing a PAT while repo scanning continues in the background, so that setup doesn't block on scanning.
15. As a team lead, I want to optionally map which Jira statuses mean "done" (defaulting to "Done" and "Won't Do"), so that only active tickets are loaded.
16. As a developer, I want all Jira issue types except epics to be loaded, so that I see actionable work items.
17. As a developer, I want to see all loaded tickets on a kanban board with 7 columns representing internal workflow statuses (Analyze, Plan, Design, Implement & Test, Create PR, Review, Done), so that I can track work through the full lifecycle.
18. As a developer, I want to click a ticket on the kanban board to open its detail view, so that I can work on it.
19. As a developer, I want the Analyze phase to present a chat-like interface where the AI asks business questions about the ticket using the KB as context, so that tickets are fully specified before planning.
20. As a developer, I want the AI to offer multiple-choice answers (derived from the KB and codebase) with a free-text option, so that analysis is fast and guided.
21. As a developer, I want the AI to determine when a ticket has enough detail for implementation planning (no rigid templates), so that the process adapts to each ticket.
22. As a developer, I want any team member to be able to contribute to a ticket during the Analyze phase, so that analysis is collaborative.
23. As a developer, I want tickets to be locked once promoted from Analyze to Plan, so that the basis for planning doesn't shift.
24. As a developer, I want the option to sync analysis findings back to the Jira ticket (as description updates or comments — TBD), so that Jira stays up to date.
25. As a developer, I want the Plan phase to generate a mid-level PRD covering architecture decisions, affected repos/services, API changes, data model changes, and technical risks, so that implementation has a clear blueprint.
26. As a developer, I want the AI to lead me through technical questions during the Plan phase using the KB, so that the PRD is grounded in codebase reality.
27. As a developer, I want the PRD stored as a markdown file in the wiki folder and linked from the ticket, so that it becomes part of the KB.
28. As a developer, I want any team member to approve the PRD before it moves to Design, so that there's a quality gate.
29. As a developer, I want the Design phase to break the PRD into tasks where each task equals one PR in one repo, so that deliverables are atomic and reviewable.
30. As a developer, I want tasks grouped into waves where tasks within a wave have no dependencies on each other, and dependencies flow from later waves to earlier waves, so that work can be parallelized.
31. As a developer, I want tasks requiring tests in an external repo (e.g., e2e/automation) to include those tests in the same wave, so that testing isn't an afterthought.
32. As a developer, I want to see the wave breakdown as a swimlane grid (repos as rows, waves as columns) with dependency arrows, so that the structure is visually clear.
33. As a developer, I want to drag tasks between waves, reorder waves, split and merge tasks in the swimlane editor, so that I can adjust the AI's proposed breakdown.
34. As a developer, I want the AI to warn me if an edit creates a dependency violation, so that I don't break the execution order.
35. As a developer, I want to kick off implementation for a task or wave, where the AI clones the repo, creates a branch, and writes code with unit/integration tests, so that implementation is automated.
36. As a developer, I want to see the AI's implementation progress streamed in real-time via SSE, so that I can watch what's happening.
37. As a developer, I want multiple tasks to run in parallel (up to 2-3 concurrent jobs), so that waves can be implemented efficiently.
38. As a developer, I want to review the AI's code changes as a diff, so that I can assess quality before creating a PR.
39. As a developer, I want to re-run implementation with additional guidance if the result isn't right, so that I can iterate without starting over.
40. As a developer, I want to mark a task as "implementing manually" and push my own branch, so that the tool tracks my work even when I code by hand.
41. As a developer, I want to click "Create PR" on a task to create a PR on Azure DevOps with an auto-generated description (from task + PRD context, linked to the Jira ticket), so that PRs are self-documenting.
42. As a developer, I want a "Create all PRs in wave" batch button, so that I can promote a whole wave at once.
43. As a developer, I want to run AI-powered code review on a PR, which proposes comments by priority, so that review is thorough and consistent.
44. As a developer, I want to choose how to submit review comments: send all at once, send one-by-one, or skip and review manually, so that I control what feedback is posted.
45. As a developer, I want a ticket to move to Done when its PR is approved, so that the board reflects reality.
46. As a developer, I want the left sidebar to toggle between KB file browser and kanban board, so that I can switch contexts quickly.
47. As a developer, I want an Obsidian-like markdown viewer when browsing KB files, so that documentation is readable.
48. As a developer, I want every conversation transcript stored in raw/ and compiled to a clean wiki page on phase transition, so that institutional knowledge accumulates.
49. As a developer, I want the UI to have a dark-mode Linear + Obsidian aesthetic, so that it looks polished and professional for demos and daily use.

## Implementation Decisions

### Architecture
- **Next.js webapp** running on localhost for the prototype
- **SQLite** (via an ORM) for structured data: workspace config, encrypted PATs, tickets, tasks, waves, jobs, scan suggestions, chat messages
- **Flat files** for the knowledge base: raw/, wiki/, schema/ directories with INDEX.md files and a root CLAUDE.md
- **No authentication** for the prototype — to be added later (corporate SSO via Microsoft Entra ID)
- **Shared workspace model** — one workspace per team, all members see the same data

### Modules
1. **Azure DevOps Client** — REST API wrapper for project/repo listing, file tree browsing, file content fetching, branch resolution, PR creation, PR commenting
2. **Jira Client** — REST API wrapper for ticket loading (all types except epics), ticket reading, description updating, comment adding
3. **Knowledge Base Manager** — flat file CRUD, INDEX.md maintenance, CLAUDE.md updates, raw-to-wiki compilation on phase transitions
4. **AI Chat Service** — direct Claude API calls for streaming chat interactions during Analyze and Plan phases, with KB as context
5. **Agent Runner** — Claude Code CLI subprocess manager for agentic work (scanning, implementation). Background jobs tracked in SQLite, SSE streaming, capped at 2-3 concurrent processes
6. **Scan Engine** — orchestrates parallel repo scanning via Azure DevOps API (no clone), produces KB artifacts and fix suggestions
7. **Workflow Engine** — 7-stage state machine (Analyze → Plan → Design → Implement & Test → Create PR → Review → Done) with phase locking and transition validation
8. **Task Planner** — generates wave-based task breakdowns from PRDs, validates dependencies, supports drag-and-drop restructuring
9. **PR Manager** — creates PRs on Azure DevOps, generates descriptions from task + PRD context with Jira links, runs AI code review, manages comment submission modes
10. **SQLite Store** — data access layer for all structured data

### UI Components
11. **UI Shell** — left sidebar (KB browser / kanban toggle) + main content area. shadcn/ui + Tailwind, dark mode only, Linear + Obsidian aesthetic
12. **Kanban Board** — 7 columns for internal statuses, ticket cards, drag-and-drop via @dnd-kit
13. **KB File Browser** — Obsidian-like tree view with markdown viewer, bidirectional wiki links, re-scan button in header
14. **Chat Interface** — streaming chat for Analyze/Plan phases, multiple-choice + free-text input
15. **Swimlane Editor** — repos as rows, waves as columns, dependency arrows, drag-and-drop task movement
16. **Diff Viewer** — code change review before PR creation
17. **Scan Pill** — floating bottom-right overlay showing background scan progress, expandable to detail dialog. Auto-opens on interview ready or repeated failures

### Key Technical Decisions
- Azure DevOps repos are browsed via API (no cloning) during scanning. Repos are cloned locally only during the Implement phase.
- Default branch is scanned (usually `main`) with per-repo override support.
- AI interactions use direct Claude API calls (no Vercel AI SDK or other abstractions).
- Claude Code CLI is used for agentic work (scanning, code implementation) via child processes.
- Background jobs use SSE for real-time progress streaming to the frontend.
- Jira sync is one-directional: analysis info is pushed to Jira (description update or comments), but Jira statuses are not synced with internal workflow statuses.
- KB compilation (raw → wiki) triggers on phase transitions, not in real-time.

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
- Max 2 concurrent repo analyses (reduced from 4 to avoid gateway rate limits)
- Retry with exponential backoff: 3 retries at 2s, 4s, 8s delays for 429/504 errors
- 300-second curl timeout for large synthesis calls
- Sequential per-feature Claude calls with 1s delay during KB compilation
- Individual repo failures don't block other repos (fail gracefully, continue)

**Interview Flow:**
- Interview is triggered after synthesis completes successfully
- Pill transitions to violet state and auto-opens the interview dialog
- Interview messages persist to DB incrementally (chat_messages pattern) so interview can resume across page refreshes
- On interview completion, KB recompiles incorporating interview data

**Scan State Persistence:**
- Scan state stored in `jobs` table (type='scan', status='running'|'done'|'failed', progress=0-100, meta=JSON with phase/events)
- `GET /api/scan/status` returns current scan state for pill polling
- `POST /api/scan/start` triggers scan (fire-and-forget, returns immediately)
- On page refresh, pill reads job state from DB and resumes display

**Re-scan:**
- Re-scan button in KB browser sidebar header
- Triggers a new scan job, pill reappears

## Testing Decisions

A good test validates external behavior through the module's public interface. It should not depend on internal implementation details, private methods, or specific data structures that may change. Tests should be deterministic, fast, and test one behavior per case.

### Modules to test:
- **Azure DevOps Client** — mock HTTP layer, verify correct API endpoints are called, request payloads are built correctly, and responses are parsed into expected shapes. Cover: auth header injection, pagination handling, error responses (403/404).
- **Jira Client** — same approach as Azure DevOps Client. Cover: status filtering, issue type exclusion (epics), pagination.
- **Workflow Engine** — test the state machine transitions: valid transitions succeed, invalid transitions fail, phase locking works, edge cases (e.g., transitioning from Analyze to Plan compiles raw → wiki).
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
- **Periodic/re-scanning** of repos — one-time scan only
- **Wiki editing** in the browser — KB files are read-only in the UI
- **Light mode** — dark mode only for the prototype
- **Going back from Plan to Analyze** — phase transitions are forward-only
- **Auto-assigning PR reviewers** — reviewers are not set automatically
- **Feature branch scanning** — only the default (or overridden) branch is scanned
- **Real database** — SQLite only, no PostgreSQL/cloud DB

## Further Notes

### Demo Priority Tiers
The prototype is built to secure management buy-in. Prioritization if time is constrained:

**Must-have:**
- Killer UX/UI (this is the top priority — the UI sells it)
- Connect to Azure DevOps + repo scanning with real-time KB generation
- Obsidian-like file browser showing the KB
- Jira integration with kanban board (7 internal statuses)
- Analyze phase with chat-like Q&A

**Should-have:**
- Fix suggestions from scanning (with promote-to-ticket)
- Plan phase (PRD generation)
- Design phase (wave/swimlane visualization)

**Nice-to-have:**
- Implement & test (AI writing code with streaming output)
- Create PR + review phases
- Promoting scan suggestions to tickets

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
