"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  MessageSquare,
  Info,
  Search,
  Zap,
  ChevronUp,
} from "lucide-react";
import { ChoiceChat } from "@/components/choice-chat";
import type { ScanStatus } from "@/app/api/scan/status/route";

// ─── Types ───────────────────────────────────────────────────────

type PillState = "hidden" | "scanning" | "interview" | "failed" | "done";

// ─── Component ───────────────────────────────────────────────────

export function ScanPill() {
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [pillState, setPillState] = useState<PillState>("hidden");
  const [expanded, setExpanded] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewDone, setInterviewDone] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // Track if we already auto-opened for interview/failure
  const autoOpenedRef = useRef<"interview" | "failed" | null>(null);

  // ── Poll scan status ─────────────────────────────────────────

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    const poll = async () => {
      try {
        const res = await fetch("/api/scan/status");
        if (!res.ok) return;
        const data = (await res.json()) as ScanStatus;
        setStatus(data);
      } catch {
        // network error — ignore
      }
    };

    poll();
    timer = setInterval(poll, 2000);
    return () => clearInterval(timer);
  }, []);

  // ── Derive pill state from status ─────────────────────────────

  useEffect(() => {
    if (!status || status.status === "idle") {
      setPillState("hidden");
      return;
    }

    if (status.status === "running") {
      if (status.phase === "compiling" || status.phase === "done") {
        setPillState("interview");
        if (autoOpenedRef.current !== "interview") {
          autoOpenedRef.current = "interview";
          setShowInterviewModal(true);
        }
      } else if (status.failCount >= 3) {
        setPillState("failed");
        if (autoOpenedRef.current !== "failed") {
          autoOpenedRef.current = "failed";
          setExpanded(true);
        }
      } else {
        setPillState("scanning");
      }
      return;
    }

    if (status.status === "done") {
      if (!interviewDone && autoOpenedRef.current !== "interview") {
        // Scan done but interview not started — show interview
        setPillState("interview");
        autoOpenedRef.current = "interview";
        setShowInterviewModal(true);
      } else {
        setPillState("done");
        const t = setTimeout(() => setFadeOut(true), 5000);
        return () => clearTimeout(t);
      }
      return;
    }

    if (status.status === "failed") {
      setPillState("failed");
      if (autoOpenedRef.current !== "failed") {
        autoOpenedRef.current = "failed";
        setExpanded(true);
      }
    }
  }, [status, interviewDone]);

  // ── Handlers ──────────────────────────────────────────────────

  const handleRetry = async () => {
    autoOpenedRef.current = null;
    setExpanded(false);
    try {
      await fetch("/api/scan/start", { method: "POST" });
    } catch { /* ignore */ }
  };

  const handleInterviewDone = () => {
    setInterviewDone(true);
    setShowInterviewModal(false);
    setPillState("done");
    setTimeout(() => setFadeOut(true), 5000);
  };

  const handlePillClick = () => {
    if (pillState === "interview") {
      setShowInterviewModal(true);
    } else {
      setExpanded(!expanded);
    }
  };

  // ── Render ────────────────────────────────────────────────────

  if (pillState === "hidden" || (pillState === "done" && fadeOut)) {
    return null;
  }

  const pillColor = {
    scanning: "bg-cyan/90 border-cyan/30",
    interview: "bg-violet/90 border-violet/30",
    failed: "bg-amber/90 border-amber/30",
    done: "bg-emerald/90 border-emerald/30",
    hidden: "",
  }[pillState];

  const pillIcon = {
    scanning: <Loader2 className="w-3.5 h-3.5 animate-spin text-background" />,
    interview: <MessageSquare className="w-3.5 h-3.5 text-background" />,
    failed: <AlertTriangle className="w-3.5 h-3.5 text-background" />,
    done: <CheckCircle2 className="w-3.5 h-3.5 text-background" />,
    hidden: null,
  }[pillState];

  const pillLabel = {
    scanning: `Scanning... ${status?.progress ?? 0}%`,
    interview: interviewDone ? "KB ready" : "Interview ready",
    failed: "Scan failed",
    done: "KB ready",
    hidden: "",
  }[pillState];

  const eventIcon = (type: string) => {
    switch (type) {
      case "info": return <Info className="w-3 h-3 text-muted-foreground" />;
      case "success": return <CheckCircle2 className="w-3 h-3 text-emerald" />;
      case "warning": return <AlertTriangle className="w-3 h-3 text-amber" />;
      case "finding": return <Search className="w-3 h-3 text-rose" />;
      case "phase": return <Zap className="w-3 h-3 text-violet" />;
      default: return <Info className="w-3 h-3 text-muted-foreground" />;
    }
  };

  return (
    <>
      {/* ── Interview Modal (centered overlay) ─────────────────── */}
      <AnimatePresence>
        {showInterviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setShowInterviewModal(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="relative w-[90vw] h-[85vh] max-w-6xl bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden z-10"
            >
              {/* Modal header */}
              <div className="px-5 py-4 border-b border-border flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-violet/10 border border-violet/20 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-violet" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">System Interview</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Answer questions to enrich the knowledge base with context code can't reveal.
                  </p>
                </div>
                <button
                  onClick={() => setShowInterviewModal(false)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat body */}
              <div className="flex-1 overflow-hidden">
                <ChoiceChat
                  theme="violet"
                  apiUrl="/api/kb/interview"
                  autoStartMessage="Let's start the interview. I'm ready to answer questions about our system."
                  hideAutoStart
                  onReady={handleInterviewDone}
                  placeholder="Answer the question or provide more context..."
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pill + small expanded view ─────────────────────────── */}
      <div className="relative flex flex-col items-end gap-2">
        {/* Small expanded detail view (scan log / failure only) */}
        <AnimatePresence>
          {expanded && pillState !== "interview" && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full right-0 mt-2 w-96 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                {pillIcon}
                <span className="text-sm font-medium flex-1">
                  {pillState === "failed" ? "Scan Failed" : "Scan Progress"}
                </span>
                <button
                  onClick={() => setExpanded(false)}
                  className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {pillState === "failed" ? (
                <div className="p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {status?.error
                      ? status.error.slice(0, 200)
                      : "The scan encountered repeated failures."}
                  </p>
                  <Button
                    size="sm"
                    className="w-full h-9 bg-amber text-background hover:bg-amber/90"
                    onClick={handleRetry}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-2" />
                    Retry Scan
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{status?.phase ?? "Starting..."}</span>
                      <span>{status?.progress ?? 0}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-cyan rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${status?.progress ?? 0}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  <ScrollArea className="h-56">
                    <div className="px-3 pb-3 space-y-1 font-mono text-xs">
                      {(status?.events ?? []).map((event, i) => (
                        <div key={i} className="flex items-start gap-2 py-0.5">
                          <span className="shrink-0 mt-0.5">{eventIcon(event.type)}</span>
                          <span className="text-muted-foreground truncate">{event.message}</span>
                        </div>
                      ))}
                      {pillState === "scanning" && (
                        <span className="text-cyan">█</span>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pill button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.02 }}
          onClick={handlePillClick}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-colors ${pillColor}`}
        >
          {pillIcon}
          <span className="text-background">{pillLabel}</span>
          {pillState !== "interview" && (
            <ChevronUp
              className={`w-3 h-3 text-background/70 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          )}
        </motion.button>
      </div>
    </>
  );
}
