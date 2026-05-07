---
name: build-kb
description: Build a knowledge base from a set of source code repositories. Clones repos, deeply analyzes each one, synthesizes cross-repo understanding, interviews the user to fill knowledge gaps, and compiles a structured wiki. Use this skill whenever the user wants to create a knowledge base, analyze a set of repositories, build documentation from code, understand how multiple repos work together, or says "build kb" / "create knowledge base" / "analyze these repos". Also use when the user provides a list of repositories and wants them documented or understood as a system.
---

# Build Knowledge Base from Repositories

You are building a structured knowledge base from a set of source code repositories. The goal is to produce documentation thorough enough that someone (human or AI) reading it can analyze tickets, plan features, estimate impact, and onboard to the system — without needing to read the source code directly.

The process has 7 phases. Work through them in order, but adapt based on what you find. This is a long-running task — keep the user informed of progress throughout.

**Context management**: You'll be reading a lot of code. Don't try to hold everything in memory. Analyze one repo at a time, write outputs immediately, then work from the written summaries for cross-repo synthesis. The raw JSON files you produce ARE your working memory for later phases.

## Phase 0: Gather inputs

You need three things from the user before starting. If any are missing, ask.

1. **Repository list** — repo names (e.g. `my-api, my-frontend, my-shared-lib`)
2. **Clone URL pattern** — a base URL where `{repo}` gets substituted (e.g. `https://dev.azure.com/org/project/_git/{repo}` or `git@github.com:org/{repo}.git`)
3. **Local root folder** — where repos should be cloned to (e.g. `kb/repos`)

If the user provides a base URL and a comma-separated list, construct clone URLs by appending each repo name to the base URL.

Optional inputs (ask if not provided):
- **Auth** — if cloning requires a PAT or SSH key, ask how to authenticate. For Azure DevOps HTTPS, the pattern is `https://{PAT}@dev.azure.com/...`. Never store the PAT in any output file.
- **KB output folder** — where to write the knowledge base (default: `kb/` as a sibling of the repos folder)

## Phase 1: Clone repositories

For each repo in the list:

1. Check if `{local_root}/{repo_name}/.git` already exists
2. If yes, skip it (log "already cloned")
3. If no, run: `git clone --depth 1 {clone_url} {local_root}/{repo_name}`

Clone repos sequentially. If a clone fails, log the error and continue with the rest — don't abort the whole process.

After cloning, report: "Cloned X repos, Y already existed, Z failed" and list any failures.

## Phase 2: Deep per-repo analysis

Analyze each repo one at a time. For each repo:

### Step 2a: Survey the repo

- Read the file tree (skip `.git`, `node_modules`, `vendor`, `bin`, `obj`, `.vs`, `dist`, `build`)
- Identify the tech stack from config files (package.json, .csproj, requirements.txt, go.mod, pom.xml, Cargo.toml, etc.)
- Identify the repo type: API/backend, frontend/UI, database/migrations, infrastructure-as-code, library/SDK, data pipeline, test suite, etc.

### Step 2b: Read key files

Select up to 30 files to read, prioritizing:
1. Entry points and config: README.md, package.json, Startup.cs, Program.cs, main.py, app.py, index.ts, docker-compose.yml, appsettings.json, Dockerfile, terraform main.tf
2. Business logic: files matching Controller, Service, Handler, Processor, Manager, Worker, Repository, Entity, Model, Migration, dag, pipeline, task patterns
3. Remaining source files (.ts, .py, .cs, .go, .java, .rs, etc.) — skip tests, specs, and minified files

For large files, read the first ~200 lines to get the structure, then skim for key patterns.

### Step 2c: Produce the analysis

For each repo, produce a structured analysis covering:

