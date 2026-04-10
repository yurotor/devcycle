"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  GitBranch,
  Gauge,
  Bug,
  X,
  ArrowRight,
  Check,
} from "lucide-react";
import { type ScanSuggestion } from "@/lib/fake-data";

interface SuggestionsPanelProps {
  suggestions: ScanSuggestion[];
}

const CATEGORY_ICON = {
  security: Shield,
  architecture: GitBranch,
  optimization: Gauge,
  bug: Bug,
};

const CATEGORY_COLOR = {
  security: "text-rose",
  architecture: "text-violet",
  optimization: "text-amber",
  bug: "text-cyan",
};

const SEVERITY_STYLE = {
  critical: "bg-rose/15 text-rose border-rose/20",
  high: "bg-amber/15 text-amber border-amber/20",
};

export function SuggestionsPanel({ suggestions }: SuggestionsPanelProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [promoted, setPromoted] = useState<Set<string>>(new Set());

  const visible = suggestions.filter(
    (s) => !dismissed.has(s.id) && !promoted.has(s.id)
  );

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <div className="px-3 py-2 mb-1">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Scan Findings
          </span>
          <span className="text-[10px] text-muted-foreground ml-2">
            {visible.length} remaining
          </span>
        </div>

        <div className="space-y-2">
          {visible.map((suggestion) => {
            const Icon = CATEGORY_ICON[suggestion.category];
            return (
              <div
                key={suggestion.id}
                className="p-3 rounded-lg border border-border/50 bg-card/50 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <Icon
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      CATEGORY_COLOR[suggestion.category]
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`text-[9px] px-1 py-0.5 rounded border font-medium ${
                          SEVERITY_STYLE[suggestion.severity]
                        }`}
                      >
                        {suggestion.severity}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {suggestion.repo}
                      </span>
                    </div>
                    <p className="text-xs font-medium leading-snug">
                      {suggestion.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {suggestion.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {suggestion.files.map((f) => (
                        <code
                          key={f}
                          className="text-[9px] px-1 py-0.5 rounded bg-secondary text-muted-foreground font-mono"
                        >
                          {f}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                    onClick={() =>
                      setDismissed((prev) => new Set([...prev, suggestion.id]))
                    }
                  >
                    <X className="w-3 h-3" />
                    Dismiss
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-cyan hover:text-cyan gap-1 ml-auto"
                    onClick={() =>
                      setPromoted((prev) => new Set([...prev, suggestion.id]))
                    }
                  >
                    Create Ticket
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}

          {promoted.size > 0 && (
            <div className="px-3 py-2 flex items-center gap-2 text-emerald">
              <Check className="w-3.5 h-3.5" />
              <span className="text-[11px]">
                {promoted.size} finding{promoted.size > 1 ? "s" : ""} promoted
                to tickets
              </span>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
