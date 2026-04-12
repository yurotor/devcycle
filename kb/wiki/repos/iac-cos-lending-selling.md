# iac-cos-lending-selling

## Purpose

DevCycle is an AI-powered software development workflow automation tool that integrates with Azure DevOps and Jira to streamline the entire development lifecycle. It automatically scans codebases to build a comprehensive knowledge base, then uses Claude AI to analyze tickets, generate implementation plans, write code, and create pull requests - all within a structured multi-phase workflow (analyze → plan → design → implement → done). The system combines codebase understanding with ticket management to accelerate development while maintaining code quality through automated analysis and review workflows.

## Business Features

- Automated codebase scanning and analysis using Claude to understand repository purpose, architecture, and dependencies
- Cross-repository system synthesis to map service relationships and data flows
- Knowledge base generation with bidirectional wiki links organized by architecture, features, flows, clusters, data model, and repos
- Jira ticket synchronization supporting both Cloud and Server/Data Center deployments
- AI-powered ticket analysis with conversational refinement (choice-based chat interface)
- PRD (Product Requirements Document) generation from ticket analysis
- Wave-based task decomposition with automatic repo assignment
- Automated code implementation using Claude Code CLI to edit files directly in git branches
- Pull request creation and management in Azure DevOps
- Code review workflow with inline comments and priority levels
- Scan findings/suggestions with dismiss and promote-to-ticket actions
- Interview-based knowledge enrichment - user provides context that supplements automated analysis
- PAT (Personal Access Token) encryption and secure storage
- Multi-repo workspace management
- Repository selection and branch override configuration
- Unified diff parsing and visualization for code changes

## APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/workspace` | Check if workspace exists, used for setup flow routing |
| POST | `/api/workspace` | Create workspace with Azure DevOps and Jira configuration |
| POST | `/api/azure/connect` | Validate and store Azure DevOps PAT, list repositories |
| POST | `/api/jira/connect` | Validate and store Jira credentials (Cloud or Server) |
| POST | `/api/jira/sync` | Sync tickets from Jira to local database |
| POST | `/api/scan/start` | Start background repository scanning job |
| GET | `/api/scan/status` | Get status of running scan jobs |
| GET | `/api/scan/stream` | Server-sent events stream for scan progress |
| GET | `/api/tickets` | List all tickets for workspace |
| GET | `/api/tickets/:id` | Get ticket details with tasks and waves |
| PATCH | `/api/tickets/:id` | Update ticket phase or metadata |
| GET | `/api/tickets/:id/chat` | Get chat messages for analyze/plan phases |
| POST | `/api/tickets/:id/chat` | Send chat message in analyze phase, AI responds |
| POST | `/api/tickets/:id/plan/generate` | AI generates implementation plan/PRD |
| POST | `/api/tickets/:id/plan/approve` | Move ticket to design phase after plan approval |
| POST | `/api/tickets/:id/design/generate` | Generate wave/task breakdown from PRD |
| POST | `/api/tickets/:id/implement` | Start AI implementation, mark manual, or create PR |
| GET | `/api/tickets/:id/implement` | Get implementation status or diff for a task |
| GET | `/api/tickets/:id/review` | Get review comments for a task |
| POST | `/api/tickets/:id/review` | Add review comment to task |
| POST | `/api/tickets/:id/pr` | Create pull request in Azure DevOps |
| GET | `/api/tickets/:id/tasks` | Get tasks for ticket |
| PATCH | `/api/tickets/:id/tasks` | Update task status, repo, or metadata |
| GET | `/api/suggestions` | Get scan findings/suggestions from scan_suggestions table |
| POST | `/api/suggestions/:id/dismiss` | Dismiss a scan finding |
| POST | `/api/suggestions/:id/promote` | Convert scan finding to Jira ticket |
| GET | `/api/kb/tree` | Get knowledge base directory tree |
| GET | `/api/kb/file` | Read knowledge base file contents |
| POST | `/api/kb/interview` | Process interview transcript and re-synthesize knowledge base |

## Dependencies

- **next** (http)
- **react** (http)
- **react-dom** (http)
- **drizzle-orm** (shared-lib)
- **better-sqlite3** (database)
- **@anthropic-ai/bedrock-sdk** (http)
- **tailwindcss** (shared-lib)
- **framer-motion** (shared-lib)
- **lucide-react** (shared-lib)
- **react-markdown** (shared-lib)
- **@dnd-kit/core** (shared-lib)
- **class-variance-authority** (shared-lib)
- **claude CLI** (http)
- **git** (http)
- **curl** (http)

## Data Entities

