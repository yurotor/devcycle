# PRD: Deploy Monitoring & Auto-Done

## Problem Statement

After DevCycle creates a PR for a task, there is zero visibility into what happens next. The developer must manually check Azure DevOps CI status, then navigate to Jenkins (across three different hosts) to track the CD pipeline through build, test, and deployment stages across multiple environments (dev, QA, Stage, Prod). For tickets with multiple tasks across multiple repos, tracking which PRs have been deployed and which are still in-flight is a constant context-switching burden. There is no automated way to know when a ticket is "fully shipped."

## Solution

Extend DevCycle to automatically monitor the full CI/CD pipeline for every task that has a PR. Once a PR is created, DevCycle polls Jenkins to track the pullRequest pipeline. Once the PR is merged (detected via ADO API), it tracks the autoDeploy pipeline through all environments up to production. Pipeline stages are discovered dynamically from Jenkins, and each stage's status is rendered as a horizontal progression bar on the task card. When a pipeline fails, DevCycle automatically pulls the failed stage's log, runs an AI analysis to explain the failure, and offers three actions: fix & re-push (for code issues), rerun the Jenkins job, or copy the error summary for the DevOps/platform team. When all tasks for a ticket have their autoDeploy pipelines completed successfully, the ticket auto-advances to "done" (with manual override available at any time).

## User Stories

1. As a developer, I want to see the Jenkins pipeline status for my PR directly in DevCycle, so that I don't have to navigate to Jenkins manually.
2. As a developer, I want to see each pipeline stage (build, tests, deploy) as a visual progression bar, so that I can instantly tell where my deployment is at a glance.
3. As a developer, I want DevCycle to automatically detect when my PR is merged, so that it starts tracking the autoDeploy pipeline without any manual action.
4. As a developer, I want to see autoDeploy progress through QA, Stage, and Production environments, so that I know when my code is fully deployed.
5. As a developer, I want to see approval gates (Stage, Prod) as a "waiting for approval" status, so that I understand why the pipeline is paused.
6. As a developer, I want pipeline monitoring to start automatically when a PR is created, so that I don't need to opt in or configure anything.
7. As a developer, I want pipeline monitoring to work for tasks I implemented manually (with my own PR), so that all tasks are tracked equally.
8. As a developer, I want to see an AI-generated analysis when a pipeline fails, so that I can quickly understand what went wrong without reading raw Jenkins logs.
9. As a developer, I want a "Fix & Re-push" button when the AI determines a code failure, so that DevCycle can automatically fix and re-push my code.
10. As a developer, I want a "Rerun Job" button, so that I can retry a failed Jenkins build directly from DevCycle.
11. As a developer, I want a "Copy Error for DevOps" button, so that I can quickly share a clean error summary with the platform team when the failure is infrastructure-related.
12. As a developer, I want to see a link to the Jenkins build UI for every pipeline run, so that I can investigate further when needed.
13. As a developer, I want the kanban board to show an aggregate deploy status per ticket (e.g., "2/3 tasks deployed", "1 pipeline failing"), so that I can see overall ticket progress at a glance.
14. As a developer, I want tickets to auto-advance to "done" when all tasks' autoDeploy pipelines succeed through their final stage, so that I don't have to manually move tickets.
15. As a developer, I want to manually mark a ticket as "done" at any time (overriding the auto-done logic), so that I can handle edge cases like partial deploys or hotfixes.
16. As a developer, I want DevCycle to correctly route API calls to the right Jenkins host (sharedservices, sharedservices-dev, or platform), so that monitoring works across all repos regardless of where their pipelines run.
17. As a developer, I want pipeline stage names to be discovered dynamically from Jenkins (not hardcoded), so that monitoring works correctly even when pipeline definitions change across repos.
18. As a developer, I want descriptive status labels (e.g., "Jenkins Build", "Jenkins Tests", "Jenkins Deploy (QA)") rather than generic "running" statuses, so that I know exactly what's happening.
19. As a developer, I want polling to be efficient (30s intervals for active builds, stopped for completed builds), so that DevCycle doesn't waste resources or hit Jenkins API rate limits.
20. As a developer, I want failed stage logs to be pulled automatically (not the full console, just the failed stage), so that AI analysis is focused and relevant.

