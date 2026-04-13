"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertCircle, RefreshCw, ArrowRight, FileText } from "lucide-react";
import { type Ticket } from "@/lib/fake-data";

interface PlanPhaseProps {
  ticket: Ticket;
  onComplete: () => void;
}

export function PlanPhase({ ticket, onComplete }: PlanPhaseProps) {
  const [prd, setPrd] = useState<string | null>(null);
  const [loadingPrd, setLoadingPrd] = useState(true);

  // Task generation state (runs in background)
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Load PRD content
  useEffect(() => {
    setLoadingPrd(true);
    fetch(`/api/tickets/${ticket.id}/prd`)
      .then((r) => r.json())
      .then((data) => setPrd(data.prd ?? null))
      .catch(() => setPrd(null))
      .finally(() => setLoadingPrd(false));
  }, [ticket.id]);

  // Auto-start task generation in background
  const generate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/design/generate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? "Generation failed");
        return;
      }
      const waves = data.waves ?? [];
      if (waves.length === 0) {
        setGenError("No tasks were generated.");
        return;
      }
      setGenerated(true);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    generate();
  }, [ticket.id]);

  // Approve handler — only advances if generation is done
  const handleApprove = () => {
    onComplete();
  };

  if (loadingPrd) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-violet/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-violet" />
          <span className="text-sm font-medium">Product Requirements Document</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Generation status indicator */}
          {generating && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Generating tasks...
            </span>
          )}
          {genError && (
            <span className="flex items-center gap-1.5 text-xs text-amber">
              <AlertCircle className="w-3 h-3" />
              Task generation failed
              <button
                onClick={generate}
                className="underline hover:no-underline ml-1"
              >
                Retry
              </button>
            </span>
          )}
          {generated && !generating && !genError && (
            <span className="text-xs text-emerald">Tasks ready</span>
          )}

          <Button
            size="sm"
            className="h-8 text-sm bg-violet text-background hover:bg-violet/90 gap-1.5"
            onClick={handleApprove}
            disabled={!generated || generating}
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowRight className="w-3.5 h-3.5" />
            )}
            Approve PRD
          </Button>
        </div>
      </div>

      {/* PRD content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 max-w-3xl mx-auto">
          {prd ? (
            <div className="prose prose-sm prose-invert max-w-none
              prose-headings:text-foreground prose-headings:font-semibold
              prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3 prose-h2:border-b prose-h2:border-border/50 prose-h2:pb-2
              prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-li:text-muted-foreground
              prose-strong:text-foreground
              prose-code:text-violet prose-code:bg-violet/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
              prose-hr:border-border/30
            ">
              <PRDRenderer content={prd} />
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm text-muted-foreground">No PRD has been generated yet.</p>
              <p className="text-xs text-muted-foreground/60">
                Go back to the Analysis phase to generate a PRD.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Simple markdown-to-JSX renderer for PRD content (handles headings, lists, paragraphs, bold, code)
function PRDRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    if (line.startsWith("## ")) {
      elements.push(<h2 key={key++}>{formatInline(line.slice(3))}</h2>);
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      elements.push(<h3 key={key++}>{formatInline(line.slice(4))}</h3>);
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(<h2 key={key++}>{formatInline(line.slice(2))}</h2>);
      i++;
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      elements.push(<hr key={key++} />);
      i++;
      continue;
    }

    // Unordered list
    if (line.match(/^[-*] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].replace(/^[-*] /, ""));
        i++;
      }
      elements.push(
        <ul key={key++}>
          {items.map((item, j) => (
            <li key={j}>{formatInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={key++}>
          {items.map((item, j) => (
            <li key={j}>{formatInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-empty, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].match(/^[-*] /) &&
      !lines[i].match(/^\d+\. /) &&
      !lines[i].match(/^---+$/)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      elements.push(<p key={key++}>{formatInline(paraLines.join(" "))}</p>);
    }
  }

  return <>{elements}</>;
}

// Format inline markdown: **bold**, `code`, *italic*
function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let partKey = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Code
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Italic
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);

    // Find the earliest match
    const matches = [
      boldMatch ? { type: "bold", match: boldMatch, index: boldMatch.index! } : null,
      codeMatch ? { type: "code", match: codeMatch, index: codeMatch.index! } : null,
      italicMatch ? { type: "italic", match: italicMatch, index: italicMatch.index! } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;
    if (first.index > 0) {
      parts.push(remaining.slice(0, first.index));
    }

    if (first.type === "bold") {
      parts.push(<strong key={partKey++}>{first.match![1]}</strong>);
      remaining = remaining.slice(first.index + first.match![0].length);
    } else if (first.type === "code") {
      parts.push(<code key={partKey++}>{first.match![1]}</code>);
      remaining = remaining.slice(first.index + first.match![0].length);
    } else {
      parts.push(<em key={partKey++}>{first.match![1]}</em>);
      remaining = remaining.slice(first.index + first.match![0].length);
    }
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}
