# PRD: SDLC Compliance Dashboard with AI-Generated Artifacts

## Problem Statement

Engineering management lacks visibility into whether Jira Epics follow the organization's SDLC procedure. Design documents, test plans, and signoff tracking are scattered across Confluence, Jira, and tribal knowledge. Documents are frequently missing, stale, or inconsistent with the actual work being done. Audit preparation is painful — teams scramble to retroactively produce documentation that should have existed from the start.

The core pain: nobody writes the SDLC docs because it's tedious, and nobody knows which Epics are missing docs until an auditor asks.

## Solution

A new top-level "SDLC" feature in DevCycle that syncs Jira Epics per workspace, automatically generates SDLC artifacts (Design Docs and Test Plans) using AI with full system context from the workspace's KB and repos, and presents a compliance dashboard showing management exactly where every Epic stands in the SDLC lifecycle.

The app becomes the place where SDLC documentation writes itself and compliance gaps are impossible to miss.

Key value propositions:
- **AI-generated Design Docs** in the org's RFC format, using the RFC template, guiding questions, and workspace KB as context
- **AI-generated Test Plans** covering unit, functional, regression, UAT, security, and performance considerations
- **Compliance dashboard** with alert cards for missing docs, overdue signoffs, and stale drafts
- **Phase gate tracking** mapping Jira statuses to SDLC phases with signoff visibility
- **Editable artifacts** — AI generates drafts, humans refine them inline

## User Stories

1. As an engineering VP, I want to see a dashboard of all active Epics and their SDLC compliance status, so that I can identify gaps before an audit
2. As an engineering VP, I want alert cards showing Epics with missing design docs or test plans, so that I can follow up with the responsible teams
3. As an engineering VP, I want to see how many Epics are in each SDLC phase (Design, Development, Testing), so that I understand the portfolio at a glance
4. As an engineering VP, I want to see which Epics have overdue signoffs, so that I can nudge the right approvers
5. As an engineering VP, I want to see stale drafts that were generated but never reviewed, so that I can ensure docs are actually being used
6. As an engineering VP, I want to switch between workspaces in the SDLC view using a dedicated dropdown, so that I can review compliance across different teams
7. As an engineer, I want to click "Generate Design Doc" on an Epic and get a complete RFC-format draft populated with context from our KB and Jira Stories, so that I don't have to write it from scratch
8. As an engineer, I want to see what context (KB pages, Stories) the AI will use before it generates, so that I can verify the AI has the right information
9. As an engineer, I want to be prompted with interview questions when the Epic description is thin, so that the AI can generate a better document
10. As an engineer, I want to skip the interview and generate a best-effort doc immediately, so that I'm not blocked by a mandatory interview step
11. As an engineer, I want to regenerate individual sections of a generated doc without losing my edits to other sections, so that I can iterate on weak parts without starting over
12. As an engineer, I want to toggle between reading a rendered doc and editing the raw markdown, so that I can make precise changes
13. As an engineer, I want to click "Generate Test Plan" on an Epic and get a structured test plan covering unit tests, functional scenarios, regression scope, UAT, security, and performance, so that QA and audit requirements are covered
14. As an engineer, I want the test plan to pull acceptance criteria from linked Jira Stories automatically, so that functional test scenarios match the actual requirements
15. As a product manager, I want to see which Epics I need to sign off on, so that I don't hold up deployments
16. As a solution architect, I want to see which Epics need my RFC signoff, so that I can prioritize reviews
17. As an engineer, I want the SDLC phase to update automatically when the Jira Epic status changes, so that I don't have to manually track phases in two places
18. As a workspace admin, I want to configure which Jira statuses map to which SDLC phases, so that my team's workflow is accurately represented
19. As a workspace admin, I want sensible default phase mappings pre-populated, so that setup is fast for teams with standard Jira workflows
20. As an engineer, I want to see an Epic detail page with a timeline showing which SDLC phases are complete and which are pending, so that I know what documentation work remains
21. As an engineer, I want artifact cards on the Epic detail page showing status badges (missing, draft, reviewed), so that I can see at a glance what needs attention
22. As an engineer, I want the signoff tracker to show who needs to approve (VP Eng, SA, PM) and the current status of each approval, so that I know if we're cleared for deployment
23. As an engineer, I want the design doc to follow our RFC template structure (Ownership, Background, Definition of Success, Proposal with Options, Impacted Teams, Risks & Mitigations), so that generated docs feel native to our organization
24. As an engineer, I want the AI to use the RFC Guiding Questions to evaluate completeness of each section, so that generated docs address what reviewers actually look for
25. As any user, I want the SDLC dashboard data to refresh on page load (with a short cache), so that I always see current data without a manual sync step
26. As any user, I want a manual "Refresh" button to force a Jira re-sync, so that I can see changes immediately after updating Jira

