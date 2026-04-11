"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Loader2,
  RefreshCw,
  ThumbsUp,
  Pencil,
  MessageSquare,
  ChevronLeft,
  Send,
  X,
  Check,
} from "lucide-react";
import { type Ticket } from "@/lib/fake-data";

interface PlanPhaseProps {
  ticket: Ticket;
  onComplete: () => void;
  onBack?: () => void;
}

type Mode = "view" | "edit" | "chat";

export function PlanPhase({ ticket, onComplete, onBack }: PlanPhaseProps) {
  const [prd, setPrd] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [mode, setMode] = useState<Mode>("view");
  const [editDraft, setEditDraft] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const autoStartedRef = useRef(false);

  const generatePrd = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/plan/generate`, {
        method: "POST",
      });
      const data = await res.json();
      setPrd(data.prd ?? null);
    } finally {
      setGenerating(false);
    }
  };

  // Auto-generate PRD on mount
  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    generatePrd();
  }, [ticket.id]);

  const approvePrd = async () => {
    setApproving(true);
    try {
      await fetch(`/api/tickets/${ticket.id}/plan/approve`, {
        method: "POST",
      });
      onComplete();
    } finally {
      setApproving(false);
    }
  };

  const startEdit = () => {
    setEditDraft(prd ?? "");
    setMode("edit");
  };

  const saveEdit = () => {
    setPrd(editDraft);
    setMode("view");
  };

  const sendChatRequest = async () => {
    if (!chatInput.trim() || chatSending) return;
    setChatSending(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/plan/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPrd: prd, feedback: chatInput.trim() }),
      });
      const data = await res.json();
      if (data.prd) setPrd(data.prd);
      setChatInput("");
      setMode("view");
    } finally {
      setChatSending(false);
    }
  };

  if (generating) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-violet mb-3" />
        <p className="text-sm text-muted-foreground">Generating PRD...</p>
      </div>
    );
  }

  if (!prd) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-violet mb-3" />
        <p className="text-sm text-muted-foreground">Preparing PRD...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-violet/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-violet" />
          <span className="text-sm font-medium">
            Product Requirements Document
          </span>
        </div>
        <div className="flex items-center gap-1">
          {mode === "view" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-sm gap-1.5"
                onClick={startEdit}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-sm gap-1.5"
                onClick={() => setMode("chat")}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Request Changes
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-sm gap-1.5"
                onClick={generatePrd}
                disabled={generating}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
                Regenerate
              </Button>
            </>
          )}
          {mode === "edit" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setMode("view")}
              >
                <X className="w-3 h-3" />
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs gap-1 bg-violet text-background hover:bg-violet/90"
                onClick={saveEdit}
              >
                <Check className="w-3 h-3" />
                Save
              </Button>
            </>
          )}
          {mode === "chat" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setMode("view")}
            >
              <X className="w-3 h-3" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Chat input bar */}
      {mode === "chat" && (
        <div className="shrink-0 px-4 py-3 border-b border-border bg-violet/5">
          <p className="text-xs text-muted-foreground mb-2">
            Describe what you want to change in the PRD. AI will regenerate it with your feedback.
          </p>
          <div className="flex gap-2">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="e.g. Add error handling section, remove the migration step..."
              className="min-h-[36px] max-h-[100px] text-sm resize-none bg-secondary border-border/50"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChatRequest();
                }
              }}
            />
            <Button
              size="sm"
              className="h-9 w-9 p-0 shrink-0 bg-violet text-background hover:bg-violet/90"
              onClick={sendChatRequest}
              disabled={!chatInput.trim() || chatSending}
            >
              {chatSending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* PRD content */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4">
          {mode === "edit" ? (
            <Textarea
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              className="min-h-[400px] text-sm leading-relaxed font-mono bg-secondary/50 border border-border rounded-lg p-4 resize-none"
            />
          ) : (
            <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono bg-secondary/50 border border-border rounded-lg p-4">
              {prd}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-sm gap-1 text-muted-foreground"
              onClick={onBack}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to Analysis
            </Button>
          )}
          {!onBack && (
            <p className="text-sm text-muted-foreground">
              Review the PRD, then approve to move to Design.
            </p>
          )}
        </div>
        <Button
          size="sm"
          className="h-8 text-sm bg-violet text-background hover:bg-violet/90 gap-1"
          onClick={approvePrd}
          disabled={approving || mode !== "view"}
        >
          {approving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ThumbsUp className="w-3.5 h-3.5" />
          )}
          Approve PRD
        </Button>
      </div>
    </div>
  );
}
