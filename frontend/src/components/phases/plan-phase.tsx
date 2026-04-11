"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Loader2, RefreshCw, ThumbsUp } from "lucide-react";
import { type Ticket } from "@/lib/fake-data";

interface PlanPhaseProps {
  ticket: Ticket;
  onComplete: () => void;
}

export function PlanPhase({ ticket, onComplete }: PlanPhaseProps) {
  const [prd, setPrd] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const autoStartedRef = useRef(false);

  const generatePrd = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/plan/generate`, {
        method: "POST",
      });
      const data = await res.json();
      setPrd(data.prd ?? null);
    } finally {
      setGenerating(false);
    }
  };

  // Auto-generate PRD on mount
  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    generatePrd();
  }, [ticket.id]);

  const approvePrd = async () => {
    setApproving(true);
    try {
      await fetch(`/api/tickets/${ticket.id}/plan/approve`, {
        method: "POST",
      });
      onComplete();
    } finally {
      setApproving(false);
    }
  };

  if (generating) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-violet mb-3" />
        <p className="text-sm text-muted-foreground">Generating PRD...</p>
      </div>
    );
  }

  if (!prd) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-violet mb-3" />
        <p className="text-sm text-muted-foreground">Preparing PRD...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-4 py-3 border-b border-border bg-violet/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-violet" />
          <span className="text-sm font-medium">
            Product Requirements Document
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={generatePrd}
          disabled={generating}
        >
          <RefreshCw className={`w-3 h-3 ${generating ? "animate-spin" : ""}`} />
          Regenerate
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="py-4">
          <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono bg-secondary/50 border border-border rounded-lg p-4">
            {prd}
          </div>
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Review the PRD, then approve to move to Design.
        </p>
        <Button
          size="sm"
          className="h-8 text-sm bg-violet text-background hover:bg-violet/90 gap-1"
          onClick={approvePrd}
          disabled={approving}
        >
          {approving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ThumbsUp className="w-3.5 h-3.5" />
          )}
          Approve PRD
        </Button>
      </div>
    </div>
  );
}
