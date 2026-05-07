# QA & Testing Module: Automated coverage analysis, risk scoring, and DOR lifecycle

## Problem Statement

Engineering teams lack unified visibility into test coverage across their microservice ecosystem. Testing evidence is scattered across ADO pipelines, Jenkins builds, and manual Jira processes. Managers must context-switch between systems to approve DOR (DevOps Release) tickets. Coverage gaps — especially in money movement and availability-critical paths — go undetected until production incidents occur. There is no systematic way to identify which code paths are tested, which are risky, and what to prioritize next.

## Solution

A workspace-scoped QA & Testing module within devcycle that:
1. Discovers and catalogs all test assets across repos (unit, integration, e2e, load, regression)
2. Builds coverage maps using static analysis from all entrypoints (APIs, message handlers, jobs, UI actions)
3. Scores risk using a severity hierarchy: money movements → system availability → side-effect code → composite(business criticality × complexity × change velocity)
4. Ingests test results from CI/CD pipelines (ADO + Jenkins) and tracks flakiness/performance over time
5. Generates actionable test plans ranked by risk, including code stubs
6. Manages the full DOR approval lifecycle within devcycle (backed by Jira as system of record)
7. Produces SDLC compliance artifacts (traceability matrices, execution reports, audit documents)

## User Stories

1. As a workspace admin, I want to label each repo as prod/test/infra/util, so that the system knows which repos contain business-critical code vs test suites vs tooling
2. As a workspace admin, I want to map test repos to the prod repos they cover, so that coverage analysis knows which services are tested by which test suites
3. As an engineer, I want the system to scan repos and detect test frameworks (xUnit, NUnit, Jest, Vitest, Playwright), so that I understand what test infrastructure exists per repo
4. As an engineer, I want to see a coverage score per repo combining presence of test layers, test density, feature coverage, and branch analysis, so that I can quickly identify under-tested areas
5. As an engineer, I want the system to build code trees from all entrypoints (API controllers, NServiceBus handlers, background jobs, UI click actions), so that every executable path is mapped
6. As an engineer, I want AI-assisted analysis to determine whether existing tests exercise specific code branches, so that coverage is measured without requiring test execution
7. As an engineer, I want uncovered branches ranked by severity (money > availability > side-effects > composite), so that I know what to test first
8. As an engineer, I want the system to auto-detect money-related and side-effect code via heuristics, refine with AI, and let me override classifications, so that severity is accurate without manual tagging of everything
9. As an engineer, I want to see which ADO pipelines and Jenkins jobs run tests for each repo, with gap identification (e.g., "e2e only runs on main, not PRs"), so that I can improve CI coverage
10. As an engineer, I want generated pipeline YAML/Groovy snippets that add missing test stages, so that I can quickly close CI gaps
11. As an engineer, I want test results automatically ingested from pipeline artifacts (TRX/JUnit XML) with fallback to log parsing, so that all test outcomes are tracked regardless of pipeline maturity
12. As an engineer, I want to see which tests are flaky (pass AND fail within a window without code changes) and chronically unreliable (>X% failure rate over N runs), so that I can fix or quarantine them
13. As an engineer, I want to see which tests are slow (exceeding configurable time thresholds), so that I can optimize CI pipeline duration
14. As an engineer, I want test plan suggestions ranked by risk that include specific test files to create, frameworks to use, and pipeline stages to add them to, so that closing gaps is actionable
15. As an engineer, I want auto-generated test code for straightforward cases (CRUD, validation, error handling), so that I can adopt suggestions immediately
16. As an engineer, I want an AI interview (grill-me) for complex business logic tests where the AI asks me about expected behavior, edge cases, and invariants before generating full test code, so that generated tests are accurate
17. As a manager, I want to see pending DOR tickets in devcycle with all test evidence attached (results, coverage reports, traceability), so that I can approve without switching to Jira
18. As a manager, I want to approve/reject DOR promotions from devcycle, with the transition pushed back to Jira via API, so that Jira remains the audit-trail system of record
19. As a manager, I want toast notifications when I have a pending DOR ticket to approve, so that deployments aren't blocked waiting for me to check Jira
20. As a compliance officer, I want traceability matrices mapping requirements → test cases → test results, so that I can demonstrate every requirement is covered
21. As a compliance officer, I want test execution reports per release/sprint with pass rates, coverage metrics, and risk scores, so that I can report on quality trends
22. As a compliance officer, I want audit-ready documents with timestamps, evidence chains, and sign-off records, so that regulatory reviews are straightforward
23. As a team lead, I want coverage and risk trends over time, so that I can answer "are we getting better or worse?"
24. As a team lead, I want all QA data workspace-scoped, so that different teams/products see only their own repos and metrics
25. As an engineer, I want QA coverage gaps to automatically enrich SDLC epic test plans, so that when an epic touches an uncovered area, the test plan includes those gaps
26. As an engineer, I want to trigger a re-scan on demand for a specific repo, so that I can see updated coverage after writing new tests
27. As an engineer, I want the system to parse both React (onClick, onSubmit, route definitions) and Angular (event bindings, route modules) to discover UI entrypoints, so that frontend coverage is included
28. As an engineer, I want the system to handle C#, TypeScript, and Python source code for branch analysis, so that all production languages are covered

