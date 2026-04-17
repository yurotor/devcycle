// GET /api/tickets/:id/prd — returns the PRD markdown content

import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getKbRoot } from "@/lib/kb-path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) return Response.json({ error: "Ticket not found" }, { status: 404 });

  if (!ticket.prdPath) {
    return Response.json({ prd: null });
  }

  const fullPath = path.join(getKbRoot(ticket.workspaceId), ticket.prdPath);
  if (!fs.existsSync(fullPath)) {
    return Response.json({ prd: null });
  }

  const prd = fs.readFileSync(fullPath, "utf8");
  return Response.json({ prd });
}
