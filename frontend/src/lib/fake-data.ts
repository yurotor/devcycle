// ─── Types ───────────────────────────────────────────────────────

export type WorkflowPhase =
  | "analyze"
  | "plan"
  | "design"
  | "implement"
  | "done";

export const PHASE_LABELS: Record<WorkflowPhase, string> = {
  analyze: "Analyze",
  plan: "Plan",
  design: "Design",
  implement: "Implement & Test",
  done: "Done",
};

export const PHASE_COLORS: Record<WorkflowPhase, string> = {
  analyze: "bg-cyan/20 text-cyan border-cyan/30",
  plan: "bg-violet/20 text-violet border-violet/30",
  design: "bg-amber/20 text-amber border-amber/30",
  implement: "bg-emerald/20 text-emerald border-emerald/30",
  done: "bg-muted text-muted-foreground border-border",
};

export const PHASE_DOT_COLORS: Record<WorkflowPhase, string> = {
  analyze: "bg-cyan",
  plan: "bg-violet",
  design: "bg-amber",
  implement: "bg-emerald",
  done: "bg-muted-foreground",
};

export interface Ticket {
  id: string;
  jiraKey: string;
  title: string;
  type: "story" | "bug" | "task";
  phase: WorkflowPhase;
  priority: "critical" | "high" | "medium" | "low";
  assignee?: string;
  description: string;
}

export interface Repo {
  id: string;
  name: string;
  project: string;
  defaultBranch: string;
  languages: string[];
  lastScanned?: string;
  fileCount: number;
}

export interface ScanSuggestion {
  id: string;
  repo: string;
  severity: "critical" | "high";
  category: "security" | "architecture" | "optimization" | "bug";
  title: string;
  description: string;
  files: string[];
}

export interface ChatMessage {
  id: string;
  role: "ai" | "user";
  content: string;
  choices?: string[];
  timestamp: string;
}

export interface KBFile {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: KBFile[];
}

export interface WaveTask {
  id: string;
  title: string;
  repo: string;
  description: string;
  status: "pending" | "in-progress" | "done";
  dependsOn?: string[];
}

export interface Wave {
  id: string;
  name: string;
  tasks: WaveTask[];
}

// ─── Fake Data ───────────────────────────────────────────────────

export const FAKE_REPOS: Repo[] = [
  {
    id: "r1",
    name: "payments-api",
    project: "FinTech Platform",
    defaultBranch: "main",
    languages: ["TypeScript", "Node.js"],
    lastScanned: "2 min ago",
    fileCount: 347,
  },
  {
    id: "r2",
    name: "payments-frontend",
    project: "FinTech Platform",
    defaultBranch: "main",
    languages: ["TypeScript", "React"],
    lastScanned: "2 min ago",
    fileCount: 215,
  },
  {
    id: "r3",
    name: "auth-service",
    project: "FinTech Platform",
    defaultBranch: "develop",
    languages: ["C#", ".NET"],
    lastScanned: "1 min ago",
    fileCount: 182,
  },
  {
    id: "r4",
    name: "shared-libs",
    project: "FinTech Platform",
    defaultBranch: "main",
    languages: ["TypeScript"],
    lastScanned: "1 min ago",
    fileCount: 93,
  },
  {
    id: "r5",
    name: "e2e-tests",
    project: "FinTech Platform",
    defaultBranch: "main",
    languages: ["TypeScript", "Playwright"],
    lastScanned: "30s ago",
    fileCount: 64,
  },
];

