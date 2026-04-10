"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  RotateCcw,
  CheckCircle2,
  Terminal,
  Code2,
  Loader2,
  Hand,
} from "lucide-react";
import { FAKE_DIFF, type Ticket } from "@/lib/fake-data";

interface ImplementPhaseProps {
  ticket: Ticket;
  onComplete: () => void;
}

const FAKE_LOG_LINES = [
  { text: "$ claude-code --task implement-wt3", type: "cmd" },
  { text: "Cloning payments-api to /workspace/payments-api...", type: "info" },
  { text: "Creating branch: feat/FIN-127-idempotency-keys", type: "info" },
  { text: "Reading PRD and task requirements...", type: "info" },
  { text: "Analyzing src/refunds/processor.ts...", type: "info" },
  { text: "Modifying refund processor for multi-currency support...", type: "info" },
  { text: "Adding ExchangeRateClient import...", type: "info" },
  { text: "Updating processRefund() to use original currency...", type: "info" },
  { text: "Adding currency fields to refund creation...", type: "info" },
  { text: "Writing unit tests for RefundProcessor...", type: "info" },
  { text: "  ✓ test: refunds in original currency", type: "success" },
  { text: "  ✓ test: exchange rate display conversion", type: "success" },
  { text: "  ✓ test: handles missing exchange rate gracefully", type: "success" },
  { text: "  ✓ test: idempotency on retry", type: "success" },
  { text: "Running test suite...", type: "info" },
  { text: "  Tests: 4 passed, 0 failed", type: "success" },
  { text: "Committing changes...", type: "info" },
  { text: "Implementation complete ✓", type: "done" },
];

export function ImplementPhase({ ticket, onComplete }: ImplementPhaseProps) {
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [logLines, setLogLines] = useState<typeof FAKE_LOG_LINES>([]);
  const [showDiff, setShowDiff] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const startImplementation = () => {
    setStatus("running");
    setLogLines([]);
    setShowDiff(false);

    FAKE_LOG_LINES.forEach((line, i) => {
      setTimeout(() => {
        setLogLines((prev) => [...prev, line]);
        if (i === FAKE_LOG_LINES.length - 1) {
          setTimeout(() => {
            setStatus("done");
            setShowDiff(true);
          }, 500);
        }
      }, i * 400);
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logLines]);

  const lineColor = (type: string) => {
    switch (type) {
      case "cmd": return "text-cyan";
      case "success": return "text-emerald";
      case "done": return "text-emerald font-medium";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-emerald" />
          <span className="text-xs font-medium">Implement & Test</span>
          <span className="text-[10px] text-muted-foreground ml-1">
            AI writes code and runs tests
          </span>
          {status === "running" && (
            <Loader2 className="w-3.5 h-3.5 text-emerald animate-spin ml-auto" />
          )}
          {status === "done" && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald ml-auto" />
          )}
        </div>
      </div>

      {status === "idle" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-14 h-14 rounded-xl bg-emerald/10 border border-emerald/20 flex items-center justify-center mx-auto">
              <Terminal className="w-6 h-6 text-emerald" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Ready to implement</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                The AI will clone the repo, create a branch, implement the
                changes from the task breakdown, write tests, and commit.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                size="sm"
                className="h-9 text-xs bg-emerald text-background hover:bg-emerald/90 gap-1.5"
                onClick={startImplementation}
              >
                <Play className="w-3.5 h-3.5" />
                Start Implementation
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs gap-1.5"
              >
                <Hand className="w-3.5 h-3.5" />
                Implement Manually
              </Button>
            </div>
          </div>
        </div>
      )}

      {(status === "running" || status === "done") && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Terminal output */}
          <div className="flex-1 bg-[oklch(0.09_0.005_260)] overflow-hidden">
            <div className="px-3 py-1.5 border-b border-border/50 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-rose/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald/60" />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                claude-code — implement
              </span>
            </div>
            <div ref={scrollRef} className="p-3 overflow-auto h-[calc(100%-32px)]">
              <div className="font-mono text-[11px] space-y-0.5">
                {logLines.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={lineColor(line.type)}
                  >
                    {line.text}
                  </motion.div>
                ))}
                {status === "running" && (
                  <span className="text-emerald cursor-blink">█</span>
                )}
              </div>
            </div>
          </div>

          {/* Diff view */}
          {showDiff && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="border-t border-border"
            >
              <div className="px-3 py-1.5 border-b border-border/50 flex items-center gap-2 bg-card">
                <Code2 className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-mono text-muted-foreground">
                  src/refunds/processor.ts
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald/10 text-emerald border border-emerald/20 ml-auto">
                  +18 -4
                </span>
              </div>
              <ScrollArea className="max-h-56">
                <pre className="p-3 text-[10px] font-mono leading-relaxed overflow-x-auto">
                  {FAKE_DIFF.split("\n").map((line, i) => {
                    const color = line.startsWith("+")
                      ? "text-emerald bg-emerald/5"
                      : line.startsWith("-")
                      ? "text-rose bg-rose/5"
                      : line.startsWith("@@")
                      ? "text-violet"
                      : "text-muted-foreground/60";
                    return (
                      <div key={i} className={`px-2 -mx-2 ${color}`}>
                        {line}
                      </div>
                    );
                  })}
                </pre>
              </ScrollArea>
            </motion.div>
          )}

          {status === "done" && (
            <div className="shrink-0 px-4 py-3 border-t border-border flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Re-run with guidance
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
