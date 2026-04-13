# DevCycle — Product Plan & 2-Week Build Roadmap

> AI-powered dev cycle orchestration for Azure DevOps teams — from ticket to production, with a brain that knows your system.

---

## The Problem

Dev teams working on complex multi-repo systems lose hours daily to coordination friction: analyzing tickets, cross-referencing repos, waiting on reviews, chasing blockers, monitoring deployments, handling UAT feedback loops. Even when AI handles plan/build/test, humans remain the bottleneck — and the source of most errors.

## The Vision

A persistent AI orchestration layer that sits on top of ADO + Jira, deeply understands your multi-repo architecture, and manages the entire dev cycle — intake, planning, building, review, deployment, monitoring — with humans intervening only when needed.

## Why This Wins

| Advantage | Detail |
|---|---|
| **ADO-first** | Most competitors lead with GitHub/GitLab. ADO teams (enterprise, mid-market) are underserved and willing to pay. |
| **Persistent knowledge base** | Continuously-learning system map — not per-session context. The AI *knows* your architecture, team, and patterns. |
| **Full orchestration loop** | Existing tools are either metrics/dashboards (Jellyfish, Sleuth, LinearB) OR code generation (Copilot, Cursor). Nobody owns the connective tissue between "ticket arrives" and "change verified in production." |
| **Messy multi-repo/legacy** | Most tools work for clean modern setups. Legacy + modern + 10 repos + mixed CI/CD is where teams suffer most and tools break down. |

## Competitive Landscape

| Competitor | What They Do | What They Don't Do |
|---|---|---|
| **LinearB** | PR workflow automation, DORA metrics, bottleneck detection. $39/dev/month. $50M raised. | No codebase understanding. No ticket-to-plan. Metrics, not orchestration. |
| **Jellyfish** | Resource allocation, R&D cost reporting, portfolio visibility. Enterprise-focused. | No AI planning. No architectural awareness. Finance/leadership tool, not dev tool. |
| **Sleuth** | Deployment tracking, DORA metrics, release health. Built by ex-Atlassians. $35-45/user/month. | Narrow focus on post-deploy. No intake/planning. No knowledge base. |
| **GitHub Copilot Workspace** | Ticket → spec → plan → code within GitHub. | GitHub-only. No ADO. Per-session context, no persistent knowledge. No orchestration of review/deploy/UAT. Single-repo focused. |
| **Waydev** | SEI platform, 200+ integrations, AI-native analytics. | Analytics/intelligence, not orchestration. Doesn't generate plans or manage flow. |

**The gap:** Nobody builds a deep, persistent knowledge base of your system AND uses it to orchestrate the full dev cycle AND targets ADO-first.

---

## V1 Scope (2-Week Build)

Three features only. Each proves a core piece of the vision.

### 1. Knowledge Base Initialization — "The Brain"

**What it does:** Connects to ADO repos + Jira, clones and deep-scans repos, then asks clarifying questions to build a deep understanding of the system.

**Phase 1 — Auto-Scan (zero human effort):**
- Repos are cloned locally and analyzed via Claude Code CLI (with API fallback)
- Per-repo analysis: purpose, business features, APIs, dependencies, data entities, messaging patterns, integrations, architecture patterns, tech stack, key files
- Cross-repo synthesis: service map, business features, data flows, integrations, data model, architecture patterns
- Fix suggestions: security, architecture, optimization, bugs (critical + high only) — saved to DB, dismissable or promotable to Jira tickets
- Results cached by HEAD commit hash — re-scan skips unchanged repos

**Phase 2 — Clarifying Questions (AI-guided, human confirms):**
- AI presents system summary
- Generates targeted questions to fill gaps (ambiguities detected during analysis)
- Interview dialog triggered when synthesis completes (scan pill auto-opens)
- Answers fold back into the knowledge base and trigger recompilation

**KB Output:**
- `raw/` — per-repo analysis files (JSON + Markdown)
- `wiki/` — compiled topic-organized documentation
- Root `CLAUDE.md` linking to both, plus schema files
- INDEX.md files auto-maintained in each directory

### 2. 5-Phase Ticket Workflow — "The Value"

**What it does:** Jira tickets are loaded and guided through a 5-phase workflow: **Analysis → Plan → Design → Execute → Done**.

**Phase 1 — Analysis:** Chat-like interface where AI asks business questions about the ticket using the KB as context. Multiple-choice answers derived from KB with free-text fallback. AI determines when ticket has enough detail. Phase locks on promotion to Plan.

**Phase 2 — Plan:** AI generates a mid-level PRD covering architecture decisions, affected repos/services, API changes, data model changes, and technical risks. PRD stored as markdown in the wiki folder. Requires approval before advancing to Design.

**Phase 3 — Design:** AI breaks the PRD into tasks grouped into dependency-aware waves. Each task = one PR in one repo. Tasks within a wave have no dependencies on each other. Dependencies flow from later waves to earlier waves. Displayed as a swimlane grid (repos as rows, waves as columns).

**Phase 4 — Execute:** Claude Code CLI implements each task — clones repo, creates feature branch (`JIRA-KEY/task-slug`), writes code with tests, commits changes. Real-time progress streaming via SSE. Live diff preview during implementation. Tasks can also be marked "implementing manually" for hand-coded work.

