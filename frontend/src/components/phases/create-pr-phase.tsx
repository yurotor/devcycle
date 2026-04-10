"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GitPullRequest,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Link2,
} from "lucide-react";
import { type Ticket } from "@/lib/fake-data";

interface CreatePRPhaseProps {
  ticket: Ticket;
  onComplete: () => void;
}

export function CreatePRPhase({ ticket, onComplete }: CreatePRPhaseProps) {
  const [status, setStatus] = useState<"preview" | "creating" | "created">(
    "preview"
  );

  const handleCreate = () => {
    setStatus("creating");
    setTimeout(() => setStatus("created"), 2000);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <GitPullRequest className="w-4 h-4 text-sky" />
          <span className="text-xs font-medium">Create PR</span>
          <span className="text-[10px] text-muted-foreground ml-1">
            Review and create pull request on Azure DevOps
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 max-w-2xl">
          {/* PR preview */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {/* PR header */}
            <div className="px-4 py-3 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <GitPullRequest className="w-4 h-4 text-sky" />
                <span className="text-xs font-medium">
                  feat/FIN-127-idempotency-keys → main
                </span>
              </div>
              <h3 className="text-sm font-semibold">
                Add idempotency keys to all payment endpoints
              </h3>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                <span>payments-api</span>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-emerald">+18 additions</span>
                <span className="text-rose">-4 deletions</span>
                <span className="text-muted-foreground/30">·</span>
                <span>2 files changed</span>
              </div>
            </div>

            {/* Auto-generated description */}
            <div className="p-4 space-y-3">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-medium">
                  Auto-generated description
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                  <p>
                    <strong className="text-foreground">Summary:</strong>{" "}
                    Updates the refund processor to support multi-currency
                    refunds. Refunds are now processed in the original
                    transaction currency with exchange rate display for the
                    user&apos;s local currency.
                  </p>
                  <p>
                    <strong className="text-foreground">Changes:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      Added ExchangeRateClient integration for currency
                      conversion display
                    </li>
                    <li>
                      Modified processRefund() to pass original currency to
                      Stripe API
                    </li>
                    <li>
                      Added currency columns to refund database records
                    </li>
                    <li>Added 4 unit tests covering currency scenarios</li>
                  </ul>
                </div>
              </div>

              <div className="glow-line w-full" />

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Link2 className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">
                    Linked:
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-secondary border border-border font-mono">
                  {ticket.jiraKey}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-secondary border border-border font-mono">
                  PRD: wiki/tickets/{ticket.jiraKey}.md
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            {status === "preview" && (
              <Button
                size="sm"
                className="h-9 text-xs bg-sky text-background hover:bg-sky/90 gap-1.5"
                onClick={handleCreate}
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                Create Pull Request
              </Button>
            )}
            {status === "creating" && (
              <Button size="sm" className="h-9 text-xs bg-sky/50 text-background" disabled>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Creating PR...
              </Button>
            )}
            {status === "created" && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
              >
                <div className="flex items-center gap-1.5 text-emerald">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-medium">
                    PR #247 created successfully
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open in Azure DevOps
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
