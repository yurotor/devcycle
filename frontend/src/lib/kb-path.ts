import path from "path";

/** Returns the KB root directory for a given workspace. */
export function getKbRoot(workspaceId: number): string {
  return path.join(process.cwd(), "..", "kb", "workspaces", String(workspaceId));
}

/** Returns the top-level KB directory (parent of all workspace KB dirs). */
export function getKbBase(): string {
  return path.join(process.cwd(), "..", "kb");
}
