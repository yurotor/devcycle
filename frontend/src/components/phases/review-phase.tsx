"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Loader2,
  AlertTriangle,
  Lightbulb,
  MinusCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { type Ticket } from "@/lib/fake-data";

interface ReviewComment {
  id: string;
  file: string;
  line: number;
  priority: "critical" | "suggestion" | "nit";
  content: string;
}

interface ReviewPhaseProps {
  ticket: Ticket;
  onComplete: () => void;
}

const PRIORITY_STYLES = {
  critical: {
    border: "border-rose/30",
    bg: "bg-rose/5",
    badge: "bg-rose/15 text-rose border-rose/20",
    icon: AlertTriangle,
  },
  suggestion: {
    border: "border-amber/30",
    bg: "bg-amber/5",
    badge: "bg-amber/15 text-amber border-amber/20",
    icon: Lightbulb,
  },
  nit: {
    border: "border-muted-foreground/20",
    bg: "bg-secondary/50",
    badge: "bg-secondary text-muted-foreground border-border",
    icon: MinusCircle,
  },
};

export function ReviewPhase({ ticket, onComplete }: ReviewPhaseProps) {
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  const runReview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/review`, {
        method: "POST",
      });
      const data = await res.json();
      setComments(data.comments ?? []);
      setReviewed(true);
    } finally {
      setLoading(false);
    }
  };

  if (!reviewed && !loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-rose/10 border border-rose/20 flex items-center justify-center mx-auto">
            <MessageSquare className="w-5 h-5 text-rose" />
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-base">AI Code Review</h3>
            <p className="text-sm text-muted-foreground">
              Run an AI-powered code review on the changes in this PR.
            </p>
          </div>
          <Button
            className="bg-rose text-background hover:bg-rose/90 text-sm h-9"
            onClick={runReview}
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            Run Review
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-rose mb-3" />
        <p className="text-sm text-muted-foreground">Running AI code review...</p>
      </div>
    );
  }

  const criticals = comments.filter((c) => c.priority === "critical").length;

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-4 py-3 border-b border-border bg-rose/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-rose" />
          <span className="text-sm font-medium">
            {comments.length} comments
          </span>
          {criticals > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded border bg-rose/15 text-rose border-rose/20">
              {criticals} critical
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-3">
          {comments.map((comment) => {
            const style = PRIORITY_STYLES[comment.priority];
            const Icon = style.icon;
            return (
              <div
                key={comment.id}
                className={`border rounded-lg overflow-hidden ${style.border}`}
              >
                <div className={`px-3 py-2 flex items-center gap-2 ${style.bg} border-b ${style.border}`}>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <code className="text-xs font-mono flex-1 truncate">
                    {comment.file}:{comment.line}
                  </code>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded border font-medium ${style.badge}`}>
                    {comment.priority}
                  </span>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-sm leading-relaxed">{comment.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {criticals > 0
            ? "Address critical issues before completing."
            : "No critical issues found."}
        </p>
        <Button
          size="sm"
          className="h-8 text-sm bg-emerald text-background hover:bg-emerald/90 gap-1"
          onClick={onComplete}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Approve & Complete
        </Button>
      </div>
    </div>
  );
}
