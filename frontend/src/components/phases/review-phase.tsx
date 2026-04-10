"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Send,
  SendHorizonal,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Info,
  Shield,
} from "lucide-react";
import { type Ticket } from "@/lib/fake-data";

interface ReviewPhaseProps {
  ticket: Ticket;
  onComplete: () => void;
}

interface ReviewComment {
  id: string;
  file: string;
  line: number;
  priority: "critical" | "suggestion" | "nit";
  content: string;
  sent: boolean;
}

const FAKE_COMMENTS: ReviewComment[] = [
  {
    id: "c1",
    file: "src/refunds/processor.ts",
    line: 23,
    priority: "critical",
    content:
      "The exchange rate fetch is not wrapped in a try/catch. If the ECB API is down, the entire refund will fail silently. Should fall back to a cached rate or fail explicitly with a descriptive error.",
    sent: false,
  },
  {
    id: "c2",
    file: "src/refunds/processor.ts",
    line: 36,
    priority: "suggestion",
    content:
      'Consider adding a database transaction around the Stripe refund and the local DB write. If the DB write fails after Stripe processes the refund, you\'ll have an inconsistent state.',
    sent: false,
  },
  {
    id: "c3",
    file: "src/refunds/processor.ts",
    line: 15,
    priority: "nit",
    content:
      "The displayCurrency parameter defaults to 'USD' in two places (line 15 and line 36). Extract to a constant to avoid drift.",
    sent: false,
  },
];

const PRIORITY_STYLE = {
  critical: {
    bg: "bg-rose/10 border-rose/20",
    badge: "bg-rose/15 text-rose border-rose/20",
    icon: <AlertTriangle className="w-3.5 h-3.5 text-rose" />,
  },
  suggestion: {
    bg: "bg-amber/10 border-amber/20",
    badge: "bg-amber/15 text-amber border-amber/20",
    icon: <Shield className="w-3.5 h-3.5 text-amber" />,
  },
  nit: {
    bg: "bg-sky/10 border-sky/20",
    badge: "bg-sky/15 text-sky border-sky/20",
    icon: <Info className="w-3.5 h-3.5 text-sky" />,
  },
};

export function ReviewPhase({ ticket, onComplete }: ReviewPhaseProps) {
  const [status, setStatus] = useState<"analyzing" | "review" | "done">(
    "analyzing"
  );
  const [comments, setComments] = useState<ReviewComment[]>([]);

  // Simulate review loading
  useState(() => {
    setTimeout(() => {
      setComments(FAKE_COMMENTS);
      setStatus("review");
    }, 2000);
  });

  const sendComment = (id: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, sent: true } : c))
    );
  };

  const sendAll = () => {
    setComments((prev) => prev.map((c) => ({ ...c, sent: true })));
  };

  const allSent = comments.length > 0 && comments.every((c) => c.sent);

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-rose" />
          <span className="text-xs font-medium">Review</span>
          <span className="text-[10px] text-muted-foreground ml-1">
            AI-powered code review — manage comments
          </span>
          {status === "analyzing" && (
            <Loader2 className="w-3.5 h-3.5 text-rose animate-spin ml-auto" />
          )}
        </div>
      </div>

      {status === "analyzing" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 text-rose animate-spin mx-auto" />
            <div>
              <h3 className="text-sm font-medium">Analyzing PR #247...</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Running code review on all changes
              </p>
            </div>
          </div>
        </div>
      )}

      {status === "review" && (
        <>
          <ScrollArea className="flex-1">
            <div className="p-5 max-w-2xl space-y-3">
              {/* Summary */}
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 mb-4">
                <div className="text-xs text-muted-foreground">
                  Found{" "}
                  <span className="text-rose font-medium">
                    {comments.filter((c) => c.priority === "critical").length}{" "}
                    critical
                  </span>
                  ,{" "}
                  <span className="text-amber font-medium">
                    {
                      comments.filter((c) => c.priority === "suggestion")
                        .length
                    }{" "}
                    suggestions
                  </span>
                  ,{" "}
                  <span className="text-sky font-medium">
                    {comments.filter((c) => c.priority === "nit").length} nits
                  </span>{" "}
                  in PR #247
                </div>
              </div>

              {/* Comments */}
              {comments.map((comment) => {
                const style = PRIORITY_STYLE[comment.priority];
                return (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-lg border overflow-hidden ${
                      comment.sent ? "opacity-60" : ""
                    } ${style.bg}`}
                  >
                    <div className="px-3 py-2 flex items-center gap-2 border-b border-border/30">
                      {style.icon}
                      <code className="text-[10px] font-mono text-muted-foreground">
                        {comment.file}:{comment.line}
                      </code>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ml-auto ${style.badge}`}
                      >
                        {comment.priority}
                      </span>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {comment.content}
                      </p>
                      {!comment.sent && (
                        <div className="mt-2 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] gap-1"
                            onClick={() => sendComment(comment.id)}
                          >
                            <Send className="w-3 h-3" />
                            Send to PR
                          </Button>
                        </div>
                      )}
                      {comment.sent && (
                        <div className="mt-2 flex items-center gap-1 justify-end text-emerald">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="text-[10px]">Sent</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="shrink-0 px-4 py-3 border-t border-border flex items-center gap-2">
            {!allSent && (
              <Button
                size="sm"
                className="h-8 text-xs bg-rose text-white hover:bg-rose/90 gap-1"
                onClick={sendAll}
              >
                <SendHorizonal className="w-3.5 h-3.5" />
                Send All Comments
              </Button>
            )}
            {allSent && (
              <span className="text-xs text-emerald flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                All comments sent to PR #247
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
