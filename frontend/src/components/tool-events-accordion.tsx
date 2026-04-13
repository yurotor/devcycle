"use client";

import { useState } from "react";
import { ChevronRight, FileSearch } from "lucide-react";

export interface ToolEvent {
  toolName: string;
  summary: string;
  timestamp?: number;
}

interface ToolEventsAccordionProps {
  events: ToolEvent[];
}

export function ToolEventsAccordion({ events }: ToolEventsAccordionProps) {
  const [expanded, setExpanded] = useState(false);

  if (events.length === 0) return null;

  // Count unique files read
  const reads = events.filter((e) => e.toolName === "Read");
  const searches = events.filter((e) => e.toolName === "Grep");
  const globs = events.filter((e) => e.toolName === "Glob");

  // Build summary text
  const parts: string[] = [];
  if (reads.length > 0) parts.push(`${reads.length} file${reads.length > 1 ? "s" : ""} read`);
  if (searches.length > 0) parts.push(`${searches.length} search${searches.length > 1 ? "es" : ""}`);
  if (globs.length > 0) parts.push(`${globs.length} scan${globs.length > 1 ? "s" : ""}`);
  const summaryText = parts.length > 0 ? parts.join(", ") : `${events.length} tool action${events.length > 1 ? "s" : ""}`;

  return (
    <div className="ml-8 mr-4 my-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors group"
      >
        <ChevronRight
          className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        <FileSearch className="w-3 h-3" />
        <span>Explored codebase — {summaryText}</span>
      </button>

      {expanded && (
        <div className="mt-1 ml-4 pl-2 border-l border-border/30 space-y-0.5">
          {events.map((event, i) => (
            <div key={i} className="text-[10px] text-muted-foreground/50 font-mono truncate">
              {event.summary}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