## Implementation Decisions

### Modules to Build/Modify

**1. Repo Classification Module**
- Add `classification` column to existing `repos` table: `'prod' | 'test' | 'infra' | 'util'`
- Add `test_repo_mappings` table: many-to-many linking test repos → prod repos they cover
- API endpoints for labeling and mapping
- UI in workspace settings for repo classification

**2. Test Discovery Engine**
- File-pattern scanner: detects test files by naming conventions (`*.test.*`, `*.spec.*`, `*Tests.cs`, `/tests/` dirs)
- Framework detector: identifies xUnit, NUnit, Jest, Vitest, Playwright, pytest from imports/config files
- Test file parser: extracts test names, describe/it blocks, [Fact]/[Theory] attributes
- Stores results in `repo_test_inventory` table

**3. Coverage Analysis Engine**
- Entrypoint discovery: pattern-based detection of API controllers, NServiceBus handlers, background workers, React/Angular UI actions
- Code tree builder: traces call graphs from entrypoints through the codebase using AI analysis
- Branch mapper: identifies conditional branches (if/switch/try-catch) in each code path
- Coverage matcher: AI-assisted determination of whether tests exercise specific branches
- Composite scorer: combines presence, density, feature-mapping, and branch analysis into weighted score
- Results stored in `coverage_scores`, `entrypoints`, `code_branches`, `branch_coverage` tables

**4. Risk Scoring Engine**
- Critical path classifier: heuristic pass (keywords: amount, balance, transfer, payment, SaveChanges, INSERT, UPDATE) → AI refinement → user override
- Severity hierarchy: money (S1) → availability (S2) → side-effects (S3) → composite (S4)
- Composite score uses business criticality × code complexity × change velocity (git log frequency)
- Risk items stored in `risk_items` table with severity, classification, override status

**5. CI/CD Analyzer**
- ADO pipeline parser: reads `cicd.yaml` and `.devops/pipelines/` configs per repo
- Jenkins config parser: reads `Jenkinsfile`, shared library references, pipeline.yaml
- Gap detector: identifies which test types run in which stages, flags missing coverage
- Suggestion generator: produces YAML/Groovy snippets for missing test stages
- Stores in `ci_pipeline_configs`, `ci_test_gaps`, `ci_suggestions` tables

**6. Test Result Ingestion**
- Extends existing ADO client: fetch published test results via test results API, parse TRX/JUnit XML artifacts
- Extends existing Jenkins client: fetch test artifacts, parse console output for test results
- AI-powered log parser: extracts pass/fail/test names from unstructured console output when artifacts unavailable
- Poller (same pattern as elastic/newrelic pollers): periodic check for new build completions
- Flaky detector: tracks test outcomes over time, flags flaps (pass+fail same window) and chronic unreliability (>X% failure rate)
- Duration monitor: flags tests exceeding configurable time thresholds
- Stores in `test_runs`, `test_results`, `test_stability` tables

**7. Test Plan Generator**
- Gap-to-plan mapper: takes coverage gaps + risk scores → generates prioritized test plan
- Code stub generator: produces test files with correct imports, framework setup, assertions for straightforward cases
- Complex test interviewer: integrates with grill-me skill for business logic tests
- Links to existing SDLC test plan system: enriches epic test plans with relevant coverage gaps
- CI integration suggestions: what pipeline stage to add, what config to change

**8. DOR Lifecycle Manager**
- DOR discovery: monitors Jenkins builds, detects DOR ticket creation via Jira API
- Approver resolver: reads `pipeline.yaml` from each repo, extracts approver email addresses
- Evidence aggregator: attaches test results, coverage reports, traceability data to DOR tickets
- Approval UI: managers view pending DORs, see evidence, approve/reject
- Jira sync: pushes status transitions back to Jira via existing Jira client
- Toast notification system: alerts users with pending DOR approvals
- Stores in `dor_tickets`, `dor_approvals`, `dor_evidence` tables

**9. Compliance Artifact Generator**
- Traceability matrix: requirements (from epics) → test cases → test results with pass/fail status
- Execution reports: per-release/sprint aggregation of pass rates, coverage metrics, risk scores
- Audit documents: formatted output with timestamps, evidence chains, sign-off records
- Trend calculator: coverage/risk changes over time windows

**10. QA Dashboard**
- Overview view: org-level health heatmap by repo/feature, risk score summary
- Repo drill-down: per-repo coverage details, test inventory, gaps, suggestions
- Feature drill-down: per-feature coverage across repos, which tests cover which features
- DOR queue: pending approvals with evidence and approve/reject actions
- Timeline/trend view: coverage and risk changes over releases/sprints
- All views workspace-scoped via workspace_id filtering

### Architectural Decisions

