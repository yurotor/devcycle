import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ─── Workspace ────────────────────────────────────────────────────

export const workspace = sqliteTable("workspace", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  azureOrgUrl: text("azure_org_url").notNull(),
  jiraUrl: text("jira_url"),
  jiraProjectKey: text("jira_project_key"), // e.g. "CLN"
  jiraDoneStatuses: text("jira_done_statuses"), // JSON: string[]
  createdAt: integer("created_at").notNull(),
});

// ─── PATs (encrypted) ─────────────────────────────────────────────

export const pats = sqliteTable("pats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull(),
  service: text("service").notNull(), // 'azure' | 'jira'
  username: text("username"), // email for Jira Cloud auth
  encryptedPat: text("encrypted_pat").notNull(), // hex: ciphertext:authTag
  iv: text("iv").notNull(), // hex
  createdAt: integer("created_at").notNull(),
});

// ─── Repos ────────────────────────────────────────────────────────

export const repos = sqliteTable("repos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull(),
  adoId: text("ado_id"), // Azure DevOps repo ID (null for fake data in slice 1)
  name: text("name").notNull(),
  project: text("project").notNull(),
  defaultBranch: text("default_branch").notNull().default("main"),
  branchOverride: text("branch_override"), // per-repo override
  selected: integer("selected").notNull().default(0), // 0/1 boolean
  lastScanned: integer("last_scanned"), // unix timestamp
  createdAt: integer("created_at").notNull(),
});

// ─── Tickets ──────────────────────────────────────────────────────

export const tickets = sqliteTable("tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull(),
  jiraKey: text("jira_key").notNull(),
  jiraId: text("jira_id"), // Jira internal ID for API calls
  title: text("title").notNull(),
  type: text("type").notNull(), // 'story' | 'bug' | 'task'
  phase: text("phase").notNull().default("analyze"), // WorkflowPhase
  phaseLocked: integer("phase_locked").notNull().default(0), // locked once moved past analyze
  priority: text("priority").notNull(),
  assignee: text("assignee"),
  description: text("description"),
  prdPath: text("prd_path"), // kb/wiki path for the PRD markdown file
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Waves ────────────────────────────────────────────────────────

export const waves = sqliteTable("waves", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticketId: integer("ticket_id").notNull(),
  name: text("name").notNull(),
  orderIndex: integer("order_index").notNull(),
  createdAt: integer("created_at").notNull(),
});

// ─── Tasks ────────────────────────────────────────────────────────

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticketId: integer("ticket_id").notNull(),
  waveId: integer("wave_id"),
  repoId: integer("repo_id"),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // 'pending' | 'in-progress' | 'done'
  dependsOn: text("depends_on"), // JSON: number[]
  branchName: text("branch_name"),
  prUrl: text("pr_url"),
  prNumber: integer("pr_number"),
  implementedManually: integer("implemented_manually").notNull().default(0),
  diff: text("diff"), // JSON: FileDiff[] — stored after Claude generates code
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Jobs ─────────────────────────────────────────────────────────

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull(),
  type: text("type").notNull(), // 'scan' | 'implement'
  status: text("status").notNull().default("pending"), // 'pending' | 'running' | 'done' | 'failed'
  relatedId: integer("related_id"), // repo_id or task_id depending on type
  progress: integer("progress").notNull().default(0), // 0-100
  meta: text("meta"), // JSON: arbitrary metadata
  error: text("error"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Scan Suggestions ─────────────────────────────────────────────

export const scanSuggestions = sqliteTable("scan_suggestions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull(),
  repoId: integer("repo_id"),
  severity: text("severity").notNull(), // 'critical' | 'high'
  category: text("category").notNull(), // 'security' | 'architecture' | 'optimization' | 'bug'
  title: text("title").notNull(),
  description: text("description").notNull(),
  files: text("files"), // JSON: string[]
  dismissed: integer("dismissed").notNull().default(0),
  promotedToTicketId: integer("promoted_to_ticket_id"),
  createdAt: integer("created_at").notNull(),
});

// ─── Interview Notes ──────────────────────────────────────────────

export const interviewNotes = sqliteTable("interview_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull(),
  transcript: text("transcript").notNull(),
  extractedFacts: text("extracted_facts"), // JSON: structured facts
  createdAt: integer("created_at").notNull(),
});

// ─── Review Comments ─────────────────────────────────────────────

export const reviewComments = sqliteTable("review_comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  file: text("file").notNull(),
  line: integer("line").notNull(),
  content: text("content").notNull(),
  priority: text("priority").notNull(), // 'critical' | 'suggestion' | 'nit'
  author: text("author").notNull(), // 'ai' | 'user'
  status: text("status").notNull().default("open"), // 'open' | 'done' | 'deleted'
  createdAt: integer("created_at").notNull(),
});

// ─── Chat Messages ────────────────────────────────────────────────

export const chatMessages = sqliteTable("chat_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticketId: integer("ticket_id").notNull(),
  phase: text("phase").notNull(), // 'analyze' | 'plan'
  role: text("role").notNull(), // 'ai' | 'user'
  content: text("content").notNull(),
  choices: text("choices"), // JSON: string[] | null
  createdAt: integer("created_at").notNull(),
});