## Implementation Decisions

### Data Model

- **`pipelineRuns` table**: Tracks each Jenkins build associated with a task. Fields: id, taskId, repoId, pipelineType ("pullRequest" | "autoDeploy"), jenkinsHost, jenkinsJobPath, jenkinsBuildNumber, status ("pending" | "running" | "success" | "failure" | "aborted"), startedAt, finishedAt.
- **`pipelineStages` table**: Tracks individual stages within a pipeline run, discovered dynamically. Fields: id, pipelineRunId, stageName, stageOrder, status ("pending" | "running" | "success" | "failure" | "paused"), durationMs.
- **`jenkinsJobMappings` table**: Maps repo names to Jenkins job paths and hosts. Populated by parsing DSL groovy files from the `jenkins-pipelines` repo and `pipeline.yaml` from each application repo.
- Jenkins credentials stored via environment variables (two credential sets: sharedservices + platform).

### Jenkins API Integration

- **Authentication**: Azure AD Object ID + API token. One credential set covers both sharedservices and sharedservices-dev hosts. A separate credential set covers the platform host (jenkinslending.platform.aws.crbcloud.com).
- **Read endpoints**: `{jobUrl}/api/json` for build lists, `{buildUrl}/wfapi/describe` for stage discovery, `{buildUrl}/execution/node/{nodeId}/wfapi/log` for failed stage logs.
- **Write endpoints**: `{jobUrl}/build` with crumb header for job reruns. Crumbs fetched via `{host}/crumbIssuer/api/json`.
- **Three Jenkins hosts**:
  - `jenkins.sharedservices.coslendingselling.aws.crbcloud.com` — autoDeploy (always), some pullRequest builds
  - `jenkins.sharedservices-dev.coslendingselling.aws.crbcloud.com` — some pullRequest builds
  - `jenkinslending.platform.aws.crbcloud.com` — UI and contracts repos

### PR-to-Jenkins Build Correlation

- **pullRequest builds**: Match by parsing the PR number from the Jenkins build `displayName` field (format: `#842 - User Name - 79983` where 79983 is the PR number).
- **autoDeploy builds**: Repo-level tracking. After a PR is merged, monitor the next autoDeploy build for that repo. When it succeeds, all merged PRs for that repo are considered deployed.
- **PR merge detection**: Poll ADO PR status API. When PR status changes to "completed" (merged), start autoDeploy monitoring.

### Repo-to-Jenkins Host Discovery

- Primary: Parse `pipeline.yaml` from each repo to determine AWS accounts per pipeline type. Map AWS accounts to Jenkins hosts.
- Fallback: Try all Jenkins hosts for a given job, cache the result in `jenkinsJobMappings`.
- Rule: autoDeploy always runs on the prod sharedservices host (except platform repos). pullRequest host varies per repo.

### Polling Strategy

- 30-second interval for all active monitoring (detecting new builds, tracking in-progress builds).
- Stop polling a build once it reaches a terminal state (success/failure/aborted).
- Stop monitoring a task entirely once autoDeploy succeeds through final stage.
- No polling for tasks without a PR.

### Failure Handling

- On pipeline failure: automatically pull the failed stage's log via Jenkins `wfapi/log` endpoint.
- Feed the log to Claude for AI analysis. The analysis returns: a plain-text summary of what went wrong, a determination of whether it's a code issue or infrastructure issue, and a suggested fix.
- Three user actions available on failure:
  - **Fix & Re-push**: When AI determines it's a code issue DevCycle can fix. Feeds the error back into Claude Code to fix, commit, and push — automatically triggers a new pipeline run.
  - **Rerun Job**: Triggers a Jenkins rebuild via API with crumb authentication.
  - **Copy Error for DevOps**: Extracts the key error message in a clean, shareable format.

### Ticket Auto-Done

- A ticket auto-advances to "done" when ALL of its tasks that have PRs have their autoDeploy pipelines completed successfully through the final stage.
- Manual override: user can set a ticket to "done" at any time regardless of pipeline status.

### UI Design

