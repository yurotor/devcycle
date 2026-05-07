# DevCycle — Presentation Plan (15 min)

## Opener (1.5 min)

**Scripted:**

> "SDLC compliance requires design docs, test plans, signoffs at every phase gate. Generating those documents is tedious, so they get skipped or written retroactively. Maintaining them is worse — docs go stale the moment code changes. Tracking signoffs means chasing people. And supervising all of this? Nobody can tell you today which Epics are missing artifacts or which approvals are overdue without manually checking.
>
> On top of that, institutional knowledge lives in people's heads. Architecture decisions, service dependencies, why things were built a certain way — when someone leaves, that context disappears. The documentation that exists is already outdated.
>
> DevCycle solves all of this. It's a single platform that deeply understands your codebase, powers the full engineering workflow from ticket to deployment, and produces compliance artifacts automatically. Let me show you."

**Transition:** Open SDLC Dashboard.

---

## SDLC Compliance Dashboard (3 min)

- Show alert cards: missing design docs, missing test plans, overdue signoffs
- Show phase pipeline: Epics grouped by SDLC phase (Initiation → Disposal)
- Show Epic table: sortable, filterable, status badges (Missing / Draft / Reviewed / Approved)
- Click into an Epic — show the pregenerated design doc
  - **Key point:** "This was generated in 30 seconds. It follows our RFC template — the same structure, the same guiding questions. The AI fills it in using actual codebase knowledge, not generic boilerplate."
  - Show sections: Ownership, Background, Proposal, Risks, Open Questions
  - Mention: section-level editing and regeneration
- Mention test plan generation (same flow, different output)
- Mention signoff tracking: who needs to approve, current status

**Transition:** "The reason these generated docs are actually good — not generic AI output — is because the system deeply understands our code. Let me show you how."

---

## Knowledge Base (3 min)

- Show KB wiki structure: INDEX.md, per-repo pages, architecture pages, cross-cutting flows
- Explain: "We clone repos from ADO, run deep multi-pass analysis. The output is a structured wiki — architecture, data models, API contracts, service boundaries, cross-repo dependencies."
- **Key point:** "This captures institutional knowledge. When a senior engineer leaves, this stays. When a new person joins, they can query it."
- Open KB Chat — ask: "How does the purchase flow work?"
- Show the response: specific repo names, service components, step-by-step flow, technologies
- **Key point:** "That answer would normally require interrupting the one person who built it. Now it's available to everyone — and to the AI when it generates docs."
- **Credibility point:** "This isn't a prototype. Our team has been using the KB, ticket analysis, and chat for day-to-day work — new features, troubleshooting, bug fixes. It's already boosting productivity."

**Transition:** "Let me show you what that workflow looks like day-to-day."

---

## Ticket Lifecycle (3 min)

- Show Kanban board with tickets in various stages
- Walk through a ticket in Analyze phase: AI-guided conversation, clarifying questions
- Show a ticket in Design phase: task breakdown across repos, wave planning
- Show a ticket in Implement phase: deployment tracking, pipeline status inline
- **Integrations:**
  - Jira: tickets sync, status mapping, acceptance criteria pulled in
  - Azure DevOps: repo connections, PR creation
  - Jenkins: build status, stage-level visibility, failure analysis
- **Key point:** "Engineers don't leave the platform. Context flows from ticket to implementation to deployment — no tab-switching."

**Transition:** "Let me wrap up with why this matters for us specifically."

---

## Closing (1.5 min)

**Scripted:**

> "DevCycle serves the full engineering org, top to bottom.
>
> For leadership: real-time compliance visibility. Every Epic's status at a glance. Missing artifacts are flagged before anyone has to ask. Audit prep becomes a non-event — the dashboard is always current.
>
> For engineers: documentation writes itself in 30 seconds instead of 2 hours. The KB answers architecture questions instantly. Pipeline failures come with diagnosis and suggested fixes. The tedious work disappears.
>
> For the organization: institutional knowledge is captured and queryable. It doesn't walk out the door when people leave.
>
> On trust: the AI doesn't hallucinate architecture. It reads our actual repos — code stays on disk in our AWS environment, analyzed locally or through Bedrock in our own account. Nothing leaves our boundary. And generated docs follow our templates, reviewed by humans before signoff.
>
> This isn't a compliance tool bolted on top of engineering. It's the full engineering workflow — and compliance falls out naturally."

---

## Q&A Prep — Anticipated Questions

| Question | Answer |
|---|---|
| "How accurate are the AI-generated docs?" | "The AI reads our actual repos and Jira stories — it's structured synthesis, not creative writing. Every doc shows what context was used. Engineers review before signoff." |
| "Where does our code go?" | "Stays in our AWS environment. Repos cloned from ADO to our infra. AI runs locally via CLI or through Bedrock in our own account. Nothing goes to third parties." |
| "Will engineers actually use it?" | "It removes the work they hate — writing RFCs, test plans, chasing context. The ticket lifecycle gives them structured workflow with AI assistance. It saves time, not adds overhead." |
| "How long to set up?" | "Connect ADO + Jira credentials, select repos, run KB scan. First workspace is operational in under an hour." |
| "Can we see a live generation?" | Trigger a design doc generation live if asked. Takes ~30 seconds to stream. |
| "What about Confluence?" | "Confluence export is on the roadmap — generated docs will push directly to your Confluence instance." |

---

## Timing Summary

| Segment | Duration | Cumulative |
|---|---|---|
| Opener | 1:30 | 1:30 |
| SDLC Dashboard | 3:00 | 4:30 |
| Knowledge Base | 3:00 | 7:30 |
| Ticket Lifecycle | 3:00 | 10:30 |
| Closing | 1:30 | 12:00 |
| **Buffer** | **3:00** | **15:00** |