- **purpose**: 2-3 sentences on what this repo does and its role in the larger system
- **businessFeatures**: list of business capabilities this repo implements
- **apis**: endpoints with method, path, and purpose (for API repos)
- **dependencies**: other repos/services this repo depends on, with type (http, messaging, shared-lib, database)
- **dataEntities**: key data models/entities with descriptions
- **messagingPatterns**: queues, topics, events, outbox patterns
- **integrations**: external systems with direction and protocol
- **architecturePatterns**: design patterns used (CQRS, repository pattern, etc.)
- **techStack**: languages, frameworks, tools
- **findings**: critical/high severity issues (security, architecture, optimization, bugs) — only flag things that matter
- **ambiguities**: concrete things you found in the code but couldn't resolve. Each must name a specific service, config value, entity, or code reference. NOT vague questions about "how does X work" — specific gaps like "References 'VampireClient' in LoanController but the Vampire system's purpose is unknown"

Adapt your focus to the repo type:
- **Infrastructure-as-code**: environments, resources, networking, service wiring, secrets
- **Frontend**: screens, user flows, API calls, state management
- **Backend API**: endpoints, auth, request/response contracts, downstream calls
- **Database**: tables, relationships, indexes, stored procedures, migrations
- **Data pipeline**: DAG structure, data sources/sinks, scheduling, transformations

### Step 2d: Write outputs

Create the output directory `{kb_root}/raw/{repo_name}/` and write:

1. **analysis.json** — the structured analysis as JSON matching the schema above
2. **analysis.md** — human-readable markdown version with sections for each field
3. **INDEX.md** — simple index pointing to the two files with a generation timestamp

After each repo, briefly report what you found (purpose, notable findings, key ambiguities).

## Phase 3: Cross-repo synthesis

Once all repos are analyzed, synthesize the system-level view. You've already written analysis.json for each repo — read those back (not the source code) to build the cross-repo picture. This happens in layers:

### Layer 1: Build repo digests

For each repo, extract a compact digest: name, purpose, features, dependencies, entities, external systems, message patterns, ambiguities. Write to `{kb_root}/raw/repo-digests.json`.

### Layer 2: Detect functional clusters

Group repos into clusters of 2-3 that work closely together (shared dependencies, entities, caller/callee relationships). Also identify 3-5 end-to-end business flows that span multiple repos. Write to `{kb_root}/raw/cluster-plan.json`.

### Layer 3: Analyze clusters

For each cluster, analyze how the repos work together:
- Shared entities and how they flow between repos
- Data flows end-to-end
- Integration points (repo-to-repo communication mechanisms)
- Shared patterns
- Remaining ambiguities

Write each to `{kb_root}/raw/clusters/{cluster-slug}.json`.

### Layer 4: Analyze business flows

For each business flow, trace the end-to-end path:
- Description of the flow
- Step-by-step sequence
- Repos involved
- Entities touched
- External systems
- Ambiguities

Write each to `{kb_root}/raw/flows/{flow-slug}.json`.

### Layer 5: Final assembly

Produce the system synthesis combining everything:
- **systemOverview**: 2-3 paragraphs describing the whole system
- **serviceMap**: each repo's role and what it communicates with
- **features**: business features with which repos implement them
- **dataFlows**: how data moves through the system
- **integrations**: all external system touchpoints
- **dataModel**: consolidated entity documentation
- **architecturePatterns**: patterns used across repos
- **ambiguities**: gaps that remain unresolved even after cross-referencing all repos

Write to `{kb_root}/raw/system-synthesis.json`.

## Phase 4: Interview the user

This is the most important phase. The code tells you _what_ the system does mechanically, but the user knows _why_ — business rules, domain terminology, historical decisions, and the things that aren't in the code. A KB without this context is just a glorified file tree.

### Prepare your question list

Before starting the interview, read through all the ambiguities from phases 2 and 3. Categorize and prioritize them:

**Priority 1 — Blocking gaps** (answers that would unlock understanding of multiple other things):
- Unknown external systems referenced in code (e.g., "What is the Vampire system?")
- Unclear relationships between core entities that appear across many repos
- Business flows you can see the mechanics of but can't explain the purpose of

