"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lock,
} from "lucide-react";
import {
  PHASE_LABELS,
  PHASE_COLORS,
  PHASE_DOT_COLORS,
  type Ticket,
  type WorkflowPhase,
} from "@/lib/fake-data";
import { AnalyzeChat } from "@/components/phases/analyze-chat";
import { PlanPhase } from "@/components/phases/plan-phase";
import { DesignPhase } from "@/components/phases/design-phase";
import { ImplementPhase } from "@/components/phases/implement-phase";
import { CreatePRPhase } from "@/components/phases/create-pr-phase";
import { ReviewPhase } from "@/components/phases/review-phase";

interface TicketDetailProps {
  ticket: Ticket;
  onBack: () => void;
  onPhaseChange: (phase: WorkflowPhase) => void;
}

const PHASE_ORDER: WorkflowPhase[] = [
  "analyze",
  "plan",
  "design",
  "implement",
  "create-pr",
  "review",
  "done",
];

export function TicketDetail({
  ticket,
  onBack,
  onPhaseChange,
}: TicketDetailProps) {
  const currentIndex = PHASE_ORDER.indexOf(ticket.phase);
  const canAdvance = currentIndex < PHASE_ORDER.length - 1;
  const nextPhase = canAdvance ? PHASE_ORDER[currentIndex + 1] : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border">
        <div className="h-14 flex items-center px-4 gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onBack}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-muted-foreground">
                {ticket.jiraKey}
              </span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                  PHASE_COLORS[ticket.phase]
                }`}
              >
                {PHASE_LABELS[ticket.phase]}
              </span>
              <span className="text-xs text-muted-foreground capitalize">
                {ticket.type}
              </span>
            </div>
            <h2 className="text-base font-medium truncate mt-0.5">
              {ticket.title}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground"
          >
            <ExternalLink className="w-3 h-3" />
            Jira
          </Button>
        </div>

        {/* Phase progress */}
        <div className="px-4 pb-3 flex items-center gap-1">
          {PHASE_ORDER.slice(0, -1).map((phase, i) => {
            const isActive = phase === ticket.phase;
            const isPast = i < currentIndex;
            return (
              <div key={phase} className="flex items-center gap-1 flex-1">
                <div
                  className={`h-1 flex-1 rounded-full transition-all ${
                    isPast
                      ? "bg-cyan"
                      : isActive
                      ? "bg-cyan/50"
                      : "bg-secondary"
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase content */}
      <div className="flex-1 overflow-auto">
        {ticket.phase === "analyze" && (
          <AnalyzeChat
            key={ticket.id}
            ticket={ticket}
            onComplete={() => onPhaseChange("plan")}
          />
        )}
        {ticket.phase === "plan" && (
          <PlanPhase
            ticket={ticket}
            onComplete={() => onPhaseChange("design")}
          />
        )}
        {ticket.phase === "design" && (
          <DesignPhase
            ticket={ticket}
            onComplete={() => onPhaseChange("implement")}
          />
        )}
        {ticket.phase === "implement" && (
          <ImplementPhase
            ticket={ticket}
            onComplete={() => onPhaseChange("create-pr")}
          />
        )}
        {ticket.phase === "create-pr" && (
          <CreatePRPhase
            ticket={ticket}
            onComplete={() => onPhaseChange("review")}
          />
        )}
        {ticket.phase === "review" && (
          <ReviewPhase
            ticket={ticket}
            onComplete={() => onPhaseChange("done")}
          />
        )}
        {ticket.phase === "done" && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-emerald/10 border border-emerald/20 flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5 text-emerald" />
              </div>
              <h3 className="font-medium text-base">Ticket complete</h3>
              <p className="text-sm text-muted-foreground">
                PR approved and merged. This ticket is closed.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer with advance button — hidden for analyze (it has its own) */}
      {canAdvance && ticket.phase !== "done" && ticket.phase !== "analyze" && ticket.phase !== "plan" && ticket.phase !== "design" && (
        <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {ticket.assignee && `Assigned to ${ticket.assignee}`}
          </span>
          <Button
            size="sm"
            className="h-8 text-sm bg-cyan text-background hover:bg-cyan/90 gap-1"
            onClick={() => nextPhase && onPhaseChange(nextPhase)}
          >
            Advance to {nextPhase && PHASE_LABELS[nextPhase]}
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
