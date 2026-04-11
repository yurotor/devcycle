"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Shield,
  GitBranch,
  Gauge,
  Bug,
  X,
  ArrowRight,
  Check,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface Suggestion {
  id: string;
  repo: string;
  severity: "critical" | "high";
  category: "security" | "architecture" | "optimization" | "bug";
  title: string;
  description: string;
  files: string[];
  promoted: boolean;
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

export function SuggestionsPanel() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [promoting, setPromoting] = useState<Set<string>>(new Set());
  const [promotedCount, setPromotedCount] = useState(0);

  const fetchSuggestions = () => {
    setLoading(true);
    fetch("/api/suggestions")
      .then((res) => res.json())
      .then((data) => setSuggestions(data.suggestions ?? []))
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleDismiss = async (id: string) => {
    setDismissing((prev) => new Set([...prev, id]));
    try {
      await fetch(`/api/suggestions/${id}/dismiss`, { method: "POST" });
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handlePromote = async (id: string) => {
    setPromoting((prev) => new Set([...prev, id]));
    try {
      const res = await fetch(`/api/suggestions/${id}/promote`, { method: "POST" });
      if (res.ok) {
        setSuggestions((prev) => prev.filter((s) => s.id !== id));
        setPromotedCount((c) => c + 1);
      }
    } finally {
      setPromoting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const visible = suggestions.filter((s) => !s.promoted);

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <div className="px-3 py-2 mb-1 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Scan Findings
            </span>
            <span className="text-[10px] text-muted-foreground ml-2">
              {visible.length} remaining
            </span>
          </div>
          <button
            onClick={fetchSuggestions}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loading && suggestions.length === 0 && (
          <div className="px-3 py-4 text-xs text-muted-foreground">Loading...</div>
        )}

        {!loading && visible.length === 0 && promotedCount === 0 && (
          <div className="px-3 py-4 text-xs text-muted-foreground">
            No findings. Run a scan to generate suggestions.
          </div>
        )}

        <div className="space-y-2">
          {visible.map((suggestion) => {
            const Icon = CATEGORY_ICON[suggestion.category];
            const isDismissing = dismissing.has(suggestion.id);
            const isPromoting = promoting.has(suggestion.id);

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
                    {suggestion.files.length > 0 && (
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
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                    onClick={() => handleDismiss(suggestion.id)}
                    disabled={isDismissing}
                  >
                    {isDismissing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                    Dismiss
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-cyan hover:text-cyan gap-1 ml-auto"
                    onClick={() => handlePromote(suggestion.id)}
                    disabled={isPromoting}
                  >
                    {isPromoting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        Create Ticket
                        <ArrowRight className="w-3 h-3" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}

          {promotedCount > 0 && (
            <div className="px-3 py-2 flex items-center gap-2 text-emerald">
              <Check className="w-3.5 h-3.5" />
              <span className="text-[11px]">
                {promotedCount} finding{promotedCount > 1 ? "s" : ""} promoted
                to tickets
              </span>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
