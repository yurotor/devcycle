// POST /api/tickets/:id/review — run AI code review (stub)

import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
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

  const stubComments = [
    {
      id: "rc1",
      file: "src/services/handler.cs",
      line: 42,
      priority: "critical" as const,
      content: "This method lacks null-checking on the input parameter. If `request` is null, this will throw a NullReferenceException in production.",
    },
    {
      id: "rc2",
      file: "src/services/handler.cs",
      line: 87,
      priority: "suggestion" as const,
      content: "Consider extracting this logic into a separate method for testability. The current implementation makes it hard to unit test the retry behavior independently.",
    },
    {
      id: "rc3",
      file: "src/controllers/api.cs",
      line: 15,
      priority: "nit" as const,
      content: "Minor: this using statement could be simplified with a global using directive since it's imported in most files.",
    },
  ];

  // Try real AI review, fall back to stub
  let comments = stubComments;
  try {
    const raw = await complete(
      [{ role: "user", content: `Review the code changes for ticket "${ticket.jiraKey}: ${ticket.title}". Return JSON array of review comments.` }],
      {
        system: "Return valid JSON only. Array of {id, file, line, priority: 'critical'|'suggestion'|'nit', content}.",
        maxTokens: 1024,
        stubResponse: JSON.stringify(stubComments),
      }
    );
    comments = JSON.parse(raw);
  } catch {
    // Use stub
  }

  return Response.json({ comments });
}
