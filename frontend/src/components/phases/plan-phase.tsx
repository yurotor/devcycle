"use client";

import { useState } from "react";
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

  if (!prd && !generating) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-violet/10 border border-violet/20 flex items-center justify-center mx-auto">
            <FileText className="w-5 h-5 text-violet" />
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-sm">Generate PRD</h3>
            <p className="text-xs text-muted-foreground">
              AI will generate a Product Requirements Document based on the
              analysis conversation.
            </p>
          </div>
          <Button
            className="bg-violet text-background hover:bg-violet/90 text-xs h-9"
            onClick={generatePrd}
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Generate PRD
          </Button>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-violet mb-3" />
        <p className="text-xs text-muted-foreground">Generating PRD...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-4 py-3 border-b border-border bg-violet/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-violet" />
          <span className="text-[11px] font-medium">
            Product Requirements Document
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[10px] gap-1"
          onClick={generatePrd}
          disabled={generating}
        >
          <RefreshCw className={`w-3 h-3 ${generating ? "animate-spin" : ""}`} />
          Regenerate
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="py-4">
          <div className="text-xs leading-relaxed whitespace-pre-wrap font-mono bg-secondary/50 border border-border rounded-lg p-4">
            {prd}
          </div>
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Review the PRD, then approve to move to Design.
        </p>
        <Button
          size="sm"
          className="h-8 text-xs bg-violet text-background hover:bg-violet/90 gap-1"
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
