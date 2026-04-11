"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Zap,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Info,
  Search,
  MessageSquare,
  Send,
  Loader2,
} from "lucide-react";

export interface ScanEvent {
  repo: string;
  message: string;
  type: "info" | "success" | "warning" | "finding" | "phase";
}

interface DoneEvent {
  type: "done";
  summary: { repos: number; findings: number };
}

interface ScanningViewProps {
  onComplete: () => void;
}

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

export function ScanningView({ onComplete }: ScanningViewProps) {
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<DoneEvent["summary"] | null>(null);
  const [showInterview, setShowInterview] = useState(false);
  const [interviewDone, setInterviewDone] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Connect to SSE scan stream
  useEffect(() => {
    const es = new EventSource("/api/scan/stream");

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as ScanEvent | DoneEvent;
        if ("type" in data && data.type === "done") {
          setSummary(data.summary);
          setTimeout(() => setDone(true), 400);
          es.close();
        } else {
          setEvents((prev) => [...prev, data as ScanEvent]);
        }
      } catch {
        // Malformed event — ignore
      }
    };

    es.onerror = () => {
      es.close();
      setDone((prev) => {
        if (!prev) setTimeout(() => setDone(true), 400);
        return prev;
      });
    };

    return () => es.close();
  }, []);

  // Auto-scroll log
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [events]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages]);

  // Start interview — AI sends first message
  const startInterview = async () => {
    setShowInterview(true);
    setChatLoading(true);
    try {
      const res = await fetch("/api/kb/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Let's start the interview. I'm ready to answer questions about our system.",
          history: [],
        }),
      });
      const data = await res.json();
      setChatMessages([
        { role: "user", content: "Let's start the interview. I'm ready to answer questions about our system." },
        { role: "ai", content: data.response },
      ]);
      if (data.done) setInterviewDone(true);
    } catch {
      setChatMessages([{ role: "ai", content: "Failed to start interview. You can skip this and open the workspace." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);

    try {
      const history = [...chatMessages, { role: "user", content: msg }].map((m) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.content,
      }));

      const res = await fetch("/api/kb/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: history.slice(0, -1) }),
      });
      const data = await res.json();
      setChatMessages((prev) => [...prev, { role: "ai", content: data.response }]);
      if (data.done) setInterviewDone(true);
    } catch {
      setChatMessages((prev) => [...prev, { role: "ai", content: "Error — please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const eventIcon = (type: ScanEvent["type"]) => {
    switch (type) {
      case "info": return <Info className="w-3.5 h-3.5 text-muted-foreground" />;
      case "success": return <CheckCircle2 className="w-3.5 h-3.5 text-emerald" />;
      case "warning": return <AlertTriangle className="w-3.5 h-3.5 text-amber" />;
      case "finding": return <Search className="w-3.5 h-3.5 text-rose" />;
      case "phase": return <Zap className="w-3.5 h-3.5 text-violet" />;
    }
  };

  const repoColor = (repo: string) => {
    const palette = ["text-cyan", "text-violet", "text-amber", "text-emerald", "text-sky", "text-rose"];
    let hash = 0;
    for (let i = 0; i < repo.length; i++) hash = (hash * 31 + repo.charCodeAt(i)) & 0xffff;
    return palette[hash % palette.length];
  };

  const activeRepo = events.length > 0 ? events[events.length - 1].repo : null;
  const progress = done ? 100 : Math.min((events.length / Math.max(events.length + 3, 10)) * 85, 85);

  const doneText = summary
    ? `${summary.repos} ${summary.repos === 1 ? "repo" : "repos"} scanned. ${summary.findings} finding${summary.findings !== 1 ? "s" : ""}. Knowledge base ready.`
    : "Scan complete. Knowledge base ready.";

  return (
    <div className="h-full flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-cyan/5 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-violet/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-cyan" />
              </div>
              <span className="text-lg font-semibold tracking-tight">DevCycle</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              {showInterview ? (
                "System Interview"
              ) : done ? (
                "Scan complete"
              ) : (
                <>Scanning repositories<span className="animate-scan-pulse">...</span></>
              )}
            </h2>
            <p className="text-muted-foreground text-sm">
              {showInterview
                ? "Answer questions about your system to enrich the knowledge base with context that code alone can't reveal."
                : done
                ? doneText
                : "AI is analyzing your codebase, discovering patterns, and building your knowledge base."}
            </p>
          </div>

          {/* Progress bar — hide during interview */}
          {!showInterview && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{done ? "Complete" : activeRepo ? `Scanning ${activeRepo}` : "Starting..."}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-cyan rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          {/* Interview chat */}
          {showInterview && (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-violet" />
                <span className="text-xs font-mono text-muted-foreground">system interview</span>
                {interviewDone && (
                  <span className="ml-auto text-[10px] bg-emerald/20 text-emerald px-2 py-0.5 rounded-full font-medium">
                    Complete
                  </span>
                )}
              </div>
              <ScrollArea className="h-80">
                <div ref={chatScrollRef} className="p-3 space-y-3 h-80 overflow-y-auto">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-cyan/10 text-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-secondary rounded-lg px-3 py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              {!interviewDone && (
                <div className="p-2 border-t border-border flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type your answer..."
                    className="h-9 bg-secondary border-border/50 text-sm"
                    disabled={chatLoading}
                  />
                  <Button
                    size="sm"
                    className="h-9 px-3 bg-violet text-background hover:bg-violet/90"
                    onClick={sendMessage}
                    disabled={chatLoading || !chatInput.trim()}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Scan log — hide during interview */}
          {!showInterview && (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${done ? "bg-emerald" : "bg-emerald animate-pulse"}`} />
                <span className="text-xs font-mono text-muted-foreground">scan output</span>
              </div>
              <ScrollArea className="h-72">
                <div ref={scrollRef} className="p-3 space-y-1 font-mono text-xs h-72 overflow-y-auto">
                  {events.length === 0 && !done && (
                    <span className="text-muted-foreground/50">Connecting to scan engine...</span>
                  )}
                  {events.map((event, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-start gap-2 py-0.5"
                    >
                      <span className="shrink-0 mt-0.5">{eventIcon(event.type)}</span>
                      <span className={`shrink-0 w-64 truncate ${repoColor(event.repo)}`}>
                        {event.repo}
                      </span>
                      <span
                        className={
                          event.type === "finding"
                            ? "text-rose"
                            : event.type === "success"
                            ? "text-emerald"
                            : event.type === "warning"
                            ? "text-amber"
                            : event.type === "phase"
                            ? "text-violet font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {event.message}
                      </span>
                    </motion.div>
                  ))}
                  {!done && events.length > 0 && (
                    <span className="text-cyan cursor-blink">█</span>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Actions */}
          {done && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-2"
            >
              {!showInterview && (
                <Button
                  variant="outline"
                  className="w-full h-11 border-violet/30 text-violet hover:bg-violet/10 font-medium transition-all"
                  onClick={startInterview}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Enrich KB with System Interview
                </Button>
              )}
              <Button
                className="w-full h-11 bg-cyan text-background font-medium hover:bg-cyan/90 transition-all"
                onClick={onComplete}
              >
                Open Workspace
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