## Implementation Decisions

### Architecture

The SDLC feature is workspace-scoped. Each workspace has its own Jira project, KB, and repos. The SDLC view has a separate workspace dropdown from the main app navigation, allowing users to switch SDLC context independently.

### Modules

**1. SDLC DB Schema**
- Five new tables: `sdlc_epics`, `sdlc_artifacts`, `sdlc_artifact_sections`, `sdlc_signoffs`, `sdlc_phase_config`
- Artifacts are stored as sections (separate rows per section), not monolithic markdown blobs. This enables section-level regeneration and tracks which sections were user-edited vs. AI-generated.
- Phase config stores Jira status → SDLC phase mappings per workspace with defaults.

**2. Jira Epic Sync**
- Fetches all Epics from the workspace's Jira project that are not in Done/Won't Fix status
- Maps Jira statuses to SDLC phases using the workspace's `sdlc_phase_config`
- Pulls linked Stories per Epic (for acceptance criteria and context)
- Caches results in SQLite with `last_synced_at`. Re-syncs on page load if cache is older than 5-10 minutes. Manual refresh button bypasses cache.
- Signoff information is display-only, derived from Jira Epic fields where possible.

**3. Context Assembly**
- Two-step process: (a) Send KB INDEX.md + Epic description to Haiku to identify relevant wiki pages, (b) Load those pages + Epic + linked Stories into a context bundle
- This keeps generation context focused rather than stuffing all 80+ wiki pages into a prompt
- All context comes from the current workspace (KB, repos, Jira) — no cross-workspace matching needed

**4. Artifact Generator**
- Generates two artifact types in MVP: Design Doc and Test Plan
- Design Doc uses the org's RFC template as structural skeleton and the RFC Guiding Questions as system prompt guidance
- Test Plan covers: scope, unit test coverage, functional test scenarios (from Story acceptance criteria), regression scope, UAT scenarios, security considerations, performance considerations
- Uses Sonnet for initial generation, Haiku for context assembly step
- Streams section-by-section for responsive UX
- Section-level regeneration: user can regenerate one section while preserving edits to others
- Interview flow is offered before generation (to strengthen thin Epic descriptions) but can be skipped and done later
- Weak/low-confidence sections are flagged to the user

**5. SDLC Dashboard UI**
- New top-level "SDLC" nav item
- Landing page is the compliance dashboard (management persona)
- Alert cards at top: Epics missing design docs, Epics missing test plans, overdue signoffs, stale drafts
- Phase pipeline visualization showing Epics grouped by SDLC phase
- Sortable/filterable table of all Epics with columns: Epic key, title, phase, design doc status, test plan status, signoff status

**6. Epic Detail UI**
- SDLC phase timeline (visual indicator of current phase + completed phases)
- Artifact cards with status badges (missing / draft / reviewed)
- "Generate" button opens pre-generation screen showing context sources (KB pages, Stories). User can proceed or start interview first.
- Markdown renderer with edit toggle for each artifact
- Section-level "Regenerate" buttons within artifacts
- Signoff tracker panel: displays required approvers by role, current status, timestamps (read-only in v1)

**7. Phase Config Settings**
- Per-workspace settings page for mapping Jira statuses to SDLC phases
- Pre-populated with sensible defaults
- Simple table UI: Jira status column with SDLC phase dropdown

### Key Technical Decisions

- **Jira is the source of truth for Epics.** The app syncs from Jira, never writes back.
- **SQLite is the source of truth for generated artifacts.** Confluence export is a future feature (v1.2).
- **Signoff is display-only in v1.** No in-app approval workflow. Actual signoff happens in Jira/Confluence.
- **Markdown storage with section granularity.** Each section is a row in `sdlc_artifact_sections` with metadata for tracking user edits vs. AI generation.
- **No background sync jobs.** Sync is triggered on page load with cache TTL. Keeps infrastructure simple (no cron, no workers).
- **Workspace-scoped context.** All KB pages, repos, and Jira data for generation come from the current workspace. No cross-workspace concerns.

