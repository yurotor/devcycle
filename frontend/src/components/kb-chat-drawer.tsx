"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send, Loader2, Bot, User, X, MessageCircle,
  Maximize2, Minimize2, ArrowLeft, Plus, Clock,
} from "lucide-react";
import { ToolEventsAccordion, type ToolEvent } from "@/components/tool-events-accordion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── Types ──────────────────────────────────────────────────────

interface ChatMsg {
  id: number;
  role: "ai" | "user";
  content: string;
  toolEvents?: ToolEvent[];
}

interface Session {
  id: number;
  name: string;
  createdAt: number;
  updatedAt: number;
}

interface KBChatDrawerProps {
  wsId: number | null;
}

type DrawerView = "sessions" | "chat";

const API_URL = "/api/kb/chat";

// ─── Markdown table + code styles ───────────────────────────────

const mdComponents = {
  table: (props: React.ComponentProps<"table">) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-[12px] border-collapse" {...props} />
    </div>
  ),
  thead: (props: React.ComponentProps<"thead">) => (
    <thead className="bg-secondary/80" {...props} />
  ),
  th: (props: React.ComponentProps<"th">) => (
    <th className="px-2 py-1 text-left font-medium border border-border/50 whitespace-nowrap" {...props} />
  ),
  td: (props: React.ComponentProps<"td">) => (
    <td className="px-2 py-1 border border-border/50" {...props} />
  ),
  code: ({ className, children, ...props }: React.ComponentProps<"code"> & { className?: string }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return (
        <pre className="bg-secondary rounded px-2 py-1.5 my-1 overflow-x-auto text-[11px]">
          <code className={className} {...props}>{children}</code>
        </pre>
      );
    }
    return <code className="bg-secondary/80 px-1 py-0.5 rounded text-[12px]" {...props}>{children}</code>;
  },
  p: (props: React.ComponentProps<"p">) => <p className="mb-1.5 last:mb-0" {...props} />,
  ul: (props: React.ComponentProps<"ul">) => <ul className="list-disc pl-4 mb-1.5" {...props} />,
  ol: (props: React.ComponentProps<"ol">) => <ol className="list-decimal pl-4 mb-1.5" {...props} />,
  li: (props: React.ComponentProps<"li">) => <li className="mb-0.5" {...props} />,
  h1: (props: React.ComponentProps<"h1">) => <h1 className="font-bold text-sm mt-2 mb-1" {...props} />,
  h2: (props: React.ComponentProps<"h2">) => <h2 className="font-bold text-[13px] mt-2 mb-1" {...props} />,
  h3: (props: React.ComponentProps<"h3">) => <h3 className="font-semibold text-[13px] mt-1.5 mb-0.5" {...props} />,
};

// ─── Component ──────────────────────────────────────────────────