export const FAKE_TICKETS: Ticket[] = [
  {
    id: "t1",
    jiraKey: "FIN-142",
    title: "Add multi-currency support for refund processing",
    type: "story",
    phase: "analyze",
    priority: "high",
    assignee: "Sarah K.",
    description:
      "As a user, I want to receive refunds in the original transaction currency so that I don't lose money on exchange rates.",
  },
  {
    id: "t2",
    jiraKey: "FIN-138",
    title: "Fix race condition in concurrent payment webhooks",
    type: "bug",
    phase: "analyze",
    priority: "critical",
    assignee: "Mike R.",
    description:
      "When multiple Stripe webhooks arrive simultaneously for the same payment, duplicate records are created in the database.",
  },
  {
    id: "t3",
    jiraKey: "FIN-135",
    title: "Implement retry logic for failed bank transfers",
    type: "story",
    phase: "plan",
    priority: "high",
    description:
      "Bank transfers occasionally fail due to temporary network issues. We need automatic retry with exponential backoff.",
  },
  {
    id: "t4",
    jiraKey: "FIN-129",
    title: "Migrate payment audit logs to new schema",
    type: "task",
    phase: "design",
    priority: "medium",
    assignee: "Alex T.",
    description:
      "The current audit log schema doesn't capture all required compliance fields. Need to migrate to the new v2 schema.",
  },
  {
    id: "t5",
    jiraKey: "FIN-127",
    title: "Add idempotency keys to all payment endpoints",
    type: "story",
    phase: "implement",
    priority: "high",
    assignee: "Sarah K.",
    description:
      "All payment-related API endpoints need idempotency key support to prevent duplicate transactions.",
  },
  {
    id: "t6",
    jiraKey: "FIN-121",
    title: "Update Stripe SDK to v15 for PCI compliance",
    type: "task",
    phase: "implement",
    priority: "critical",
    assignee: "Mike R.",
    description:
      "Current Stripe SDK v12 reaches EOL next month. Must upgrade to v15 for continued PCI DSS compliance.",
  },
  {
    id: "t7",
    jiraKey: "FIN-118",
    title: "Add rate limiting to public payment API",
    type: "story",
    phase: "implement",
    priority: "high",
    assignee: "Alex T.",
    description:
      "Public-facing payment API endpoints need rate limiting to prevent abuse and ensure fair usage.",
  },
  {
    id: "t8",
    jiraKey: "FIN-115",
    title: "Optimize payment history query performance",
    type: "task",
    phase: "done",
    priority: "medium",
    description:
      "Payment history page loads slowly for accounts with 10k+ transactions. Need to add pagination and indexing.",
  },
  {
    id: "t9",
    jiraKey: "FIN-112",
    title: "Fix decimal precision in currency conversion",
    type: "bug",
    phase: "done",
    priority: "critical",
    description:
      "Currency conversions are losing precision beyond 2 decimal places, causing rounding errors in some currencies.",
  },
];

export const FAKE_SUGGESTIONS: ScanSuggestion[] = [
  {
    id: "s1",
    repo: "payments-api",
    severity: "critical",
    category: "security",
    title: "SQL injection vulnerability in payment search endpoint",
    description:
      "The /api/payments/search endpoint concatenates user input directly into SQL queries without parameterization. This allows attackers to execute arbitrary SQL commands.",
    files: ["src/routes/payments/search.ts", "src/db/queries.ts"],
  },
  {
    id: "s2",
    repo: "auth-service",
    severity: "critical",
    category: "security",
    title: "JWT tokens never expire",
    description:
      "JWT tokens are issued without an expiration claim. Once a token is compromised, it remains valid indefinitely. Add exp claim with reasonable TTL.",
    files: ["src/auth/token-service.cs", "src/config/auth-config.cs"],
  },
  {
    id: "s3",
    repo: "payments-api",
    severity: "high",
    category: "architecture",
    title: "Circular dependency between payment and notification modules",
    description:
      "The payment module imports from notification module and vice versa. This creates tight coupling and makes both modules hard to test in isolation.",
    files: [
      "src/payments/processor.ts",
      "src/notifications/payment-notifier.ts",
    ],
  },
  {
    id: "s4",
    repo: "payments-frontend",
    severity: "high",
    category: "optimization",
    title: "Bundle size 3.2MB — no code splitting on payment flows",
    description:
      "The entire payment flow (checkout, confirmation, receipt, refund) is bundled as a single chunk. Lazy loading these routes would reduce initial load by ~60%.",
    files: ["src/App.tsx", "src/routes/index.tsx"],
  },
  {
    id: "s5",
    repo: "payments-api",
    severity: "high",
    category: "bug",
    title: "Unhandled promise rejection in webhook processor",
    description:
      "The Stripe webhook processor doesn't catch errors from the payment reconciliation step. Failed reconciliations silently drop events.",
    files: ["src/webhooks/stripe-handler.ts"],
  },
];

