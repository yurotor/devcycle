// POST /api/tickets/:id/implement — start/complete/manual/create-pr for a task
// GET  /api/tickets/:id/implement — get implementation status or diff

import { db } from "@/lib/db";
import { tickets, tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// ─── Stub diff generator ──────────────────────────────────────────

function generateStubDiff(task: { id: number; title: string; branchName: string | null }) {
  const slug = (task.title ?? "task")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 30);

  const files = [
    {
      path: `src/Services/${slug}.service.ts`,
      status: "modified" as const,
      hunks: [
        {
          oldStart: 12,
          newStart: 12,
          lines: [
            " import { Injectable } from '@nestjs/common';",
            " ",
            "-export class OldService {",
            "+export class UpdatedService {",
            "+  private readonly logger = new Logger();",
            " ",
            "   constructor(",
            "-    private readonly repo: Repository,",
            "+    private readonly repo: Repository,",
            "+    private readonly eventBus: EventBus,",
            "   ) {}",
            " ",
            "-  async process(id: number) {",
            "-    const entity = await this.repo.findOne(id);",
            "-    return entity;",
            "+  async process(id: number) {",
            "+    const entity = await this.repo.findOne(id);",
            "+    if (!entity) {",
            "+      throw new NotFoundException(`Entity ${id} not found`);",
            "+    }",
            "+    this.eventBus.emit('entity.processed', { id });",
            "+    return entity;",
            "   }",
          ],
        },
      ],
    },
    {
      path: `src/Models/${slug}.model.ts`,
      status: "added" as const,
      hunks: [
        {
          oldStart: 0,
          newStart: 1,
          lines: [
            "+import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';",
            "+",
            "+@Entity()",
            "+export class " + slug.replace(/-/g, "") + " {",
            "+  @PrimaryGeneratedColumn()",
            "+  id: number;",
            "+",
            "+  @Column()",
            "+  name: string;",
            "+",
            "+  @Column({ type: 'decimal', precision: 10, scale: 2 })",
            "+  amount: number;",
            "+",
            "+  @Column({ default: true })",
            "+  isActive: boolean;",
            "+}",
          ],
        },
      ],
    },
    {
      path: `src/Tests/${slug}.spec.ts`,
      status: "added" as const,
      hunks: [
        {
          oldStart: 0,
          newStart: 1,
          lines: [
            "+import { Test, TestingModule } from '@nestjs/testing';",
            "+import { UpdatedService } from '../Services/" + slug + ".service';",
            "+",
            "+describe('UpdatedService', () => {",
            "+  let service: UpdatedService;",
            "+",
            "+  beforeEach(async () => {",
            "+    const module: TestingModule = await Test.createTestingModule({",
            "+      providers: [UpdatedService],",
            "+    }).compile();",
            "+    service = module.get(UpdatedService);",
            "+  });",
            "+",
            "+  it('should process entity', async () => {",
            "+    const result = await service.process(1);",
            "+    expect(result).toBeDefined();",
            "+  });",
            "+",
            "+  it('should throw for missing entity', async () => {",
            "+    await expect(service.process(999)).rejects.toThrow();",
            "+  });",
            "+});",
          ],
        },
      ],
    },
  ];

  return files;
}

// ─── GET ──────────────────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  // Diff request
  if (action === "diff") {
    const taskId = parseInt(url.searchParams.get("taskId") ?? "0", 10);
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      return Response.json({ files: [] });
    }

    // Stub: generate realistic-looking diffs
    const files = generateStubDiff(task);
    return Response.json({ files });
  }

  // Default: return status
  const taskRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.ticketId, ticketId));
  const status = taskRows.every((t) => t.status === "done")
    ? "done"
    : taskRows.some((t) => t.status === "in-progress")
    ? "running"
    : "idle";

  return Response.json({ status, tasks: taskRows });
}

// ─── POST ─────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  const body = await request.json();
  const { action, taskId } = body as {
    action: "start" | "complete" | "manual" | "create-pr";
    taskId?: number;
  };

  if (action === "start") {
    const pendingTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.ticketId, ticketId));

    const target = taskId
      ? pendingTasks.find((t) => t.id === taskId)
      : pendingTasks.find((t) => t.status === "pending");

    if (target) {
      await db
        .update(tasks)
        .set({ status: "in-progress", updatedAt: Date.now() })
        .where(eq(tasks.id, target.id));
    }

    return Response.json({ ok: true, taskId: target?.id });
  }

  if (action === "complete" && taskId) {
    await db
      .update(tasks)
      .set({
        status: "done",
        branchName: `feat/${ticketId}-task-${taskId}`,
        updatedAt: Date.now(),
      })
      .where(eq(tasks.id, taskId));

    return Response.json({ ok: true });
  }

  if (action === "manual" && taskId) {
    await db
      .update(tasks)
      .set({
        implementedManually: 1,
        status: "done",
        updatedAt: Date.now(),
      })
      .where(eq(tasks.id, taskId));

    return Response.json({ ok: true });
  }

  if (action === "create-pr" && taskId) {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    if (!task) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId));

    const prNumber = 300 + taskId;
    const prUrl = `https://dev.azure.com/org/project/_git/repo/pullrequest/${prNumber}`;

    await db
      .update(tasks)
      .set({ prUrl, prNumber, updatedAt: Date.now() })
      .where(eq(tasks.id, taskId));

    return Response.json({
      ok: true,
      pr: {
        number: prNumber,
        url: prUrl,
        title: `${ticket?.jiraKey ?? "TASK"}-${taskId}: ${task.title}`,
      },
    });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