**Phase 5 — Done:** Ticket complete.

### 3. Cycle Dashboard — "The Visibility"

**What it does:** Kanban-style board of all in-flight tickets, with 5 columns matching the workflow phases.

**Pipeline stages:** Analysis → Plan → Design → Execute → Done

**Each ticket card shows:**
- Jira key, title, type (story/bug/task), priority badge
- Current phase with color-coded dot

**Interactions:**
- Click ticket → full detail panel with phase-specific content
- Filter tickets by search text
- Ticket detail shows phase progress stepper and phase-appropriate UI

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| **Framework** | Next.js (App Router) | Fast to ship, great for dashboards, SSR for initial loads |
| **Hosting** | localhost (prototype) | No deployment — runs locally for demo |
| **Auth** | None (prototype) | Single workspace, no login — SSO planned for post-prototype |
| **Database** | SQLite via Drizzle ORM | Zero-config, embedded, good enough for prototype |
| **LLM** | Claude Code CLI (primary) + Claude API (fallback) | CLI for agentic work and streaming chat sessions; API fallback for environments without CLI |
| **ADO Integration** | Azure DevOps REST API | PAT-based auth, repo access, file browsing, PR creation |
| **Jira Integration** | Jira Cloud REST API | PAT-based auth (email + API token), ticket loading |

---

## Build Plan (Completed)

### What was built:
- [x] Next.js app with SQLite (Drizzle ORM), running on localhost
- [x] Setup flow: workspace name → Azure DevOps connection (PAT) → repo selection → Jira connection (PAT) → ticket sync
- [x] Scan engine: parallel repo cloning + Claude Code CLI analysis, cross-repo synthesis, KB compilation, fix suggestions
- [x] Scan pill: floating bottom-right overlay with progress states (scanning/interview/failed/complete)
- [x] KB file browser: Obsidian-like tree view with markdown viewer
- [x] Kanban board: 5-column board (Analysis, Plan, Design, Execute, Done) with ticket cards
- [x] Analysis phase: chat-like Q&A with multiple-choice + free-text via Claude Code CLI sessions
- [x] Plan phase: PRD generation via Claude Code CLI with prd-to-issues skill
- [x] Design phase: wave/task swimlane breakdown with dependency-aware grouping
- [x] Execute phase: Claude Code CLI implementation with real-time progress, live diff preview, branch/commit management
- [x] Suggestions panel: scan findings with dismiss/promote-to-ticket actions

---

## V2+ Roadmap (Post-Launch)

Once V1 proves the core value, expand along these axes:

| Feature | Description | Priority |
|---|---|---|
| **Real PR creation** | Create actual PRs on Azure DevOps from implemented tasks (currently stubbed) | High |
| **AI code review** | Run AI-powered review on PRs, submit comments by priority (critical/suggestion/nit) | High |
| **PR Shepherd** | Monitor PRs: nudge slow reviewers, explain CI failures, detect approved-but-unmerged PRs | High |
| **Continuous knowledge updates** | Real-time watching of commits, PRs, tickets to keep the brain current | High |
| **Jira sync** | Push analysis findings back to Jira tickets (description updates or comments) | Medium |
| **Requester Q&A bot** | AI asks the ticket requester clarifying questions automatically before plan generation | Medium |
| **UAT feedback loop** | Track UAT status, auto-route feedback back to the dev who built it | Medium |
| **Team analytics** | Cycle time by stage, bottleneck trends, reviewer load balancing | Medium |
| **Multi-tenant / external launch** | Auth, billing, onboarding for external teams | Later |
| **GitHub / GitLab support** | Expand beyond ADO | Later |

---

## Monetization Model

**Subscription, per-developer/month.** Targeting $25-45/dev/month based on competitive pricing.

| Tier | Includes | Price Range |
|---|---|---|
| **Starter** | Up to 5 repos, basic knowledge base, ticket-to-plan, dashboard | ~$25/dev/month |
| **Pro** | Unlimited repos, continuous sync, PR shepherd, auto-coding triggers, analytics | ~$40/dev/month |
| **Enterprise** | On-prem option, SSO, audit logs, custom integrations, SLA | Custom |

---

## Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Knowledge base scan produces inaccurate results | Phase 2 clarifying questions catch errors; continuous learning improves over time |
| Plan quality isn't good enough to be useful | Use strong model for plan generation; iterate on prompts with real Vir-Tec tickets; human edit loop builds training data |
| ADO API limitations / rate limits | Cache aggressively; batch requests; use webhooks where available |
| Scope creep during 2-week build | V1 scope is locked. Everything else goes on V2 list. No exceptions. |
| Security concerns from potential customers | Start internal (Vir-Tec). For external: SOC 2 roadmap, clear data handling docs, option for self-hosted in Enterprise tier |

---

## Success Criteria for V1

After 1 week of internal use at Vir-Tec:

- [ ] Knowledge base accurately represents 80%+ of the system architecture
- [ ] AI-generated plans are useful (devs edit <30% of content, not rewriting from scratch)
- [ ] Dashboard is checked daily by at least 2 team members
- [ ] At least one "this saved me real time" moment from a team member
- [ ] Clear list of V2 priorities based on real usage

---

*Generated: April 10, 2026*
*Last updated: April 13, 2026*
*Status: V1 built — internal demo ready*
