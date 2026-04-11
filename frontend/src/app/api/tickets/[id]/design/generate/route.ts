// POST /api/tickets/:id/design/generate — generate wave/task breakdown

import { db } from "@/lib/db";
import { tickets, waves, tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { complete } from "@/lib/anthropic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) return Response.json({ error: "Ticket not found" }, { status: 404 });

  const now = Date.now();

  // Stub wave/task breakdown
  const stubWaves = [
    {
      name: "Wave 1 — Foundation",
      tasks: [
        { title: "Set up data model changes", description: "Add/modify database schema as defined in PRD", repo: "backend" },
        { title: "Add configuration and feature flags", description: "Set up feature flags for gradual rollout", repo: "backend" },
      ],
    },
    {
      name: "Wave 2 — Core Implementation",
      tasks: [
        { title: "Implement core business logic", description: "Build the main service logic per PRD requirements", repo: "backend" },
        { title: "Add API endpoints", description: "Create/modify API endpoints with validation and error handling", repo: "backend" },
        { title: "Update frontend components", description: "Wire UI to new endpoints, add necessary views", repo: "frontend" },
      ],
    },
    {
      name: "Wave 3 — Testing & Polish",
      tasks: [
        { title: "Add unit and integration tests", description: "Cover new business logic and API endpoints with tests", repo: "backend" },
        { title: "Add E2E tests", description: "End-to-end tests for critical user flows", repo: "e2e" },
        { title: "Update documentation", description: "API docs, README updates, architecture diagrams", repo: "docs" },
      ],
    },
  ];

  // Try AI generation, fall back to stub
  let waveData = stubWaves;
  try {
    const raw = await complete(
      [{ role: "user", content: `Generate a wave-based task breakdown for: "${ticket.title}". Return JSON array of waves.` }],
      {
        system: "Return valid JSON only. Array of {name, tasks: [{title, description, repo}]}",
        maxTokens: 1024,
        stubResponse: JSON.stringify(stubWaves),
      }
    );
    waveData = JSON.parse(raw);
  } catch {
    // Use stub
  }

  // Clear existing waves/tasks for this ticket
  await db.delete(tasks).where(eq(tasks.ticketId, ticketId));
  await db.delete(waves).where(eq(waves.ticketId, ticketId));

  // Save waves and tasks to DB
  const result = [];
  for (let i = 0; i < waveData.length; i++) {
    const w = waveData[i];
    const [wave] = await db.insert(waves).values({
      ticketId,
      name: w.name,
      orderIndex: i,
      createdAt: now,
    }).returning({ id: waves.id });

    const waveTasks = [];
    for (const t of w.tasks) {
      const [task] = await db.insert(tasks).values({
        ticketId,
        waveId: wave.id,
        title: t.title,
        description: t.description,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      }).returning();

      waveTasks.push({ id: task.id, ...t, status: "pending", waveId: wave.id });
    }

    result.push({ id: wave.id, name: w.name, orderIndex: i, tasks: waveTasks });
  }

  return Response.json({ waves: result });
}