export const FAKE_KB_TREE: KBFile[] = [
  {
    name: "CLAUDE.md",
    path: "/CLAUDE.md",
    type: "file",
  },
  {
    name: "raw",
    path: "/raw",
    type: "folder",
    children: [
      { name: "INDEX.md", path: "/raw/INDEX.md", type: "file" },
      {
        name: "repos",
        path: "/raw/repos",
        type: "folder",
        children: [
          {
            name: "payments-api",
            path: "/raw/repos/payments-api",
            type: "folder",
            children: [
              {
                name: "file-tree.md",
                path: "/raw/repos/payments-api/file-tree.md",
                type: "file",
              },
              {
                name: "scan-notes.md",
                path: "/raw/repos/payments-api/scan-notes.md",
                type: "file",
              },
              {
                name: "configs",
                path: "/raw/repos/payments-api/configs",
                type: "folder",
                children: [
                  {
                    name: "package.json",
                    path: "/raw/repos/payments-api/configs/package.json",
                    type: "file",
                  },
                  {
                    name: "tsconfig.json",
                    path: "/raw/repos/payments-api/configs/tsconfig.json",
                    type: "file",
                  },
                  {
                    name: "ci-pipeline.yml",
                    path: "/raw/repos/payments-api/configs/ci-pipeline.yml",
                    type: "file",
                  },
                ],
              },
            ],
          },
          {
            name: "payments-frontend",
            path: "/raw/repos/payments-frontend",
            type: "folder",
            children: [
              {
                name: "file-tree.md",
                path: "/raw/repos/payments-frontend/file-tree.md",
                type: "file",
              },
              {
                name: "scan-notes.md",
                path: "/raw/repos/payments-frontend/scan-notes.md",
                type: "file",
              },
            ],
          },
          {
            name: "auth-service",
            path: "/raw/repos/auth-service",
            type: "folder",
            children: [
              {
                name: "file-tree.md",
                path: "/raw/repos/auth-service/file-tree.md",
                type: "file",
              },
              {
                name: "scan-notes.md",
                path: "/raw/repos/auth-service/scan-notes.md",
                type: "file",
              },
            ],
          },
        ],
      },
      {
        name: "tickets",
        path: "/raw/tickets",
        type: "folder",
        children: [
          {
            name: "FIN-142",
            path: "/raw/tickets/FIN-142",
            type: "folder",
            children: [
              {
                name: "analyze-chat.md",
                path: "/raw/tickets/FIN-142/analyze-chat.md",
                type: "file",
              },
            ],
          },
          {
            name: "FIN-135",
            path: "/raw/tickets/FIN-135",
            type: "folder",
            children: [
              {
                name: "analyze-chat.md",
                path: "/raw/tickets/FIN-135/analyze-chat.md",
                type: "file",
              },
              {
                name: "plan-chat.md",
                path: "/raw/tickets/FIN-135/plan-chat.md",
                type: "file",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "wiki",
    path: "/wiki",
    type: "folder",
    children: [
      { name: "INDEX.md", path: "/wiki/INDEX.md", type: "file" },
      { name: "overview.md", path: "/wiki/overview.md", type: "file" },
      {
        name: "architecture.md",
        path: "/wiki/architecture.md",
        type: "file",
      },
      {
        name: "repos",
        path: "/wiki/repos",
        type: "folder",
        children: [
          {
            name: "payments-api.md",
            path: "/wiki/repos/payments-api.md",
            type: "file",
          },
          {
            name: "payments-frontend.md",
            path: "/wiki/repos/payments-frontend.md",
            type: "file",
          },
          {
            name: "auth-service.md",
            path: "/wiki/repos/auth-service.md",
            type: "file",
          },
        ],
      },
      {
        name: "tickets",
        path: "/wiki/tickets",
        type: "folder",
        children: [
          {
            name: "FIN-135.md",
            path: "/wiki/tickets/FIN-135.md",
            type: "file",
          },
        ],
      },
    ],
  },
  {
    name: "schema",
    path: "/schema",
    type: "folder",
    children: [
      { name: "schema.json", path: "/schema/schema.json", type: "file" },
      { name: "schema.md", path: "/schema/schema.md", type: "file" },
    ],
  },
];

export const FAKE_KB_CONTENT: Record<string, string> = {
  "/CLAUDE.md": `# FinTech Platform — Knowledge Base

> Auto-generated by DevCycle scan on 2026-04-10

## Quick Links
- [Wiki Index](wiki/INDEX.md) — compiled documentation
- [Raw Index](raw/INDEX.md) — raw scan artifacts
- [Schema](schema/schema.md) — codebase structure

## Repositories
| Repo | Language | Status |
|------|----------|--------|
| payments-api | TypeScript/Node.js | Scanned |
| payments-frontend | TypeScript/React | Scanned |
| auth-service | C#/.NET | Scanned |
| shared-libs | TypeScript | Scanned |
| e2e-tests | TypeScript/Playwright | Scanned |

## Critical Findings
- 2 critical security issues found
- 3 high-priority improvements identified
`,
  "/wiki/overview.md": `# FinTech Platform — Overview

## What is this?
A payment processing platform that handles multi-currency transactions, bank transfers, and card payments for B2B clients. The system processes ~50,000 transactions/day across 12 currencies.

## Architecture
The platform follows a microservices architecture with 5 core services:

1. **payments-api** — Core payment processing engine (Node.js/TypeScript)
2. **payments-frontend** — Customer-facing payment portal (React/TypeScript)
3. **auth-service** — Authentication & authorization (.NET/C#)
4. **shared-libs** — Shared utilities, types, and SDK clients
5. **e2e-tests** — End-to-end test suite (Playwright)

## Data Flow
\`\`\`
Client → payments-frontend → payments-api → Stripe/Bank APIs
                                ↓
                          auth-service (JWT validation)
                                ↓
                          PostgreSQL + Redis
\`\`\`

## Key Dependencies
- **Stripe SDK v12** (⚠️ reaching EOL — upgrade needed)
- **PostgreSQL 15** — primary data store
- **Redis 7** — session cache + rate limiting
- **Azure Service Bus** — async event processing
`,
  "/wiki/architecture.md": `# Architecture Deep Dive

## Service Communication
Services communicate via:
- **REST APIs** — synchronous request/response
- **Azure Service Bus** — async event-driven messaging
- **Shared PostgreSQL** — payments-api is the primary writer

## Authentication Flow
1. Client authenticates via auth-service → receives JWT
2. JWT passed in Authorization header to all subsequent requests
3. payments-api validates JWT signature (shared secret)
4. ⚠️ **Issue**: JWTs have no expiration claim

## Database Schema (payments-api)
- \`payments\` — core payment records
- \`refunds\` — refund tracking
- \`audit_logs\` — compliance audit trail (v1 schema — migration needed)
- \`webhooks\` — inbound webhook event log
- \`idempotency_keys\` — duplicate request prevention

## CI/CD Pipeline
- Azure DevOps Pipelines
- PR → Build → Unit Tests → Integration Tests → Deploy to Staging
- Manual approval gate for production
`,
  "/wiki/repos/payments-api.md": `# payments-api

## Overview
Core payment processing engine built with Node.js and TypeScript. Handles payment creation, processing, refunds, and webhook management.

## Tech Stack
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL 15
- **Queue**: Azure Service Bus
- **Payment Provider**: Stripe SDK v12

## Key Modules
| Module | Purpose | Files |
|--------|---------|-------|
| payments | Payment CRUD + processing | 23 files |
| refunds | Refund processing | 8 files |
| webhooks | Stripe webhook handling | 5 files |
| notifications | Email/SMS notifications | 7 files |
| audit | Compliance audit logging | 4 files |

## API Endpoints
- \`POST /api/payments\` — Create payment
- \`GET /api/payments/:id\` — Get payment
- \`POST /api/payments/:id/refund\` — Process refund
- \`GET /api/payments/search\` — Search payments ⚠️ SQL injection risk
- \`POST /api/webhooks/stripe\` — Stripe webhook receiver

## Known Issues
- SQL injection in search endpoint (critical)
- Circular dependency: payments ↔ notifications
- Unhandled promise rejection in webhook processor
`,
};

export const FAKE_ANALYZE_CHAT: ChatMessage[] = [
  {
    id: "m1",
    role: "ai",
    content:
      "I've reviewed **FIN-142: Add multi-currency support for refund processing** against the knowledge base. The payments-api currently handles refunds through the `refunds` module, but I can see it only processes refunds in USD. Let me ask a few questions to understand the full scope.\n\nFirst — **which currencies need to be supported?**",
    choices: [
      "All 12 currencies we currently accept for payments",
      "Start with EUR, GBP, and CAD only",
      "All currencies supported by Stripe",
      "Other (specify)",
    ],
    timestamp: "2:34 PM",
  },
  {
    id: "m2",
    role: "user",
    content: "All 12 currencies we currently accept for payments",
    timestamp: "2:35 PM",
  },
  {
    id: "m3",
    role: "ai",
    content:
      'Good. The KB shows the platform processes 12 currencies. Next — **should the refund always be in the original transaction currency, or can the user choose a different currency?**\n\nContext: Stripe supports refunds in the original charge currency by default. Allowing a different currency would require a conversion step with exchange rate management.',
    choices: [
      "Always refund in original transaction currency",
      "Allow user to choose, with conversion",
      "Refund in original currency, but show equivalent in user's local currency",
    ],
    timestamp: "2:35 PM",
  },
  {
    id: "m4",
    role: "user",
    content: "Refund in original currency, but show equivalent in user's local currency",
    timestamp: "2:36 PM",
  },
  {
    id: "m5",
    role: "ai",
    content:
      "Smart approach — avoids exchange rate risk while keeping the UX clear. That means we need an exchange rate source for display purposes.\n\n**Where should exchange rates come from?**",
    choices: [
      "Stripe's built-in exchange rates",
      "European Central Bank (ECB) — free, daily updates",
      "We already have an exchange rate service internally",
      "Other (specify)",
    ],
    timestamp: "2:36 PM",
  },
];

export const FAKE_WAVES: Wave[] = [
  {
    id: "w1",
    name: "Wave 1 — Foundation",
    tasks: [
      {
        id: "wt1",
        title: "Add currency field to refunds table",
        repo: "payments-api",
        description:
          "Add original_currency and display_currency columns to the refunds table. Create migration.",
        status: "done",
      },
      {
        id: "wt2",
        title: "Create exchange rate service client",
        repo: "shared-libs",
        description:
          "Create a shared client for fetching exchange rates from ECB API. Cache rates for 1 hour.",
        status: "done",
      },
    ],
  },
  {
    id: "w2",
    name: "Wave 2 — Core Logic",
    tasks: [
      {
        id: "wt3",
        title: "Update refund processor for multi-currency",
        repo: "payments-api",
        description:
          "Modify refund processing to use original transaction currency. Pass currency to Stripe refund API.",
        status: "in-progress",
        dependsOn: ["wt1", "wt2"],
      },
      {
        id: "wt4",
        title: "Add currency display component",
        repo: "payments-frontend",
        description:
          "Create CurrencyDisplay component that shows amount in original currency with local equivalent.",
        status: "pending",
        dependsOn: ["wt2"],
      },
    ],
  },
  {
    id: "w3",
    name: "Wave 3 — Integration",
    tasks: [
      {
        id: "wt5",
        title: "Update refund UI flow",
        repo: "payments-frontend",
        description:
          "Update the refund dialog to show original currency amount with local equivalent preview.",
        status: "pending",
        dependsOn: ["wt3", "wt4"],
      },
      {
        id: "wt6",
        title: "Add multi-currency refund e2e tests",
        repo: "e2e-tests",
        description:
          "Add Playwright tests for refund flow in EUR, GBP, and JPY currencies.",
        status: "pending",
        dependsOn: ["wt3", "wt5"],
      },
    ],
  },
];

export const FAKE_DIFF = `diff --git a/src/refunds/processor.ts b/src/refunds/processor.ts
index 8a2f1d3..e4b7c9a 100644
--- a/src/refunds/processor.ts
+++ b/src/refunds/processor.ts
@@ -1,6 +1,7 @@
 import { stripe } from '../config/stripe';
 import { prisma } from '../config/database';
 import { AuditLogger } from '../audit/logger';
+import { ExchangeRateClient } from '@shared-libs/exchange-rates';

 interface RefundRequest {
   paymentId: string;
@@ -12,15 +13,22 @@ export class RefundProcessor {
   async processRefund(request: RefundRequest): Promise<RefundResult> {
     const payment = await prisma.payment.findUnique({
       where: { id: request.paymentId },
     });

     if (!payment) {
       throw new PaymentNotFoundError(request.paymentId);
     }

-    const refund = await stripe.refunds.create({
-      payment_intent: payment.stripePaymentIntentId,
-      amount: request.amount,
+    // Refund in original transaction currency
+    const originalCurrency = payment.currency;
+    const exchangeRate = await ExchangeRateClient.getRate(
+      originalCurrency,
+      request.displayCurrency ?? 'USD'
+    );
+
+    const stripeRefund = await stripe.refunds.create({
+      payment_intent: payment.stripeIntentId,
+      amount: request.amount,
+      currency: originalCurrency,
     });

     await prisma.refund.create({
@@ -28,6 +36,8 @@ export class RefundProcessor {
         paymentId: payment.id,
         amount: request.amount,
         status: 'processed',
+        originalCurrency,
+        displayCurrency: request.displayCurrency ?? 'USD',
+        exchangeRate: exchangeRate.rate,
       },
     });`;

// ─── Scan progress simulation data ──────────────────────────────

export interface ScanEvent {
  repo: string;
  message: string;
  type: "info" | "success" | "warning" | "finding";
  delay: number;
}

export const SCAN_EVENTS: ScanEvent[] = [
  { repo: "payments-api", message: "Fetching file tree...", type: "info", delay: 0 },
  { repo: "auth-service", message: "Fetching file tree...", type: "info", delay: 200 },
  { repo: "payments-frontend", message: "Fetching file tree...", type: "info", delay: 400 },
  { repo: "payments-api", message: "347 files discovered", type: "success", delay: 1200 },
  { repo: "payments-api", message: "Reading package.json, tsconfig.json...", type: "info", delay: 1800 },
  { repo: "auth-service", message: "182 files discovered", type: "success", delay: 2000 },
  { repo: "payments-frontend", message: "215 files discovered", type: "success", delay: 2200 },
  { repo: "payments-api", message: "Analyzing src/routes/ — 12 API endpoints found", type: "info", delay: 3000 },
  { repo: "auth-service", message: "Reading auth-config.cs, token-service.cs...", type: "info", delay: 3200 },
  { repo: "payments-api", message: "⚠ SQL injection vulnerability in search endpoint", type: "finding", delay: 4000 },
  { repo: "auth-service", message: "⚠ JWT tokens issued without expiration claim", type: "finding", delay: 4500 },
  { repo: "payments-api", message: "Circular dependency detected: payments ↔ notifications", type: "finding", delay: 5200 },
  { repo: "payments-frontend", message: "Analyzing bundle — 3.2MB, no code splitting", type: "finding", delay: 5800 },
  { repo: "payments-api", message: "Unhandled promise rejection in webhook processor", type: "finding", delay: 6400 },
  { repo: "payments-api", message: "Scan complete — generating wiki...", type: "success", delay: 7500 },
  { repo: "auth-service", message: "Scan complete — generating wiki...", type: "success", delay: 8000 },
  { repo: "payments-frontend", message: "Scan complete — generating wiki...", type: "success", delay: 8500 },
  { repo: "payments-api", message: "Wiki generated ✓", type: "success", delay: 9500 },
  { repo: "auth-service", message: "Wiki generated ✓", type: "success", delay: 10000 },
  { repo: "payments-frontend", message: "Wiki generated ✓", type: "success", delay: 10500 },
];
