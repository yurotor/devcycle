"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { useState } from "react";
import { type Ticket, PHASE_LABELS } from "@/lib/fake-data";
import { ChoiceChat } from "@/components/choice-chat";

interface AnalyzeChatProps {
  ticket: Ticket;
  onComplete: () => void;
}

export function AnalyzeChat({ ticket, onComplete }: AnalyzeChatProps) {
  const [ready, setReady] = useState(false);

  const autoMsg = ticket.description
    ? `Here's the ticket: "${ticket.title}". ${ticket.description}`
    : `I need to work on: "${ticket.title}". Let's analyze the requirements.`;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <ChoiceChat
          theme="cyan"
          apiUrl={`/api/tickets/${ticket.id}/chat`}
          postExtras={{ phase: "analyze" }}
          autoStartMessage={autoMsg}
          onReady={() => setReady(true)}
          headerText="The AI analyst will walk through each aspect of this ticket one question at a time until it's fully specified."
          placeholder="Answer the question or provide more context..."
        />
      </div>

      {ready && (
        <div className="shrink-0 px-4 py-3 border-t border-emerald/20 bg-emerald/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald" />
            <span className="text-sm text-emerald">
              Analysis complete — ready to generate the implementation plan.
            </span>
          </div>
          <Button
            size="sm"
            className="h-8 text-sm bg-cyan text-background hover:bg-cyan/90 gap-1"
            onClick={onComplete}
          >
            Advance to {PHASE_LABELS["plan"]}
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
