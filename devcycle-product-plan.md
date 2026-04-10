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

**What it does:** Connects to ADO repos + Jira, auto-scans everything, then asks clarifying questions to build a deep understanding of the system.

**Phase 1 — Auto-Scan (zero human effort):**
- Repo structure: languages, frameworks, folder conventions, shared libraries
- Dependency graph: which repos reference/call each other (imports, API URLs, config, docker-compose, k8s manifests)
- CI/CD pipelines: read Azure Pipelines YAML, understand build → test → deploy stages, environments
- PR patterns: who reviews what, average review time, typical PR size, branch naming conventions
- Existing docs: READMEs, wiki pages, inline doc comments
- Jira structure: issue types, workflows, custom fields, board config, sprint patterns
- Team structure: who commits where, ownership patterns, review relationships

**Phase 2 — Clarifying Questions (AI-guided, human confirms):**
- AI presents system summary + interactive service map diagram
- Generates targeted questions to fill gaps:
  - "Is service X still active? No commits in 4 months but still in the pipeline."
  - "I see payments-service calls user-service via REST, but also found an Azure Service Bus connection — active or deprecated?"
  - "Who is the primary owner of repo Y?"
- UX is adaptive: chat-based for complex questions, form/checklist for simple confirmations, interactive diagram for architecture corrections
- Answers fold back into the knowledge base

**Stays current:** Continuous — watches every commit, PR, and ticket in real-time after initial setup.

### 2. Ticket-to-Plan — "The Value"

**What it does:** A Jira ticket arrives → AI reads it, cross-references the knowledge base → generates a structured implementation plan → human reviews/edits/approves.

**The plan includes:**
- Affected repos and services
- Specific files likely impacted
- Suggested implementation approach
- Complexity estimate (S / M / L / XL)
- Risk assessment
- Open questions for the requester (auto-generated)
- Dependencies on other in-flight work

**UX:** Editable plan card. Human can accept, edit individual sections, reject and regenerate, or add notes. Approved plan becomes the source of truth for that ticket.

### 3. Cycle Dashboard — "The Visibility"

**What it does:** Kanban-style pipeline view of all in-flight tickets, wired to real Jira + ADO data.

**Pipeline stages:** Intake → Planning → In Progress → PR Review → CI/CD → UAT → Done

**Each ticket card shows:**
- Ticket ID, title, type (feature/bug), priority
- Assignee + avatar
- Current stage + time in stage
- AI plan status (generated / pending / approved) + confidence score
- Blocker indicator with reason

**Interactions:**
- Click ticket → see full detail panel with plan, stage history/journey, metadata
- "Nudge Blocker" button for stuck items
- "View AI Plan" button
- Link out to Jira

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| **Framework** | Next.js (App Router) | Fast to ship, great for dashboards, SSR for initial loads |
| **Hosting** | Vercel | Instant deploys, serverless functions, familiar platform |
| **Auth** | Clerk | Already familiar, handles team/org features |
| **Database** | TBD (Postgres + vector storage needed) | Options: Supabase, Vercel Postgres + Pinecone, Neon + pgvector |
| **LLM** | Mix — different models for different tasks | e.g., fast model for classification/routing, strong model for plan generation, cheap model for continuous monitoring |
| **ADO Integration** | Azure DevOps REST API | OAuth flow, repo access, pipeline data, PR data |
| **Jira Integration** | Jira Cloud REST API | OAuth 2.0 (3LO), webhooks for real-time updates |

---

## 2-Week Build Plan

### Week 1: The Brain + Foundation

#### Days 1-2: Project Scaffold + Integrations
- [ ] Next.js app scaffolded, deployed to Vercel
- [ ] Clerk auth configured (will need team/org support later)
- [ ] ADO OAuth flow: connect, list repos, verify permissions
- [ ] Jira OAuth flow: connect, list projects, verify permissions
- [ ] Database provisioned and schema designed
- **Milestone:** Connect Vir-Tec's ADO + Jira, see list of repos and projects in the UI

