import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import * as schema from "./schema";

const DB_PATH = path.join(process.cwd(), "devcycle.db");

const DDL = `
CREATE TABLE IF NOT EXISTS workspace (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  azure_org_url TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  service TEXT NOT NULL,
  encrypted_pat TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS repos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  ado_id TEXT,
  name TEXT NOT NULL,
  project TEXT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  branch_override TEXT,
  selected INTEGER NOT NULL DEFAULT 0,
  last_scanned INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  jira_key TEXT NOT NULL,
  jira_id TEXT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'analyze',
  phase_locked INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL,
  assignee TEXT,
  description TEXT,
  prd_path TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS waves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  wave_id INTEGER,
  repo_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  depends_on TEXT,
  branch_name TEXT,
  pr_url TEXT,
  pr_number INTEGER,
  implemented_manually INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  related_id INTEGER,
  progress INTEGER NOT NULL DEFAULT 0,
  meta TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scan_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  repo_id INTEGER,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  files TEXT,
  dismissed INTEGER NOT NULL DEFAULT 0,
  promoted_to_ticket_id INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  phase TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  choices TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS interview_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  transcript TEXT NOT NULL,
  extracted_facts TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS review_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  file TEXT NOT NULL,
  line INTEGER NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL,
  author TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  repo_id INTEGER,
  pipeline_type TEXT NOT NULL,
  jenkins_host TEXT NOT NULL,
  jenkins_job_path TEXT NOT NULL,
  jenkins_build_number INTEGER,
  jenkins_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  failure_analysis TEXT,
  started_at INTEGER,
  finished_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pipeline_run_id INTEGER NOT NULL,
  stage_node_id TEXT,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  duration_ms INTEGER
);

CREATE TABLE IF NOT EXISTS jenkins_job_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL,
  repo_name TEXT NOT NULL,
  pipeline_type TEXT NOT NULL,
  jenkins_host TEXT NOT NULL,
  jenkins_job_path TEXT NOT NULL,
  build_trigger_id TEXT,
  created_at INTEGER NOT NULL
);
`;

// Idempotent column additions — SQLite has no ALTER TABLE IF NOT EXISTS,
// so we ignore "duplicate column" errors from each statement.
const MIGRATIONS = [
  `ALTER TABLE workspace ADD COLUMN jira_url TEXT`,
  `ALTER TABLE workspace ADD COLUMN jira_done_statuses TEXT`,
  `ALTER TABLE workspace ADD COLUMN jira_project_key TEXT`,
  `ALTER TABLE pats ADD COLUMN username TEXT`,
  `ALTER TABLE tasks ADD COLUMN diff TEXT`,
  `ALTER TABLE tickets ADD COLUMN plan_session_id TEXT`,
  `ALTER TABLE tasks ADD COLUMN subtitle TEXT`,
  `ALTER TABLE pipeline_runs ADD COLUMN min_build_number INTEGER`,
  `ALTER TABLE tasks ADD COLUMN todos TEXT`,
];

function createDb() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(DDL);
  for (const migration of MIGRATIONS) {
    try {
      sqlite.exec(migration);
    } catch {
      // Column already exists — safe to ignore
    }
  }
  return drizzle(sqlite, { schema });
}

// Singleton: reuse across hot-reloads in dev
const globalForDb = globalThis as unknown as {
  _devCycleDb: ReturnType<typeof createDb> | undefined;
};

export const db = globalForDb._devCycleDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb._devCycleDb = db;
}
