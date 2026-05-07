## Problem Statement

DevCycle currently operates as a single-workspace app. All repos, tickets, KB content, and Jira config are locked to one context. Users working across multiple teams, projects, or Jira boards must either conflate everything into one workspace or lose context switching between them. There is no way to segment repos and tickets by project boundary.

## Solution

Introduce workspaces as a first-class concept. Each workspace has a name, a set of selected repos, and a Jira project key. Users switch between workspaces via a popover in the left icon rail. Credentials (ADO PAT, Jira token) are shared globally — workspaces only differ in which repos and Jira project they target. All other data (tickets, tasks, KB, jobs, suggestions, chat messages, pipeline runs, etc.) is fully siloed per workspace.

## User Stories

1. As a user, I want to create a new workspace with a name, selected repos, and Jira project, so that I can organize my work by project boundary.
2. As a user, I want to switch between workspaces from the left icon rail, so that I can quickly change project context.
3. As a user, I want my last-used workspace to load automatically on app start, so that I resume where I left off.
4. As a user, I want to rename a workspace, so that I can correct or update its label.
5. As a user, I want to edit a workspace's selected repos, so that I can add or remove repos without recreating the workspace.
6. As a user, I want to edit a workspace's Jira project, so that I can re-point it without recreating the workspace.
7. As a user, I want to delete a workspace, so that I can clean up workspaces I no longer need.
8. As a user, I want to be prevented from deleting my last workspace, so that the app always has a valid context.
9. As a user, I want my credentials to carry over to new workspaces, so that I don't re-enter PATs for each workspace.
10. As a user, I want the "new workspace" flow to skip credential steps when PATs already exist, so that workspace creation is fast.
11. As a user, I want each workspace to have its own independent KB, so that scanned knowledge doesn't bleed between project contexts.
12. As a user, I want each workspace to have its own tickets, tasks, and jobs, so that data is fully isolated per workspace.
13. As a user, I want removing a repo from a workspace to preserve its KB data and existing tasks, so that I can re-add it later without losing work.
14. As a user, I want my existing data to auto-migrate to a default workspace named "Selling" on upgrade, so that I lose nothing.
15. As a user, I want to see which workspace is currently active in the UI, so that I always know my context.
16. As a user, I want a "New workspace" button in the workspace switcher popover, so that workspace creation is discoverable.
17. As a user, I want workspace switching to reload all data (board, tickets, KB, suggestions), so that the UI fully reflects the new context.
18. As a user, I want scan suggestions to be scoped per workspace, so that findings from one project don't appear in another.
19. As a user, I want chat messages and interview notes to be scoped per workspace, so that AI conversation history stays contextual.
20. As a user, I want pipeline runs and Jenkins mappings to be scoped per workspace, so that CI/CD monitoring reflects the active project.

## Implementation Decisions

### Schema Changes
- **`pats` table**: Drop `workspaceId` column. PATs become global — one row per service (azure, jira). All workspace-scoped queries stop joining on PATs by workspace.
- **`workspace` table**: No schema change. Already has `name`, `jiraUrl`, `jiraProjectKey`, `jiraDoneStatuses`.
- **`repos` table**: No schema change. `workspaceId` + `selected` column already support soft removal.

### KB File Storage
- KB root changes from `kb/` to `kb/workspaces/{workspaceId}/`.
- All KB read/write operations resolve base path via a single function that takes workspace ID.
- Each workspace gets independent `wiki/` and `raw/` subdirectories.

### Migration (auto, on first boot)
- Detect migration needed via flag (e.g., absence of `kb/workspaces/` directory or a DB migration version).
- Rename existing workspace to "Selling".
- Move `kb/wiki/` and `kb/raw/` into `kb/workspaces/1/wiki/` and `kb/workspaces/1/raw/`.
- Drop `workspaceId` from `pats` table.
- Migration is idempotent — safe to re-run.

### Adaptive Setup Flow
- Setup wizard detects existing PATs. If found, skip ADO PAT and Jira credential steps.
- "New workspace" triggers same wizard with credential steps conditionally hidden.
- First-ever workspace still runs full flow (PATs + workspace creation).

### Workspace Switcher UI
- New popover component anchored to top of left icon rail, under app logo.
- Shows list of workspaces with active one highlighted.
- "New workspace" button at bottom of list.
- Switching persists active workspace ID to localStorage, triggers full data reload in AppShell.

### Workspace CRUD API
- `GET /api/workspace` — returns all workspaces.
- `POST /api/workspace` — create workspace (name, repo IDs, Jira project key).
- `PATCH /api/workspace/{id}` — update name, repos, Jira config.
- `DELETE /api/workspace/{id}` — cascade delete all workspace data + KB files on disk. Returns 400 if last workspace.

### AppShell Context
- Active workspace ID read from localStorage on mount.
- All data fetches (`/api/tickets`, `/api/suggestions`, `/api/kb/*`, etc.) scoped by active workspace ID.
- Workspace switch triggers re-fetch of all workspace-scoped data.

### Repo Management
- Adding repos to workspace: set `workspaceId` + `selected=1`.
- Removing repos: set `selected=0`. KB files and task references preserved.
- Re-adding: set `selected=1`, skip re-scan if `lastScanned` is recent.

### Workspace Delete Cascade
- Deletes: tickets, tasks, waves, jobs, scan_suggestions, chat_messages, interview_notes, pipeline_runs, pipeline_stages, jenkins_job_mappings, review_comments.
- Deletes KB directory `kb/workspaces/{id}/` from disk.
- Sets repos with matching `workspaceId` to `selected=0` (or deletes rows).
- Blocked if workspace is the only one remaining.

## Testing Decisions

### What makes a good test
Tests should verify external behavior through the public interface — given inputs, assert outputs and side effects. Do not test internal implementation details like private function calls or intermediate state.

### Modules to test
- **DB Migration Module**: Test that migration correctly moves KB files, renames workspace, drops `workspaceId` from PATs, and is idempotent. Use a temp SQLite DB and temp filesystem directory. Assert pre/post state of both DB and filesystem.

### Prior art
No existing test files found in the codebase. Vitest is configured in `package.json` but unused. Migration tests will be the first test suite — use Vitest with `better-sqlite3` for in-memory DB setup.

## Out of Scope

- Role-based access control or multi-user support (still single-user app)
- Sharing workspaces between users
- Workspace templates or cloning
- Cross-workspace search or reporting
- Workspace-level settings beyond repos and Jira project (e.g., per-workspace Jenkins config)
- UI for managing global credentials (PAT rotation) — separate feature

## Further Notes

- localStorage key for active workspace: `devcycle:activeWorkspaceId`
- Workspace switcher should show workspace name + Jira project key as subtitle for quick identification
- Consider showing repo count badge on each workspace in the switcher for context
