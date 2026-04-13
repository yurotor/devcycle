"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight, SkipForward, Loader2 } from "lucide-react";
import { useState } from "react";
import { type Ticket, PHASE_LABELS } from "@/lib/fake-data";
import { ChoiceChat } from "@/components/choice-chat";

interface AnalysisPhaseProps {
  ticket: Ticket;
  onComplete: () => void;
}

export function AnalysisPhase({ ticket, onComplete }: AnalysisPhaseProps) {
  const [ready, setReady] = useState(false);
  const [completing, setCompleting] = useState(false);

  const autoMsg = ticket.description
    ? `Here's the ticket: "${ticket.title}". ${ticket.description}`
    : `I need to work on: "${ticket.title}". Let's analyze the requirements.`;

  const handleComplete = async (skip: boolean) => {
    setCompleting(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/analysis/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skip }),
      });
      if (res.ok) {
        onComplete();
      }
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Always-visible skip button in header */}
      <div className="shrink-0 px-4 py-1.5 border-b border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          AI will explore the codebase and interview you to build a PRD.
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground gap-1"
          onClick={() => handleComplete(true)}
          disabled={completing}
        >
          {completing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <SkipForward className="w-3 h-3" />
          )}
          Skip to {PHASE_LABELS["plan"]}
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChoiceChat
          theme="cyan"
          apiUrl={`/api/tickets/${ticket.id}/analysis/chat`}
          autoStartMessage={autoMsg}
          hideAutoStart
          onReady={() => setReady(true)}
          streamingStatusUrl={`/api/tickets/${ticket.id}/analysis/chat?action=streaming-status`}
          headerText="The AI analyst will explore the codebase and walk through each aspect of this ticket one question at a time."
          placeholder="Answer the question or provide more context..."
        />
      </div>

      {ready && !completing && (
        <div className="shrink-0 px-4 py-3 border-t border-emerald/20 bg-emerald/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald" />
            <span className="text-sm text-emerald">
              Analysis complete — ready to generate the PRD.
            </span>
          </div>
          <Button
            size="sm"
            className="h-8 text-sm bg-cyan text-background hover:bg-cyan/90 gap-1"
            onClick={() => handleComplete(false)}
            disabled={completing}
          >
            {completing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            Generate PRD & Continue
          </Button>
        </div>
      )}

      {completing && (
        <div className="shrink-0 px-4 py-3 border-t border-cyan/20 bg-cyan/5 flex items-center justify-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan" />
          <span className="text-sm text-cyan">Generating PRD...</span>
        </div>
      )}
    </div>
  );
}
