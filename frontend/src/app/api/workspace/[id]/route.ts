import { db } from "@/lib/db";
import {
  workspace, repos, tickets, tasks, waves, jobs,
  scanSuggestions, chatMessages, interviewNotes,
  reviewComments, pipelineRuns, pipelineStages,
  jenkinsJobMappings,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getKbRoot } from "@/lib/kb-path";
import fs from "fs";

// ─── PATCH /api/workspace/:id ─────────────────────────────────────
// Update workspace name, Jira config, or repos.
//
// Body: { name?, jiraUrl?, jiraProjectKey?, jiraDoneStatuses?, repoIds?: number[] }

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const wsId = parseInt(id, 10);
  if (isNaN(wsId)) return Response.json({ error: "Invalid ID" }, { status: 400 });

  const [ws] = await db.select().from(workspace).where(eq(workspace.id, wsId));
  if (!ws) return Response.json({ error: "Workspace not found" }, { status: 404 });

  const body = await request.json() as {
    name?: string;
    jiraUrl?: string;
    jiraProjectKey?: string;
    jiraDoneStatuses?: string[];
    repoIds?: number[];
  };

  // Update workspace fields
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.jiraUrl !== undefined) updates.jiraUrl = body.jiraUrl;
  if (body.jiraProjectKey !== undefined) updates.jiraProjectKey = body.jiraProjectKey;
  if (body.jiraDoneStatuses !== undefined) updates.jiraDoneStatuses = JSON.stringify(body.jiraDoneStatuses);

  if (Object.keys(updates).length > 0) {
    await db.update(workspace).set(updates).where(eq(workspace.id, wsId));
  }

  // Update repo selection: set selected=1 for provided IDs, selected=0 for others
  if (body.repoIds !== undefined) {
    // Deselect all repos for this workspace
    await db.update(repos).set({ selected: 0 }).where(eq(repos.workspaceId, wsId));
    // Select specified repos
    if (body.repoIds.length > 0) {
      await db.update(repos).set({ selected: 1 }).where(inArray(repos.id, body.repoIds));
    }
  }

  return Response.json({ ok: true });
}

// ─── DELETE /api/workspace/:id ────────────────────────────────────
// Cascade-delete all workspace data. Blocked if it's the last workspace.

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const wsId = parseInt(id, 10);
  if (isNaN(wsId)) return Response.json({ error: "Invalid ID" }, { status: 400 });

  // Check if this is the last workspace
  const allWorkspaces = await db.select({ id: workspace.id }).from(workspace);
  if (allWorkspaces.length <= 1) {
    return Response.json({ error: "Cannot delete the last workspace" }, { status: 400 });
  }

  const [ws] = await db.select().from(workspace).where(eq(workspace.id, wsId));
  if (!ws) return Response.json({ error: "Workspace not found" }, { status: 404 });

  // Get ticket IDs for cascade
  const ticketRows = await db.select({ id: tickets.id }).from(tickets).where(eq(tickets.workspaceId, wsId));
  const ticketIds = ticketRows.map((t) => t.id);

  // Get task IDs for cascade
  let taskIds: number[] = [];
  if (ticketIds.length > 0) {
    const taskRows = await db.select({ id: tasks.id }).from(tasks).where(inArray(tasks.ticketId, ticketIds));
    taskIds = taskRows.map((t) => t.id);
  }

  // Cascade delete in dependency order
  if (taskIds.length > 0) {
    // Pipeline stages → pipeline runs
    const runRows = await db.select({ id: pipelineRuns.id }).from(pipelineRuns).where(inArray(pipelineRuns.taskId, taskIds));
    const runIds = runRows.map((r) => r.id);
    if (runIds.length > 0) {
      await db.delete(pipelineStages).where(inArray(pipelineStages.pipelineRunId, runIds));
    }
    await db.delete(pipelineRuns).where(inArray(pipelineRuns.taskId, taskIds));
    await db.delete(reviewComments).where(inArray(reviewComments.taskId, taskIds));
  }

  if (ticketIds.length > 0) {
    await db.delete(tasks).where(inArray(tasks.ticketId, ticketIds));
    await db.delete(waves).where(inArray(waves.ticketId, ticketIds));
    await db.delete(chatMessages).where(inArray(chatMessages.ticketId, ticketIds));
  }

  await db.delete(tickets).where(eq(tickets.workspaceId, wsId));
  await db.delete(jobs).where(eq(jobs.workspaceId, wsId));
  await db.delete(scanSuggestions).where(eq(scanSuggestions.workspaceId, wsId));
  await db.delete(interviewNotes).where(eq(interviewNotes.workspaceId, wsId));

  // Delete repo associations (and jenkins mappings)
  const repoRows = await db.select({ id: repos.id }).from(repos).where(eq(repos.workspaceId, wsId));
  const repoIds = repoRows.map((r) => r.id);
  if (repoIds.length > 0) {
    await db.delete(jenkinsJobMappings).where(inArray(jenkinsJobMappings.repoId, repoIds));
  }
  await db.delete(repos).where(eq(repos.workspaceId, wsId));

  // Delete workspace
  await db.delete(workspace).where(eq(workspace.id, wsId));

  // Delete KB files on disk
  const kbRoot = getKbRoot(wsId);
  if (fs.existsSync(kbRoot)) {
    fs.rmSync(kbRoot, { recursive: true, force: true });
  }

  return Response.json({ ok: true });
}