**Priority 2 — Business meaning** (code works but you don't know what it means):
- Generic field names (field1-field21), numeric status codes, magic config values
- Domain terminology — acronyms, abbreviations, terms-of-art
- Business rules embedded in validation logic or state machines
- Why certain architectural decisions were made (when it affects how you'd document the system)

**Priority 3 — Coverage gaps** (things that might exist but aren't in the code):
- Manual processes or workflows that complement the automated system
- Admin operations, reporting, or operational tooling
- Planned vs. deprecated features (is this dead code, or coming soon?)
- How data enters and exits the system boundaries

### How to interview

- Ask questions **one at a time** — don't dump a list of 20 questions
- Start with Priority 1, then work down
- Be specific: "In COS.Lending.Selling.WebApi, the GroomingStatus field uses values 1-5 — what do these mean?" is good. "How does loan processing work?" is bad.
- If the user's answer reveals new questions, follow up immediately
- If the user says "I don't know" or "skip", move on without dwelling
- If the user says "that's enough" or seems done, wrap up gracefully — summarize what you learned and note remaining gaps
- Aim for thoroughness — keep going until you've covered all major gaps. This could be 5 questions or 50 depending on the system's complexity.
- After each answer, briefly confirm your understanding before moving on
- Group related questions when it makes sense (e.g., "While we're on the topic of loan transfers...")

### After the interview

Save the full interview transcript to `{kb_root}/raw/interview-notes.json` with both a readable `transcript` field and a structured `messages` array.

## Phase 5: Re-synthesize with interview context

Re-run the synthesis (Phase 3, layers 3-5) incorporating the interview answers. The user's answers take precedence over code-derived assumptions. Update all the JSON files in `raw/`.

## Phase 6: Compile the wiki

Transform the raw analysis into a topic-organized wiki with bidirectional links. Create these sections:

### Wiki structure

```
{kb_root}/wiki/
  INDEX.md              — master index of all pages
  manifest.json         — title → path mapping for link resolution
  architecture/
    system-overview.md  — system description + repo list
    service-map.md      — which repos talk to which
    data-flows.md       — how data moves through the system
    patterns.md         — architecture patterns across repos
  flows/
    {flow-slug}.md      — one page per business flow
  clusters/
    {cluster-slug}.md   — one page per functional cluster
  features/
    {feature-slug}.md   — one page per business feature
  integrations/
    overview.md         — all external system integrations
  data-model/
    entities.md         — consolidated entity documentation
  repos/
    {repo-slug}.md      — deep reference page per repo
```

### Wiki page guidelines

- Every page should link to related pages using relative paths
- Repo pages should link to the features they implement and the clusters they belong to
- Feature pages should link back to the repos that implement them
- Use tables for structured data (APIs, entities, dependencies)
- Include a "See also" section at the bottom of each page with related links

### CLAUDE.md

Write a `{kb_root}/CLAUDE.md` that serves as the entry point for anyone (human or AI) reading the KB. It should contain:
- A 2-paragraph system overview
- Links to each wiki section
- A list of all repositories with links to their wiki pages
- A generation timestamp

### Final report

After compilation, report to the user:
- Total repos analyzed
- Total wiki pages generated
- Total findings (critical + high)
- Number of ambiguities resolved via interview
- Number of remaining unresolved ambiguities
- Suggest next steps (e.g., "There are 3 unresolved ambiguities about external systems — would you like to do another interview round?")

## Reference: Output schemas

See [references/schemas.md](references/schemas.md) for the exact JSON schemas for all output files.

## Handling large systems

For systems with many repos (10+), the analysis will take significant time. Keep the user informed:
- Report progress after each repo analysis completes
- Don't try to hold all file contents in memory — analyze one repo at a time, write results, move on
- For the synthesis phases, work from the analysis JSONs you already wrote — don't re-read source code

### Parallelism with subagents

If you have access to the Agent tool, you can speed up Phase 2 dramatically by spawning subagents to analyze repos in parallel (3-4 at a time). Each subagent should:
1. Receive the repo path and KB output path
2. Read the repo's files
3. Write analysis.json, analysis.md, and INDEX.md
4. Return a brief summary

After all subagents complete, read their outputs and proceed to Phase 3. The synthesis phases should NOT be parallelized — they need the full picture.

## Incremental updates

If the KB already exists (raw/ directory has analysis files), check for changes:
- Compare git HEAD hash of each repo against `_headHash` in its analysis.json
- Skip repos that haven't changed
- Re-run synthesis only if any repo analysis changed or the user requests it
- Report which repos were updated vs. skipped
