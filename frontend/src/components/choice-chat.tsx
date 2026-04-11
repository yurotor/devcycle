"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Bot, User } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────

export interface ChatMsg {
  id: number;
  role: "ai" | "user";
  content: string;
  choices?: string[] | null;
  createdAt: number;
}

export interface ChoiceChatProps {
  /** Color theme — controls accent on bubbles, buttons, icons */
  theme: "cyan" | "violet";
  /** API endpoint for GET (load history) and POST (send message) */
  apiUrl: string;
  /** POST body extras merged into every request (e.g. { phase: "analyze" }) */
  postExtras?: Record<string, unknown>;
  /** Called when AI signals readiness */
  onReady?: () => void;
  /** If provided, auto-sends this message to kick off the conversation when history is empty */
  autoStartMessage?: string;
  /** If true, the auto-start message is sent but not shown in the chat */
  hideAutoStart?: boolean;
  /** Header text shown above the chat */
  headerText?: string;
  /** Placeholder text for the input field */
  placeholder?: string;
}

// ─── Theme config ────────────────────────────────────────────────

const THEME = {
  cyan: {
    userBubble: "bg-cyan/10 border-cyan/20",
    aiBubble: "bg-secondary border-border",
    icon: "bg-cyan/10 border-cyan/20 text-cyan",
    button: "bg-cyan text-background hover:bg-cyan/90",
    choiceBtn: "border-cyan/30 text-cyan hover:bg-cyan/10",
    choiceOther: "border-border text-muted-foreground hover:bg-accent",
    header: "bg-cyan/5",
  },
  violet: {
    userBubble: "bg-violet/10 border-violet/20",
    aiBubble: "bg-secondary border-border",
    icon: "bg-violet/10 border-violet/20 text-violet",
    button: "bg-violet text-background hover:bg-violet/90",
    choiceBtn: "border-violet/30 text-violet hover:bg-violet/10",
    choiceOther: "border-border text-muted-foreground hover:bg-accent",
    header: "bg-violet/5",
  },
};

// ─── Component ───────────────────────────────────────────────────

export function ChoiceChat({
  theme,
  apiUrl,
  postExtras = {},
  onReady,
  autoStartMessage,
  hideAutoStart = false,
  headerText,
  placeholder = "Type your answer...",
}: ChoiceChatProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const autoStartedRef = useRef(false);
  const sendingRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const postExtrasRef = useRef(postExtras);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  onReadyRef.current = onReady;
  postExtrasRef.current = postExtras;

  const t = THEME[theme];

  // ── Send a message ──────────────────────────────────────────

  const sendMsg = useCallback(
    async (text: string, silent = false) => {
      if (!text.trim() || sendingRef.current) return;
      sendingRef.current = true;
      setSending(true);

      const tempId = Date.now();
      if (!silent) {
        setMessages((prev) => [
          ...prev,
          { id: tempId, role: "user", content: text, createdAt: tempId },
        ]);
      }

      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, ...postExtrasRef.current }),
        });
        const data = await res.json();

        if (data.ready) {
          setReady(true);
          onReadyRef.current?.();
        }

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: "ai",
            content: data.response,
            choices: data.choices ?? null,
            createdAt: Date.now(),
          },
        ]);
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [apiUrl]
  );

  // ── Load history + auto-start ───────────────────────────────

  useEffect(() => {
    setLoading(true);
    fetch(apiUrl)
      .then((r) => r.json())
      .then((data) => {
        let msgs: ChatMsg[] = (data.messages ?? []).map((m: ChatMsg) => ({
          ...m,
          choices: m.choices ? (typeof m.choices === "string" ? JSON.parse(m.choices) : m.choices) : null,
        }));
        // Hide the auto-start user message from history if hideAutoStart is set
        if (hideAutoStart && autoStartMessage && msgs.length > 0 && msgs[0].role === "user" && msgs[0].content === autoStartMessage) {
          msgs = msgs.slice(1);
        }
        setMessages(msgs);

        // Check if already ready
        const lastAi = [...msgs].reverse().find((m) => m.role === "ai");
        if (lastAi) {
          const lc = lastAi.content.toLowerCase();
          if (
            lastAi.content.includes("[ANALYSIS_COMPLETE]") ||
            lc.includes("analysis is complete") ||
            lc.includes("analysis complete") ||
            lc.includes("enough detail to move to planning") ||
            lc.includes("ready to move to planning") ||
            lc.includes("ready for planning") ||
            lc.includes("move forward to planning") ||
            lc.includes("proceed to planning") ||
            lc.includes("ready to proceed") ||
            lc.includes("we have enough") ||
            lc.includes("sufficient detail") ||
            lc.includes("fully specified") ||
            lc.includes("good understanding of the system")
          ) {
            setReady(true);
            onReadyRef.current?.();
          }
        }

        if (msgs.length === 0 && autoStartMessage && !autoStartedRef.current) {
          autoStartedRef.current = true;
          sendMsg(autoStartMessage, hideAutoStart);
        }
      })
      .finally(() => setLoading(false));
  }, [apiUrl, autoStartMessage, sendMsg]);

  // ── Auto-scroll ─────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // ── Choice click handler ────────────────────────────────────

  const handleChoice = (choice: string) => {
    if (choice.toLowerCase() === "other" || choice.toLowerCase().startsWith("other (")) {
      // Focus the input for free text
      inputRef.current?.focus();
    } else {
      sendMsg(choice);
    }
  };

  // ── Keyboard ────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        sendMsg(input.trim());
        setInput("");
      }
    }
  };

  const handleSend = () => {
    if (input.trim()) {
      sendMsg(input.trim());
      setInput("");
    }
  };

  // ── Render ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Get choices from the last AI message (if any and not yet answered)
  const lastMsg = messages[messages.length - 1];
  const showChoices =
    !sending &&
    !ready &&
    lastMsg?.role === "ai" &&
    lastMsg.choices &&
    lastMsg.choices.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      {headerText && (
        <div className={`shrink-0 px-4 py-3 border-b border-border ${t.header}`}>
          <p className="text-xs text-muted-foreground">
            <Bot className={`w-3.5 h-3.5 inline mr-1 ${theme === "cyan" ? "text-cyan" : "text-violet"}`} />
            {headerText}
          </p>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "ai" && (
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${t.icon}`}>
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed border ${
                  msg.role === "user" ? t.userBubble : t.aiBubble
                } text-foreground`}
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

          {/* Typing indicator */}
          {sending && (
            <div className="flex gap-2.5">
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${t.icon}`}>
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-secondary border border-border rounded-lg px-3 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Choice buttons */}
      {showChoices && (
        <div className="shrink-0 px-4 py-3 border-t border-border">
          <div className="flex flex-wrap gap-2">
            {lastMsg.choices!.map((choice, i) => {
              const isOther = choice.toLowerCase() === "other" || choice.toLowerCase().startsWith("other (");
              return (
                <button
                  key={i}
                  onClick={() => handleChoice(choice)}
                  className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                    isOther ? t.choiceOther : t.choiceBtn
                  }`}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={ready ? "Ask follow-up questions..." : placeholder}
            className="min-h-[36px] max-h-[120px] text-sm resize-none bg-secondary border-border/50"
            rows={1}
          />
          <Button
            size="sm"
            className={`h-9 w-9 p-0 shrink-0 ${t.button}`}
            onClick={handleSend}
            disabled={!input.trim() || sending}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