### DB Schema

```
sdlc_epics: id, workspace_id, jira_key, jira_id, title, description, status, assignee, sdlc_phase, last_synced_at, created_at, updated_at

sdlc_artifacts: id, epic_id, workspace_id, type (design_doc|test_plan), status (draft|reviewed|approved), generated_at, edited_at, created_at, updated_at

sdlc_artifact_sections: id, artifact_id, section_key, title, content_markdown, last_generated_at, last_edited_by_user (boolean), order_index

sdlc_signoffs: id, epic_id, artifact_id (nullable), role (vp_eng|solution_architect|product_manager), person_name, jira_username, status (pending|approved), signed_at (nullable)

sdlc_phase_config: id, workspace_id, jira_status, sdlc_phase
```

### Design Doc Sections (RFC Format)

Ownership, Background, Definition of Success, Proposal (Options with Pros/Cons), Impacted Teams/Systems, Risks & Mitigations, Open Questions

### Test Plan Sections

Scope, Unit Test Coverage, Functional Test Scenarios, Regression Scope, UAT Scenarios, Security Considerations, Performance Considerations

## Testing Decisions

Good tests verify external behavior through module interfaces, not implementation details. Tests should remain valid even if internal code is refactored.

**Tested modules:**

- **Jira Epic Sync** — Data integrity is critical. Tests verify: correct filtering of Done/Won't Fix Epics, accurate Jira status → SDLC phase mapping, cache TTL behavior (stale vs. fresh), handling of missing/malformed Jira data, Story linking per Epic.

- **Context Assembly** — Wrong context produces bad docs. Tests verify: correct wiki page selection given an Epic description, context bundle structure, handling of empty KB or missing INDEX.md, token budget limits.

**Not tested (and why):**

- Artifact Generator — LLM output is non-deterministic. Quality is verified by human review, not assertions.
- UI components — Verified by manual testing and visual inspection. No existing component test patterns in codebase to follow.

## Out of Scope

- **Confluence export** — Generated docs stay in-app for now. Confluence integration is planned for v1.2.
- **In-app signoff workflow** — No approval buttons or routing in v1. Signoff tracking is display-only.
- **System Overview Delta generation** — Planned for v1.1.
- **Jira write-back** — App does not push status, comments, or fields back to Jira.
- **Webhook-based sync** — No Jira webhooks. Sync is on-demand with cache.
- **Disposal phase** — Placeholder only. Process is still TBD at the org level.
- **Cross-workspace SDLC views** — Each workspace is independent. No aggregate dashboard across workspaces.
- **Initiation Documents** — Not needed for Epics (only for new systems, which are rare).
- **Background job infrastructure** — No cron or worker processes for sync.

## Further Notes

### Phasing

- **MVP (v1.0)**: Everything described above — Epic sync, phase mapping, compliance dashboard, Design Doc generation, Test Plan generation, signoff tracker (display-only), workspace dropdown, phase config settings
- **v1.1**: System Overview Delta generation, interview flow for strengthening weak artifact sections
- **v1.2**: Stale artifact alerts, overdue signoff notifications, Confluence export

### Reference Documents

The following org documents inform the AI generation templates and compliance rules:
- SDLC Procedure (Joel McCormick) — defines the 6 phases, required artifacts, and annual review requirements
- Phase Gate Signoff Quick Reference (Michael Sedley) — defines who approves what
- SDLC Scrum Alignment Guide (Michael Sedley) — maps SDLC activities to Agile workflows
- RFC Template (Joel McCormick) — structural template for Design Docs
- RFC Guiding Questions (Shelley Criveano) — questions the AI uses as system prompt for generation quality
- Guidelines for Jira Work Item Types (Shelley Criveano) — defines Epic/Story/Task format expectations
- Criteria for Adding 3rd Party Libraries (Joel McCormick) — example RFC for tone calibration
- Container Images and Scanning Requirements (Joel McCormick) — example RFC for tone calibration

### Selling This Feature

The SDLC feature is positioned as the highlight of DevCycle. The pitch to management: "Your SDLC docs write themselves. Open the dashboard, see every Epic's compliance status. Click generate, get an RFC-quality design doc in 30 seconds. Audit prep goes from weeks to minutes."