- **workspace** — Top-level configuration container storing Azure DevOps org URL, Jira URL, project key, and done status mappings
- **pats** — Encrypted Personal Access Tokens for Azure DevOps and Jira, with AES-256-GCM encryption and per-record IVs
- **repos** — Repositories synced from Azure DevOps with selection status, branch overrides, and last scan timestamps
- **tickets** — Jira issues synced locally with workflow phase tracking (analyze/plan/design/implement/done) and phase locking
- **waves** — Ordered groups of related tasks within a ticket, implementing wave-based rollout strategy
- **tasks** — Individual implementation units with repo assignments, branch names, PR URLs, diffs, and dependency chains
- **jobs** — Background job tracker for long-running operations (scan, implement) with progress percentage and status
- **scanSuggestions** — Critical and high-severity findings from codebase analysis with dismiss and promote-to-ticket capabilities
- **chatMessages** — Conversational AI interactions during analyze and plan phases with optional choice buttons
- **interviewNotes** — User-provided context transcripts with extracted structured facts for knowledge base enrichment
- **reviewComments** — Code review feedback on tasks with file/line references, priority, and status tracking

> See also: [Data Model](../data-model/entities.md)

## External Integrations

- **Azure DevOps** — bidirectional via REST API v7.1 with Basic auth (PAT)
- **Jira Cloud** — bidirectional via REST API v3 with Basic auth (email:token)
- **Jira Server/Data Center** — bidirectional via REST API v2 with Bearer auth (PAT)
- **Amazon Bedrock Converse API** — upstream via HTTPS with API key (custom gateway wrapper)
- **Anthropic Claude API** — upstream via HTTPS with API key
- **Claude Code CLI** — upstream via Local process execution via execFile with JSON output

> See also: [Integrations Overview](../integrations/overview.md)

## Architecture Patterns

- Single-page application with Next.js App Router and client-side state management
- Server-sent events (SSE) for real-time scan progress streaming
- Background job processing with status polling (jobs table tracks async operations)
- Multi-phase workflow state machine (analyze → plan → design → implement → done) with phase locking
- Knowledge base generation as code - markdown wiki compiled from JSON analysis
- Repo-level locking using in-memory mutex (Map<string, Promise<void>>) to prevent concurrent git operations
- Dual AI integration strategy - prefers Claude Code CLI for file-reading capabilities, falls back to API with file stuffing
- Encrypted credential storage using AES-256-GCM with per-credential IVs
- Wave-based task decomposition with dependency tracking (stored as JSON arrays)
- Git-based caching using HEAD commit hashes to avoid re-analysis of unchanged repos
- Retry logic with exponential backoff for Azure DevOps and Bedrock API calls
- Native HTTPS via curl/execFile to bypass Next.js fetch patching

## Tech Stack

- Next.js 16.2.3 (App Router)
- React 19.2.4
- TypeScript 5
- Tailwind CSS 4
- Drizzle ORM 0.45.2
- better-sqlite3 12.8.0 (SQLite database)
- Node.js crypto (AES-256-GCM encryption)
- Framer Motion 12 (animations)
- Lucide React (icons)
- react-markdown 10 (markdown rendering)
- @dnd-kit (drag and drop)
- Claude AI via AWS Bedrock Converse API
- Claude AI via Anthropic API
- Claude Code CLI (local AI agent)
- Azure DevOps REST API v7.1
- Jira REST API v2/v3
- Git (via child_process.execFile)
- curl (for HTTP requests bypassing Next.js)
- Vitest 4 (testing)

## Findings

### [HIGH] Credentials stored in .env.local file

**Category:** security  
**Files:** .env.local

The .env.local file contains plaintext Azure DevOps PATs, Jira tokens, and API keys. While this file is gitignored, it represents a security risk if the file is backed up, logged, or accessed by unauthorized processes. Consider using a secrets manager or at minimum document rotation procedures.
### [HIGH] Dangerous Claude CLI flags in production code

**Category:** security  
**Files:** src/lib/claude-cli.ts, src/lib/scan/engine.ts, src/app/api/tickets/[id]/implement/route.ts

The claudeExec function uses --dangerously-skip-permissions flag which bypasses sandboxing. While documented in the code, this could allow arbitrary file system access during AI-driven code generation if the prompt injection attack surface is not carefully managed.
### [HIGH] Git operations lack error recovery for detached HEAD states

**Category:** bug  
**Files:** src/app/api/tickets/[id]/implement/route.ts

The implement phase performs git checkout/branch operations but if the repo is in a detached HEAD state or has merge conflicts, the error handling may leave the repo in an inconsistent state. The cleanup logic in catch blocks attempts branch deletion but doesn't verify starting state.
### [CRITICAL] No database migrations or schema versioning

**Category:** architecture  
**Files:** src/lib/db/index.ts

The database uses idempotent DDL with try/catch on ALTER TABLE statements. This works for column additions but cannot handle column renames, type changes, or data migrations. Production deployments could fail or corrupt data if schema changes require more complex migrations.
### [HIGH] Unbounded git clone operations can exhaust disk space

**Category:** optimization  
**Files:** src/lib/scan/engine.ts

The scan engine clones repositories with --depth 1 but never prunes old clones. For large monorepos or many repositories, the kb/repos directory could grow to consume all available disk. No cleanup or LRU eviction strategy is implemented.

---

> See also: [System Overview](../architecture/system-overview.md) | [Service Map](../architecture/service-map.md)

*Generated: 2026-04-12T14:26:15.921Z*