"use client";

import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PHASE_LABELS,
  PHASE_DOT_COLORS,
  type Ticket,
  type WorkflowPhase,
} from "@/lib/fake-data";
import { DeployBadge } from "@/components/pipeline-status";


interface KanbanBoardProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  activeTicketId?: string;
  filter?: string;
}

const PHASES: WorkflowPhase[] = [
  "analyze",
  "plan",
  "design",
  "implement",
  "done",
];

const PRIORITY_COLORS = {
  critical: "bg-rose/15 text-rose border-rose/20",
  high: "bg-amber/15 text-amber border-amber/20",
  medium: "bg-sky/15 text-sky border-sky/20",
  low: "bg-muted text-muted-foreground border-border",
};

const TYPE_LABELS = {
  story: "Story",
  bug: "Bug",
  task: "Task",
};

const COLUMN_BORDER_TOP: Record<WorkflowPhase, string> = {
  analyze: "border-t-cyan",
  plan: "border-t-violet",
  design: "border-t-amber",
  implement: "border-t-emerald",
  done: "border-t-muted-foreground/30",
};

export function KanbanBoard({
  tickets,
  onTicketClick,
  activeTicketId,
  filter = "",
}: KanbanBoardProps) {
  const filteredTickets = useMemo(() => {
    if (!filter.trim()) return tickets;
    const q = filter.toLowerCase();
    return tickets.filter(
      (t) =>
        t.jiraKey.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q)
    );
  }, [tickets, filter]);

  return (
    <div className="h-full flex flex-col">
      {/* Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="flex gap-3 p-4 h-full min-w-max">
          {PHASES.map((phase) => {
            const phaseTickets = filteredTickets.filter((t) => t.phase === phase);
            return (
              <div
                key={phase}
                className={`w-80 flex flex-col rounded-lg bg-card/30 border border-border/40 border-t-2 ${COLUMN_BORDER_TOP[phase]} shrink-0`}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 px-3 py-2.5 shrink-0 sticky top-0 z-10 bg-card/30 backdrop-blur-sm rounded-t-lg">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${PHASE_DOT_COLORS[phase]}`}
                  />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                    {PHASE_LABELS[phase]}
                  </span>
                  <span className="text-xs text-muted-foreground/50 ml-auto font-mono">
                    {phaseTickets.length}
                  </span>
                </div>

                {/* Cards */}
                <ScrollArea className="flex-1 px-1.5 pb-1.5">
                  <div className="space-y-1.5">
                    {phaseTickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => onTicketClick(ticket)}
                        className={`w-full text-left p-2.5 rounded-md border transition-all ${
                          activeTicketId === ticket.id
                            ? "bg-accent border-cyan/40 ring-1 ring-cyan/20 shadow-sm shadow-cyan/5"
                            : "bg-card/60 border-border/50 hover:border-border hover:bg-card hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-xs font-mono text-muted-foreground">
                            {ticket.jiraKey}
                          </span>
                          <span
                            className={`text-[11px] px-1 py-0.5 rounded border font-medium ${
                              PRIORITY_COLORS[ticket.priority]
                            }`}
                          >
                            {ticket.priority}
                          </span>
                        </div>
                        <p className="text-sm font-medium leading-snug line-clamp-3 mb-1.5">
                          {ticket.title}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground/70 px-1 py-0.5 rounded bg-secondary/50">
                            {TYPE_LABELS[ticket.type]}
                          </span>
                          {ticket.phase === "implement" && (
                            <DeployBadge ticketId={Number(ticket.id)} />
                          )}
                          {ticket.assignee && (
                            <div className="flex items-center gap-1 ml-auto">
                              <div className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center">
                                <span className="text-[9px] font-medium text-muted-foreground">
                                  {ticket.assignee
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                    {phaseTickets.length === 0 && (
                      <div className="py-6 text-center">
                        <span className="text-xs text-muted-foreground/40">
                          No tickets
                        </span>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