export function KBChatDrawer({ wsId }: KBChatDrawerProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<DrawerView>("chat");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const activeSessionRef = useRef<number | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingLabel, setStreamingLabel] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [streamKey, setStreamKey] = useState<string | null>(null);
  const sendingRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep ref in sync
  useEffect(() => { activeSessionRef.current = activeSessionId; }, [activeSessionId]);

  // Reset when workspace changes (skip initial mount)
  const prevWsId = useRef(wsId);
  useEffect(() => {
    if (prevWsId.current === wsId) return;
    prevWsId.current = wsId;
    setMessages([]);
    setActiveSessionId(null);
    setView("chat");
    setSessions([]);
  }, [wsId]);

  // Load sessions when drawer opens or workspace changes
  useEffect(() => {
    if (!open || !wsId) return;
    fetch(`${API_URL}?wsId=${wsId}`)
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions ?? []))
      .catch(() => {});
  }, [open, wsId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Focus input when entering chat view or opening drawer
  useEffect(() => {
    if (open && view === "chat") {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [view, open]);

  // Streaming status polling
  useEffect(() => {
    if (!sending || !streamKey) {
      setStreamingLabel(null);
      setStreamingText("");
      return;
    }
    let cancelled = false;
    const poll = async () => {
      while (!cancelled) {
        try {
          const res = await fetch(`${API_URL}?action=streaming-status&sessionKey=${streamKey}`);
          const data = await res.json();
          if (!cancelled) {
            if (data.label) setStreamingLabel(data.label);
            if (data.thinkingText) setStreamingText(data.thinkingText);
          }
        } catch { /* ignore */ }
        await new Promise((r) => setTimeout(r, 1000));
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [sending, streamKey]);

  // Load session messages
  const loadSession = useCallback(async (sessionId: number) => {
    setActiveSessionId(sessionId);
    setView("chat");
    const res = await fetch(`${API_URL}?sessionId=${sessionId}`);
    const data = await res.json();
    const msgs: ChatMsg[] = (data.messages ?? []).map((m: { id: number; role: string; content: string; tool_events?: string }) => ({
      id: m.id,
      role: m.role as "ai" | "user",
      content: m.content,
      toolEvents: m.tool_events ? JSON.parse(m.tool_events) : undefined,
    }));
    setMessages(msgs);
  }, []);

  // Start new chat
  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setView("chat");
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  // Send message — returns true if message was accepted
  const sendMsg = useCallback(
    async (text: string): Promise<boolean> => {
      if (!text.trim() || sendingRef.current || !wsId) return false;
      sendingRef.current = true;
      setSending(true);

      const currentSessionId = activeSessionRef.current;
      const tempId = Date.now();
      setMessages((prev) => [
        ...prev,
        { id: tempId, role: "user", content: text },
      ]);

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, wsId, sessionId: currentSessionId }),
        });
        const data = await res.json();

        if (!res.ok) {
          setMessages((prev) => [
            ...prev,
            { id: Date.now(), role: "ai", content: data.error ?? "Something went wrong." },
          ]);
          return true;
        }

        if (data.sessionId && !currentSessionId) {
          setActiveSessionId(data.sessionId);
        }
        if (data.streamKey) {
          setStreamKey(data.streamKey);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: "ai",
            content: data.response ?? "(empty response)",
            toolEvents: data.toolEvents ?? undefined,
          },
        ]);

        // Refresh sessions list after new session created
        if (!currentSessionId) {
          fetch(`${API_URL}?wsId=${wsId}`)
            .then((r) => r.json())
            .then((d) => setSessions(d.sessions ?? []))
            .catch(() => {});
        }
      } catch (err) {
        console.error("[kb-chat] send failed:", err);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
      return true;
    },
    [wsId]
  );

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        const text = input.trim();
        const sent = await sendMsg(text);
        if (sent) setInput("");
      }
    }
  };

  const handleSend = async () => {
    if (input.trim()) {
      const text = input.trim();
      const sent = await sendMsg(text);
      if (sent) setInput("");
    }
  };

  const drawerWidth = expanded ? "80vw" : "560px";
  const drawerHeight = expanded ? "90vh" : "600px";

  // ── Relative time ──────────────────────────────────────────────

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <>
      {/* Floating toggle button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 flex items-center justify-center transition-colors"
            title="Ask about the system"
          >
            <MessageCircle className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ width: drawerWidth, height: drawerHeight, maxHeight: "90vh" }}
            className="fixed bottom-5 right-5 z-50 bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden transition-[width,height] duration-200"
          >
            {/* Header */}
            <div className="shrink-0 h-11 flex items-center px-3 gap-2 border-b border-border bg-emerald-600/5">
              {view === "chat" && (
                <button
                  onClick={() => setView("sessions")}
                  className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  title="Back to sessions"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="w-6 h-6 rounded-full bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <span className="text-xs font-medium flex-1">KB Assistant</span>
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title={expanded ? "Collapse" : "Expand"}
              >
                {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => { setOpen(false); setExpanded(false); }}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ─── Sessions List View ──────────────────────────── */}
            {view === "sessions" && (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="px-3 py-2 border-b border-border">
                  <button
                    onClick={startNewChat}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600/10 border border-emerald-600/20 text-emerald-500 hover:bg-emerald-600/15 transition-colors text-xs font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New conversation
                  </button>
                </div>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-2 space-y-0.5">
                    {sessions.length === 0 && (
                      <div className="text-center py-8">
                        <MessageCircle className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground/50">No conversations yet</p>
                      </div>
                    )}
                    {sessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => loadSession(s.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg hover:bg-accent transition-colors group ${
                          activeSessionId === s.id ? "bg-accent" : ""
                        }`}
                      >
                        <p className="text-xs font-medium truncate">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {timeAgo(s.updatedAt)}
                        </p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* ─── Chat View ──────────────────────────────────── */}
            {view === "chat" && (
              <>
                <ScrollArea className="flex-1 min-h-0 px-3">
                  <div className="py-3 space-y-3">
                    {messages.length === 0 && !sending && (
                      <div className="text-center py-8">
                        <Bot className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">
                          Ask anything about the system.
                        </p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1">
                          I&apos;ll search the KB to find answers.
                        </p>
                      </div>
                    )}

                    {messages.map((msg) => (
                      <div key={msg.id}>
                        {msg.role === "ai" && msg.toolEvents && msg.toolEvents.length > 0 && (
                          <ToolEventsAccordion events={msg.toolEvents} />
                        )}
                        <div className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                          {msg.role === "ai" && (
                            <div className="w-5 h-5 rounded-full bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center shrink-0 mt-0.5">
                              <Bot className="w-3 h-3 text-emerald-500" />
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[13px] leading-relaxed border ${
                              msg.role === "user"
                                ? "bg-emerald-600/10 border-emerald-600/20"
                                : "bg-secondary border-border"
                            } text-foreground`}
                          >
                            {msg.role === "ai" ? (
                              <div className="prose-sm prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                                  {msg.content}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                            )}
                          </div>
                          {msg.role === "user" && (
                            <div className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
                              <User className="w-3 h-3 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Streaming indicator */}
                    {sending && (
                      <div className="flex gap-2">
                        <div className="w-5 h-5 rounded-full bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-3 h-3 text-emerald-500" />
                        </div>
                        <div className="flex-1 max-w-[85%] space-y-1">
                          <div className="bg-secondary border border-border rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />
                            {streamingLabel && (
                              <span className="text-[11px] text-muted-foreground truncate">{streamingLabel}</span>
                            )}
                          </div>
                          {streamingText && (
                            <div className="bg-secondary/50 border border-border/50 rounded-lg px-2.5 py-1.5 max-h-32 overflow-y-auto">
                              <p className="text-[10px] text-muted-foreground/70 font-mono whitespace-pre-wrap break-words leading-relaxed">
                                {streamingText.length > 1500
                                  ? "..." + streamingText.slice(-1500)
                                  : streamingText}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div ref={bottomRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="shrink-0 border-t border-border p-2.5">
                  {!wsId && (
                    <p className="text-[11px] text-muted-foreground text-center py-1 mb-1">
                      Select a workspace first.
                    </p>
                  )}
                  <div className="flex gap-1.5">
                    <Textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about the system..."
                      className="min-h-[32px] max-h-[80px] text-[13px] resize-none bg-secondary border-border/50"
                      rows={1}
                      disabled={!wsId || sending}
                    />
                    <Button
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0 bg-emerald-600 text-white hover:bg-emerald-500"
                      onClick={handleSend}
                      disabled={!input.trim() || sending || !wsId}
                    >
                      <Send className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
