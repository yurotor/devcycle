// GET /api/kb/tree
// Returns the kb/ directory tree as JSON, matching the KBFile shape
// used by the kb-browser component.

import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const KB_ROOT = path.join(process.cwd(), "..", "kb");

interface KBFile {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: KBFile[];
}

export async function GET() {
  if (!fs.existsSync(KB_ROOT)) {
    return Response.json([]);
  }

  const tree = buildTree(KB_ROOT, "");
  return Response.json(tree);
}

function buildTree(dir: string, relativePath: string): KBFile[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith("."))
    .sort((a, b) => {
      // Folders first, then files, alphabetical within each group
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  const results: KBFile[] = [];

  for (const entry of entries) {
    const entryPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      // Skip the repos/ directory (git clones, not KB output)
      if (entry.name === "repos") continue;

      const children = buildTree(path.join(dir, entry.name), entryPath);
      results.push({
        name: entry.name,
        path: entryPath,
        type: "folder",
        children,
      });
    } else {
      results.push({
        name: entry.name,
        path: entryPath,
        type: "file",
      });
    }
  }

  return results;
}
