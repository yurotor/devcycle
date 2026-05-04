import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import os from "os";
import { migratePatsDropWorkspaceId, migrateToWorkspaces } from "./index";

// Pre-migration DDL: pats table WITH workspace_id (old schema)
const OLD_DDL = `
CREATE TABLE workspace (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  azure_org_url TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE pats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  service TEXT NOT NULL,
  username TEXT,
  encrypted_pat TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`;

let db: InstanceType<typeof Database>;
let tmpDir: string;

beforeEach(() => {
  db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "devcycle-test-"));
});

afterEach(() => {
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("migratePatsDropWorkspaceId", () => {
  it("removes workspace_id column and preserves data", () => {
    db.exec(OLD_DDL);
    db.prepare(
      "INSERT INTO pats (workspace_id, service, username, encrypted_pat, iv, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(1, "azure", null, "enc1", "iv1", 1000);
    db.prepare(
      "INSERT INTO pats (workspace_id, service, username, encrypted_pat, iv, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(1, "jira", "user@test.com", "enc2", "iv2", 2000);

    migratePatsDropWorkspaceId(db);

    const cols = (db.pragma("table_info(pats)") as Array<{ name: string }>).map((c) => c.name);
    expect(cols).not.toContain("workspace_id");
    expect(cols).toContain("service");
    expect(cols).toContain("username");
    expect(cols).toContain("encrypted_pat");
    expect(cols).toContain("iv");

    const rows = db.prepare("SELECT * FROM pats ORDER BY id").all() as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ service: "azure", encrypted_pat: "enc1", iv: "iv1" });
    expect(rows[1]).toMatchObject({ service: "jira", username: "user@test.com", encrypted_pat: "enc2", iv: "iv2" });
  });

  it("is idempotent — no-op if workspace_id already gone", () => {
    db.exec(OLD_DDL);
    migratePatsDropWorkspaceId(db);
    // Run again — should not throw
    migratePatsDropWorkspaceId(db);

    const cols = (db.pragma("table_info(pats)") as Array<{ name: string }>).map((c) => c.name);
    expect(cols).not.toContain("workspace_id");
  });
});

describe("migrateToWorkspaces", () => {
  it("renames workspace to Selling and moves KB files", () => {
    db.exec(OLD_DDL);
    db.prepare("INSERT INTO workspace (name, azure_org_url, created_at) VALUES (?, ?, ?)").run(
      "MyTeam", "https://dev.azure.com/org", 1000
    );

    // Create old KB structure
    const kbRoot = path.join(tmpDir, "kb");
    fs.mkdirSync(path.join(kbRoot, "wiki", "tickets"), { recursive: true });
    fs.mkdirSync(path.join(kbRoot, "raw"), { recursive: true });
    fs.writeFileSync(path.join(kbRoot, "wiki", "tickets", "test.md"), "ticket content");
    fs.writeFileSync(path.join(kbRoot, "raw", "system-synthesis.json"), "{}");

    migrateToWorkspaces(db, kbRoot);

    // Workspace renamed
    const ws = db.prepare("SELECT name FROM workspace WHERE id = 1").get() as { name: string };
    expect(ws.name).toBe("Selling");

    // KB files moved to kb/workspaces/1/
    expect(fs.existsSync(path.join(kbRoot, "workspaces", "1", "wiki", "tickets", "test.md"))).toBe(true);
    expect(fs.existsSync(path.join(kbRoot, "workspaces", "1", "raw", "system-synthesis.json"))).toBe(true);

    // Old dirs gone
    expect(fs.existsSync(path.join(kbRoot, "wiki"))).toBe(false);
    expect(fs.existsSync(path.join(kbRoot, "raw"))).toBe(false);
  });

  it("is idempotent — no-op if workspaces dir exists", () => {
    db.exec(OLD_DDL);
    db.prepare("INSERT INTO workspace (name, azure_org_url, created_at) VALUES (?, ?, ?)").run(
      "MyTeam", "https://dev.azure.com/org", 1000
    );

    const kbRoot = path.join(tmpDir, "kb");
    fs.mkdirSync(path.join(kbRoot, "workspaces", "1", "wiki"), { recursive: true });
    fs.writeFileSync(path.join(kbRoot, "workspaces", "1", "wiki", "existing.md"), "keep me");

    migrateToWorkspaces(db, kbRoot);

    // Existing files untouched
    expect(fs.readFileSync(path.join(kbRoot, "workspaces", "1", "wiki", "existing.md"), "utf8")).toBe("keep me");

    // Workspace name NOT changed again (migration skipped)
    const ws = db.prepare("SELECT name FROM workspace WHERE id = 1").get() as { name: string };
    expect(ws.name).toBe("MyTeam");
  });

  it("handles no workspace gracefully", () => {
    db.exec(OLD_DDL);
    const kbRoot = path.join(tmpDir, "kb");

    migrateToWorkspaces(db, kbRoot);

    // Just creates workspaces dir
    expect(fs.existsSync(path.join(kbRoot, "workspaces"))).toBe(true);
  });
});
