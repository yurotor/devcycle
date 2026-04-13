First screen:
choose name
select project (only azure devops) + provide PAT (read code, create PR, comment on PR)
[optional] select more projects
select repos from each project (with default branch override support)
* start scanning repos and asking questions (uses Claude Code CLI for deep analysis, clones repos locally)
* scanning runs in background — user proceeds to Jira setup while scan continues
* the output should be: 
1-summary like "here is what i found out about this project..." 
2-the 3 layers (raw & wiki folders + schema doc) like in this doc https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
3-suggestions about fixes: security, architecture, optimization, potential bugs & logical issues (focus on critical and high priority only) — dismissable or promotable to Jira tickets

while this is running (after the interactive part), allow the user to continue to the next step which is:
select project (only jira) + provide PAT (email + API token, read/update tickets)
* loads all the tickets that are not done/won't do (all types except epics)
* functionality available on each ticket (5-phase workflow):
1-analyze - chat-like interface where AI asks business questions using the KB as context, multiple-choice answers with free-text option, AI determines when ticket has enough detail, phase locks on promotion to plan
2-plan - generates a mid-level PRD (architecture decisions, affected repos, API changes, data model changes, risks), stored as markdown in wiki/, requires approval before advancing
3-design - breaks PRD into tasks grouped into dependency-aware waves (each task = 1 PR in 1 repo, tasks within a wave have no inter-dependencies), displayed as swimlane grid (repos as rows, waves as columns)
4-execute - Claude Code CLI implements each task: clones repo, creates branch (JIRA-KEY/task-slug), writes code + tests, commits. Real-time progress streaming via SSE with live diff preview. Can also mark tasks as "implementing manually" for hand-coded work.
5-done - ticket complete

the menu:
* should be obsidian like that allows to see raw & wiki with their subfolders, wiki/md viewer
* task list - kanban board style (5 columns: Analysis, Plan, Design, Execute, Done) with ticket filter
* each back and forth on a ticket should be stored in raw and "compiled" to wiki, and indexed
* floating scan pill in bottom-right shows background scan progress (scanning/interview/failed/complete states)
