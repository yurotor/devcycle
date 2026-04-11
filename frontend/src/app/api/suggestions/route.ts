// GET /api/suggestions — return all non-dismissed suggestions

import { db } from "@/lib/db";
import { scanSuggestions, repos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: scanSuggestions.id,
      severity: scanSuggestions.severity,
      category: scanSuggestions.category,
      title: scanSuggestions.title,
      description: scanSuggestions.description,
      files: scanSuggestions.files,
      dismissed: scanSuggestions.dismissed,
      promotedToTicketId: scanSuggestions.promotedToTicketId,
      repoId: scanSuggestions.repoId,
    })
    .from(scanSuggestions)
    .where(eq(scanSuggestions.dismissed, 0));

  // Join repo names
  const repoRows = await db.select({ id: repos.id, name: repos.name }).from(repos);
  const repoMap = new Map(repoRows.map((r) => [r.id, r.name]));

  const suggestions = rows.map((r) => ({
    id: String(r.id),
    repo: r.repoId ? repoMap.get(r.repoId) ?? "unknown" : "unknown",
    severity: r.severity,
    category: r.category,
    title: r.title,
    description: r.description,
    files: r.files ? JSON.parse(r.files) : [],
    promoted: r.promotedToTicketId !== null,
  }));

  return Response.json({ suggestions });
}
