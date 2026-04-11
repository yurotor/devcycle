// GET /api/kb/file?path=raw/COS.Lending.Selling.WebApi/summary.md
// Returns the content of a KB file as plain text.

import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const KB_ROOT = path.join(process.cwd(), "..", "kb");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");

  if (!filePath) {
    return Response.json({ error: "Missing ?path= parameter" }, { status: 400 });
  }

  // Prevent path traversal
  const resolved = path.resolve(KB_ROOT, filePath);
  if (!resolved.startsWith(KB_ROOT)) {
    return Response.json({ error: "Invalid path" }, { status: 400 });
  }

  if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  const content = fs.readFileSync(resolved, "utf8");
  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
