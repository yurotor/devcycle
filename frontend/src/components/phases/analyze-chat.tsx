"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Bot, User, CheckCircle2 } from "lucide-react";
import { type Ticket } from "@/lib/fake-data";

interface ChatMsg {
  id: number;
  role: "ai" | "user";
  content: string;
  createdAt: number;
}

interface AnalyzeChatProps {
  ticket: Ticket;
  onComplete: () => void;
}

export function AnalyzeChat({ ticket, onComplete }: AnalyzeChatProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load chat history
  useEffect(() => {
    fetch(`/api/tickets/${ticket.id}/chat`)
      .then((r) => r.json())
      .then((data) => {
        setMessages(data.messages ?? []);
        const lastAi = (data.messages ?? [])
          .filter((m: ChatMsg) => m.role === "ai")
          .pop();
        if (lastAi) {
          const lc = lastAi.content.toLowerCase();
          if (lc.includes("enough detail") || lc.includes("enough to move")) {
            setReady(true);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [ticket.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);

    const tempId = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content: text, createdAt: tempId },
    ]);

    try {
      const res = await fetch(`/api/tickets/${ticket.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, phase: "analyze" }),
      });
      const data = await res.json();
      if (data.ready) setReady(true);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "ai",
          content: data.response,
          createdAt: Date.now(),
        },
      ]);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-4 py-3 border-b border-border bg-cyan/5">
        <p className="text-[11px] text-muted-foreground">
          <Bot className="w-3.5 h-3.5 inline mr-1 text-cyan" />
          Chat with the AI analyst to clarify requirements, scope, and edge cases for this ticket.
        </p>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              Send a message to start the analysis conversation.
            </p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "ai" && (
                <div className="w-6 h-6 rounded-full bg-cyan/10 border border-cyan/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-cyan" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-cyan/10 border border-cyan/20 text-foreground"
                    : "bg-secondary border border-border text-foreground"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-cyan/10 border border-cyan/20 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-cyan" />
              </div>
              <div className="bg-secondary border border-border rounded-lg px-3 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {ready && (
        <div className="shrink-0 px-4 py-2 border-t border-emerald/20 bg-emerald/5 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald" />
          <span className="text-[11px] text-emerald">
            Analysis complete — advance to Plan when ready.
          </span>
        </div>
      )}

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the context, ask questions, or provide details..."
            className="min-h-[36px] max-h-[120px] text-xs resize-none bg-secondary border-border/50"
            rows={1}
          />
          <Button
            size="sm"
            className="h-9 w-9 p-0 bg-cyan text-background hover:bg-cyan/90 shrink-0"
            onClick={sendMessage}
            disabled={!input.trim() || sending}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