#### Days 3-4: Auto-Scan Engine
- [ ] Repo metadata fetcher: file tree, languages, frameworks per repo
- [ ] Dependency parser: package.json / .csproj / requirements.txt analysis
- [ ] CI/CD pipeline reader: parse Azure Pipelines YAML files
- [ ] Inter-service detection: grep for API URLs, imports, config references, docker/k8s refs
- [ ] PR history analyzer: recent PRs, reviewers, merge times, branch patterns
- [ ] Jira structure mapper: workflows, issue types, sprint patterns
- [ ] Store all findings as structured knowledge in DB
- **Milestone:** Run scan against Vir-Tec repos, get a complete raw knowledge dump

#### Days 5-6: Interactive Knowledge Refinement
- [ ] AI generates system summary from scan data
- [ ] Interactive service map visualization (services as nodes, connections as edges)
- [ ] AI generates clarifying questions based on gaps/ambiguities
- [ ] Chat interface for complex questions
- [ ] Form/checklist for simple confirmations
- [ ] Diagram editing for architecture corrections
- [ ] Answers persist back into knowledge base
- **Milestone:** Vir-Tec's system is accurately mapped; AI "gets it"

#### Day 7: Buffer
- Catch up on anything that slipped
- Fix bugs from Days 1-6
- Refactor if needed before Week 2

### Week 2: The Value + The Visibility

#### Days 8-9: Ticket-to-Plan Engine
- [ ] Jira webhook listener (+ manual ticket URL paste as fallback)
- [ ] Ticket intake: read title, description, type, priority, comments
- [ ] Knowledge base query: identify affected services, files, dependencies
- [ ] Plan generation prompt: structured output with all plan fields
- [ ] Editable plan UI: accept, edit sections, reject + regenerate
- [ ] Plan storage: link plans to tickets in DB
- **Milestone:** Paste a real Vir-Tec Jira ticket URL, get a plan that makes sense

#### Days 10-11: Cycle Dashboard
- [ ] Jira data pull: all in-flight tickets, mapped to pipeline stages by status
- [ ] Kanban board UI with stage columns
- [ ] Ticket cards with metadata, assignee, time-in-stage, AI plan status
- [ ] Blocked ticket detection: stuck too long, PRs without reviewers, idle UAT
- [ ] Polling for near-real-time updates (webhooks can come in V2)
- **Milestone:** See Vir-Tec's actual sprint as a live pipeline view

#### Days 12-13: Polish + Connect
- [ ] Link dashboard cards → plan detail view
- [ ] "Nudge" actions: notify reviewer, ping requester for clarification
- [ ] Knowledge base browser: view system map anytime
- [ ] Basic settings: team members, notification preferences
- [ ] Mobile responsive pass
- [ ] Error handling and loading states

#### Day 14: Internal Launch
- [ ] Deploy final build to Vercel with Vir-Tec production data
- [ ] Walk the team through the product
- [ ] Collect initial feedback
- [ ] Document bugs and V2 ideas

---

## V2+ Roadmap (Post-Launch)

Once V1 proves the core value, expand along these axes:

| Feature | Description | Priority |
|---|---|---|
| **PR Shepherd** | Monitor PRs: nudge slow reviewers, explain CI failures, detect approved-but-unmerged PRs, post-deploy log anomalies | High |
| **Auto-coding integration** | Plans can trigger AI code generation (Claude Code / Copilot) with full knowledge base context | High |
| **Continuous knowledge updates** | Real-time watching of commits, PRs, tickets to keep the brain current | High |
| **Requester Q&A bot** | AI asks the ticket requester clarifying questions automatically before plan generation | Medium |
| **UAT feedback loop** | Track UAT status, auto-route feedback back to the dev who built it | Medium |
| **PagerDuty integration** | Incidents trigger the same intake → plan → assign flow | Medium |
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
*Status: Ready to build*
