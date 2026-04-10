First screen:
choose name
select project (only azure devops) + provide PAT (read code, create PR, comment on PR)
[optional] select more projects
select repos from each project
* start scanning repos and asking questions (use appropriate skills, maybe /grill-me)
* the output should be: 
1-summary like "here is what i found out about this project..." 
2-the 3 layers (raw & wiki folders + schema doc) like in this doc https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
3-suggestions about fixes: security, architecture, optimization, potential bugs & logical issues (focus on critical and high priority only)

while this is running (after the interactive part), allow the user to cntinue to the next step which is:
select project (only jira) + provide PAT (read/update tickets)
* loads all the tickets that are not done/won't do
* functionality available on each ticket:
1-analyze - use /grill-me to lead the user with questions using the KB (only business questions at this stage) until ticket has all the extra info required for the next phase (allow to sync that info back to the ticket) - the ux here should be chat-like with multiple choice answers, and free text as an option wherever makes sense
2-plan - use the /write-a-prd skill that will write a plan doc that can be broken into action items, lead the user with questions using the KB, the techincal quesions in this stage
3-design - use the /prd-to-issues skill to create tasks that represent small deliverables, each should inlcude changes in a single repo only, the deliverables should be grouped by "waves" such that each wave contains only task that don't depend on each other (dependencies should flow from later waves to early waves). each task/wave that requires tests in an external repo (like automation or e2e), should include them in the same wave. this part requires smart interactive visualization!
4-implement & test - run for each task or wave, create PR(s) that include unit/intergration tests within the same repo (plus automation or e2e if applies), allow the user to see the code changes (need ux/ui suggestions here) within the task/wave, and the test results
5-create PR - click on whatever looks good to allow auto PR creation
6-review - use the /code-review skill to review a PR, allow the user to sumbit PR comments either automtically or one by one or none at all.
7-done - when PR is approved. we are not monitoring further than that at this stage.

the menu:
* should be obsidian like that allows to see raw & wiki with their subfolders, wiki/md viewer
* task list - kanban board style (the 7 statuses from before) 
* each back and forth on a ticket should be stored in raw and "compiled" to wiki, and indexed