- All QA tables use `workspace_id` foreign key for isolation (same pattern as existing tables)
- Scan triggers: full analysis on KB build (baseline), manual on-demand re-scan per repo
- Language handling: pattern-based structural detection for file/entrypoint discovery, AI (Claude) for deep call-graph tracing and branch coverage reasoning — works across C#, TypeScript, Python without dedicated AST parsers
- Approvers sourced from `pipeline.yaml` in each repo, matched by `emailAddress` field
- Jira remains system of record for DOR tickets — devcycle is the UI layer that pushes transitions via API
- Test result ingestion: structured artifacts (TRX/JUnit XML) preferred, AI-powered log parsing as fallback
- Alerting v1: dashboard indicators + in-app toast notifications (no external push)

### Schema Additions (Key Tables)

- `repos` — add `classification TEXT` column
- `test_repo_mappings` — repo_id, covers_repo_id, workspace_id
- `repo_test_inventory` — repo_id, workspace_id, framework, test_count, file_count, last_scanned
- `entrypoints` — repo_id, workspace_id, type (api/handler/job/ui_action), path, method_name, metadata
- `code_branches` — entrypoint_id, branch_path, complexity_score, classification (money/availability/side_effect/general)
- `branch_coverage` — branch_id, covered (0/1), covering_test_file, confidence_score, analysis_notes
- `coverage_scores` — repo_id, workspace_id, presence_score, density_score, feature_score, branch_score, composite_score, calculated_at
- `risk_items` — branch_id, workspace_id, severity (S1-S4), classification, user_override, description
- `ci_pipeline_configs` — repo_id, workspace_id, platform (ado/jenkins), config_path, stages_json, test_stages_json
- `test_runs` — workspace_id, repo_id, pipeline_platform, build_id, status, started_at, finished_at, total/passed/failed/skipped counts
- `test_results` — test_run_id, test_name, status, duration_ms, error_message, is_flaky
- `test_stability` — workspace_id, repo_id, test_name, total_runs, fail_count, flap_count, avg_duration_ms, last_flap_at
- `dor_tickets` — workspace_id, jira_key, repo_id, environment (qa/staging/prod), status, approver_emails_json, created_at
- `dor_approvals` — dor_ticket_id, approver_email, decision (pending/approved/rejected), decided_at
- `dor_evidence` — dor_ticket_id, type (test_results/coverage_report/traceability), content_json, attached_at
- `qa_suggestions` — workspace_id, repo_id, risk_item_id, type (test_plan/ci_config), title, description, generated_code, priority_rank

## Testing Decisions

Good tests for this module verify external behavior through the API layer and DB state — not internal implementation details.

**Modules to test:**

1. **Test Discovery Engine** — given a mock repo file tree, verify correct framework detection and test file counting. Test edge cases: monorepos, nested test dirs, mixed frameworks.

2. **Risk Scoring Engine** — given known code with money/availability/side-effect patterns, verify correct classification and severity assignment. Test heuristic accuracy and override behavior.

3. **Test Result Ingestion** — given TRX/JUnit XML samples and raw log output, verify correct parsing of test names, pass/fail status, and duration. Test flaky detection logic with known flap sequences.

4. **DOR Lifecycle Manager** — verify Jira transition calls are made with correct statuses, approver matching by email works, and workspace isolation holds.

5. **Coverage Scorer** — given known test inventory and entrypoint maps, verify composite score calculation matches expected weights.

**Prior art:** Existing tests in `frontend/src/lib/elastic/poller.test.ts`, `frontend/src/lib/azure-devops/client.test.ts`, `frontend/src/lib/jira/client.test.ts` — all use Vitest with mocked DB and API clients. Same pattern applies here.

## Out of Scope

- **Contract testing** between microservices (inter-service API compatibility verification)
- **Dependency vulnerability scanning** (handled by separate security tooling)
- **External notifications** (Slack/Teams/email) — deferred to post-v1
- **Auto-applying CI changes** — module suggests pipeline modifications but never creates PRs with CI changes
- **Test execution** — module analyzes and reports but never runs tests itself
- **Jira replacement** — Jira remains system of record; devcycle is a UI layer
- **DBT and F# deep analysis** — these languages are being replaced; basic file detection only

## Further Notes

- **Phasing:** v1 focuses on repo labeling, test discovery, presence scoring, CI parsing, result ingestion, dashboard, and DOR integration. v2 adds branch analysis, AI coverage matching, risk scoring, test generation with grill-me, flaky/slow detection, trends, and compliance artifacts.
- **Existing integration points:** ADO client (`frontend/src/lib/azure-devops/client.ts`) and Jenkins client (`frontend/src/lib/jenkins/client.ts`) already handle auth, retries, build logs, and stage fetching. QA module extends these rather than duplicating.
- **DOR workflow reference:** `DevOpsSharedLibrary/src/.../JiraApproval.groovy` defines the full DOR state machine (Created → Deploy to QA → Test in QA → Staging → UAT Review → Production Approved). Devcycle must respect this state machine when pushing transitions.
- **Approver config location:** Each repo's `pipeline.yaml` (or `.devops/pipelines/pipeline.yaml`) contains environment-specific approval users with `emailAddress` as the shared key.
- **Poller pattern:** Follow existing elastic/newrelic poller architecture for periodic test result ingestion.
