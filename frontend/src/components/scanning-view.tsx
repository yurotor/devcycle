"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Zap,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Info,
  Search,
} from "lucide-react";
import { SCAN_EVENTS, type ScanEvent } from "@/lib/fake-data";

interface ScanningViewProps {
  onComplete: () => void;
}

export function ScanningView({ onComplete }: ScanningViewProps) {
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [done, setDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    SCAN_EVENTS.forEach((event, i) => {
      timeouts.push(
        setTimeout(() => {
          setEvents((prev) => [...prev, event]);
          if (i === SCAN_EVENTS.length - 1) {
            setTimeout(() => setDone(true), 800);
          }
        }, event.delay)
      );
    });
    return () => timeouts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const eventIcon = (type: ScanEvent["type"]) => {
    switch (type) {
      case "info":
        return <Info className="w-3.5 h-3.5 text-muted-foreground" />;
      case "success":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald" />;
      case "warning":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber" />;
      case "finding":
        return <Search className="w-3.5 h-3.5 text-rose" />;
    }
  };

  const repoColor = (repo: string) => {
    const colors: Record<string, string> = {
      "payments-api": "text-cyan",
      "auth-service": "text-violet",
      "payments-frontend": "text-amber",
      "shared-libs": "text-emerald",
      "e2e-tests": "text-sky",
    };
    return colors[repo] ?? "text-muted-foreground";
  };

  const progress = Math.min((events.length / SCAN_EVENTS.length) * 100, 100);

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
              <span className="text-lg font-semibold tracking-tight">
                DevCycle
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              {done ? (
                "Scan complete"
              ) : (
                <>
                  Scanning repositories
                  <span className="animate-scan-pulse">...</span>
                </>
              )}
            </h2>
            <p className="text-muted-foreground text-sm">
              {done
                ? "5 repositories scanned. 2 critical findings, 3 high-priority improvements. Knowledge base ready."
                : "AI is analyzing your codebase, discovering patterns, and building your knowledge base."}
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {done ? "Complete" : `Scanning ${events.length > 0 ? events[events.length - 1].repo : "..."}` }
              </span>
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

          {/* Log output */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
              <span className="text-xs font-mono text-muted-foreground">
                scan output
              </span>
            </div>
            <ScrollArea className="h-72">
              <div ref={scrollRef} className="p-3 space-y-1 font-mono text-xs h-72 overflow-y-auto">
                {events.map((event, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-start gap-2 py-0.5"
                  >
                    <span className="shrink-0 mt-0.5">{eventIcon(event.type)}</span>
                    <span className={`shrink-0 w-40 ${repoColor(event.repo)}`}>
                      {event.repo}
                    </span>
                    <span
                      className={
                        event.type === "finding"
                          ? "text-rose"
                          : event.type === "success"
                          ? "text-emerald"
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

          {done && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
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