- **Task cards (implement phase)**: After PR creation, show a pipeline status section with horizontal stage progression bars. One row for pullRequest pipeline, one row for autoDeploy (after merge). Descriptive labels per stage. Failed stages shown in red with expandable AI analysis panel and action buttons. Jenkins build link always visible.
- **Kanban board**: Aggregate deploy indicator per ticket (e.g., "2/3 tasks deployed", "1 pipeline failing").
- **No separate deploy phase**: Deploy status is embedded in task cards within the implement phase, because different tasks in the same ticket can be in different stages simultaneously.

### Architecture — New Modules

1. **Jenkins Client** (`lib/jenkins/client.ts`): HTTP client for Jenkins API. Handles auth, crumb management, retry logic. Follows the same pattern as the existing Azure DevOps client.
2. **Pipeline Monitor Service** (`lib/pipeline/monitor.ts`): Orchestrates polling. Starts/stops monitoring per task. Matches PRs to Jenkins builds. Detects merges. Triggers auto-done.
3. **Pipeline Failure Analyzer** (`lib/pipeline/analyzer.ts`): Pulls failed stage logs, runs AI analysis, returns structured results with suggested actions.
4. **Jenkins Job Mapper** (`lib/jenkins/job-mapper.ts`): Parses DSL groovy files and pipeline.yaml to build repo-to-job mappings. Caches in DB.

### Architecture — Modified Modules

5. **DB Schema** (`lib/db/schema.ts`): New tables as described above.
6. **API Routes**: New routes under `/api/tickets/[id]/pipeline/` for status, rerun, and analysis.
7. **Implement Phase UI**: Task cards extended with pipeline status sections.
8. **Kanban Board**: Aggregate deploy indicators added per ticket.
9. **Ticket API**: Auto-done logic integrated into pipeline status updates.

## Testing Decisions

A good test verifies external behavior through the module's public interface, not implementation details. Tests should be resilient to refactoring — if the internal approach changes but the behavior stays the same, tests should still pass.

### Modules to test:

1. **Jenkins Client**: Mock HTTP responses. Test auth header construction, crumb fetching and inclusion, response parsing for builds/stages/logs, retry on transient failures, correct URL construction for all three hosts.

2. **Pipeline Monitor**: Test PR-to-build matching logic (parsing displayName for PR numbers), state transitions (pending → running → success/failure), merge detection triggering autoDeploy monitoring, auto-done condition (all tasks deployed → ticket moves to done), manual override not blocked by incomplete pipelines.

3. **Pipeline Failure Analyzer**: Test log extraction from correct stage, structured output format (summary, issue type, suggested actions), handling of empty or truncated logs.

4. **Jenkins Job Mapper**: Test DSL groovy file parsing, pipeline.yaml parsing for AWS account → host mapping, fallback discovery when primary mapping fails, caching behavior.

## Out of Scope

- **ADO CI pipeline tracking**: Treated as a black box. Monitoring starts when Jenkins picks up the build, not when ADO CI runs.
- **Triggering approvals from DevCycle**: Stage and Production approval gates are observe-only. DevCycle shows "Awaiting Approval" status but does not provide approve/reject actions.
- **Webhook-based notifications**: Due to localhost deployment, Jenkins cannot push to DevCycle. Polling is used exclusively. Webhooks may be added when DevCycle moves to a hosted environment.
- **Jenkins pipeline configuration or modification**: DevCycle only reads pipeline status; it does not modify pipeline definitions.
- **Non-Jenkins CD systems**: Only Jenkins-based pipelines are supported.

## Further Notes

- **Jenkins credentials**: Stored as environment variables (`JENKINS_SHAREDSERVICES_*` and `JENKINS_PLATFORM_*`). The sharedservices credential (Azure AD Object ID + API token) works for both sharedservices and sharedservices-dev hosts. A separate credential is needed for the platform host.
- **Network access**: Verified that the LVM where DevCycle runs can reach all three Jenkins hosts. Authentication tested and working.
- **Build duration context**: autoDeploy builds take approximately 98 minutes (based on observed `estimatedDuration`). The 30-second polling interval is appropriate for this timescale.
- **jenkins-pipelines repo**: Should be added to the DevCycle knowledge base to enable automatic parsing of job mappings. Already included in the `NEXT_PUBLIC_PROJECTS` list.
- **Future migration**: When DevCycle moves to a hosted AWS environment, polling can be replaced with Jenkins webhooks or SQS event consumption for lower-latency updates.
