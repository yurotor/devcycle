"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Loader2,
  CheckCircle2,
  Lock,
  Sparkles,
} from "lucide-react";
import { type Ticket } from "@/lib/fake-data";

interface PlanPhaseProps {
  ticket: Ticket;
  onComplete: () => void;
}

const FAKE_PRD = `# PRD: Retry Logic for Failed Bank Transfers

## Problem Statement
Bank transfers occasionally fail due to temporary network issues with partner banks. Currently, these failures require manual intervention from the operations team, causing delays of up to 24 hours for affected customers.

## Solution
Implement automatic retry with exponential backoff for failed bank transfers. The system will retry failed transfers up to 3 times with increasing delays, escalating to manual review only after all retries are exhausted.

## Architecture Decisions

### Retry Strategy
- **Max retries**: 3 attempts
- **Backoff schedule**: 30s → 5min → 30min
- **Retry conditions**: Network timeout, 5xx responses, connection refused
- **Non-retryable**: Insufficient funds, invalid account, compliance block

### Affected Services
- **payments-api**: Core retry logic in the transfer processor
- **shared-libs**: New retry utility with configurable backoff
- **payments-frontend**: Status display for "retrying" state

### Data Model Changes
\`\`\`
ALTER TABLE bank_transfers ADD COLUMN retry_count INT DEFAULT 0;
ALTER TABLE bank_transfers ADD COLUMN next_retry_at TIMESTAMP;
ALTER TABLE bank_transfers ADD COLUMN last_error TEXT;
ALTER TABLE bank_transfers ADD COLUMN status VARCHAR(20); -- 'pending' | 'retrying' | 'failed' | 'completed'
\`\`\`

### API Changes
- \`GET /api/transfers/:id\` — Add retry_count, next_retry_at to response
- \`POST /api/transfers/:id/retry\` — Manual retry trigger (for ops team)

### Key Risks
1. **Duplicate transfers**: Must use idempotency keys for each retry attempt
2. **Bank rate limits**: Some banks rate-limit API calls — respect Retry-After headers
3. **State consistency**: Transfer status must be atomic — use database transactions

## Acceptance Criteria
- Failed transfers automatically retry up to 3 times
- Each retry uses exponential backoff (30s, 5min, 30min)
- Non-retryable errors skip retry and escalate immediately
- Transfer status visible in frontend with retry countdown
- Operations team can manually trigger retry after all auto-retries exhausted
- All retry attempts logged in audit trail
`;

export function PlanPhase({ ticket, onComplete }: PlanPhaseProps) {
  const [status, setStatus] = useState<"generating" | "review" | "approved">(
    "generating"
  );
  const [visibleLines, setVisibleLines] = useState(0);
  const lines = FAKE_PRD.split("\n");

  useEffect(() => {
    if (status !== "generating") return;

    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= lines.length) {
          clearInterval(interval);
          setTimeout(() => setStatus("review"), 500);
          return prev;
        }
        return prev + 2;
      });
    }, 60);

    return () => clearInterval(interval);
  }, [status, lines.length]);

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-violet" />
          <span className="text-xs font-medium">Plan Phase</span>
          <span className="text-[10px] text-muted-foreground ml-1">
            PRD generation — technical decisions
          </span>
          {status === "generating" && (
            <Loader2 className="w-3.5 h-3.5 text-violet animate-spin ml-auto" />
          )}
          {status === "review" && (
            <span className="text-[10px] text-amber ml-auto flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Awaiting approval
            </span>
          )}
          {status === "approved" && (
            <span className="text-[10px] text-emerald ml-auto flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Approved
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-2xl">
          <div className="prose-sm prose-invert">
            {lines.slice(0, visibleLines).map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
              >
                {line.startsWith("# ") ? (
                  <h1 className="text-lg font-bold mt-0 mb-3 text-foreground">
                    {line.replace("# ", "")}
                  </h1>
                ) : line.startsWith("## ") ? (
                  <h2 className="text-sm font-semibold mt-5 mb-2 text-foreground">
                    {line.replace("## ", "")}
                  </h2>
                ) : line.startsWith("### ") ? (
                  <h3 className="text-xs font-semibold mt-4 mb-1.5 text-foreground">
                    {line.replace("### ", "")}
                  </h3>
                ) : line.startsWith("```") ? (
                  <div className="text-[10px] font-mono text-cyan">
                    {line}
                  </div>
                ) : line.startsWith("- ") ? (
                  <div className="text-xs text-muted-foreground ml-3 py-0.5 flex items-start gap-1.5">
                    <span className="text-cyan mt-1 shrink-0">·</span>
                    <span>{line.replace("- ", "")}</span>
                  </div>
                ) : line.match(/^\d+\./) ? (
                  <div className="text-xs text-muted-foreground ml-3 py-0.5">
                    {line}
                  </div>
                ) : line.trim() === "" ? (
                  <div className="h-2" />
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed my-1">
                    {line}
                  </p>
                )}
              </motion.div>
            ))}
            {status === "generating" && (
              <span className="text-cyan cursor-blink">█</span>
            )}
          </div>
        </div>
      </ScrollArea>

      {status === "review" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="shrink-0 px-5 py-3 border-t border-border flex items-center gap-3"
        >
          <div className="flex-1 text-xs text-muted-foreground">
            Review the PRD and approve to proceed to the Design phase.
          </div>
          <Button
            size="sm"
            className="h-8 text-xs bg-violet text-white hover:bg-violet/90 gap-1"
            onClick={() => {
              setStatus("approved");
              setTimeout(onComplete, 800);
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approve PRD
          </Button>
        </motion.div>
      )}
    </div>
  );
}
