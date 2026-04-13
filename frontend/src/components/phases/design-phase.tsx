"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Layers,
  Loader2,
  Circle,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { type Ticket } from "@/lib/fake-data";

interface TaskRow {
  id: number;
  title: string;
  subtitle: string | null;
  description: string;
  status: string;
  waveId: number;
}

interface WaveRow {
  id: number;
  name: string;
  orderIndex: number;
  tasks: TaskRow[];
}

interface DesignPhaseProps {
  ticket: Ticket;
  onComplete: () => void;
}

export function DesignPhase({ ticket, onComplete }: DesignPhaseProps) {
  const [waves, setWaves] = useState<WaveRow[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  const toggleTask = (taskId: number) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const regenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/design/generate`, {
        method: "POST",
      });
      const data = await res.json();
      setWaves(data.waves ?? []);
      setExpandedTasks(new Set());
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetch(`/api/tickets/${ticket.id}/tasks`)
      .then((r) => r.json())
      .then((data) => {
        setWaves(data.waves ?? []);
      })
      .finally(() => setLoading(false));
  }, [ticket.id]);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-amber mb-3" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (waves.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="text-center space-y-1">
          <h3 className="text-sm font-medium">No tasks generated</h3>
          <p className="text-xs text-muted-foreground">
            Task breakdown is empty. Try regenerating.
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 text-sm gap-1.5"
          onClick={regenerate}
          disabled={generating}
        >
          {generating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Regenerate
        </Button>
      </div>
    );
  }

  const totalTasks = waves.reduce((n, w) => n + w.tasks.length, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-4 py-3 border-b border-border bg-amber/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-amber" />
          <span className="text-sm font-medium">
            {waves.length} waves &middot; {totalTasks} tasks
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={regenerate}
          disabled={generating}
        >
          <RefreshCw
            className={`w-3 h-3 ${generating ? "animate-spin" : ""}`}
          />
          Regenerate
        </Button>
      </div>

      <ScrollArea className="flex-1 overflow-hidden px-4">
        <div className="py-4 space-y-4">
          {waves.map((wave) => (
            <div
              key={wave.id}
              className="border border-border rounded-lg overflow-hidden"
            >
              <div className="px-3 py-2 bg-secondary/50 border-b border-border">
                <span className="text-sm font-medium">{wave.name}</span>
              </div>
              <div className="divide-y divide-border/50">
                {wave.tasks.map((task) => {
                  const isExpanded = expandedTasks.has(task.id);
                  return (
                    <div key={task.id} className="px-3 py-2.5">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className="w-full flex items-start gap-2 text-left group"
                      >
                        <span className="mt-0.5 shrink-0 text-muted-foreground/40">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium group-hover:text-foreground transition-colors">
                            {task.title}
                          </p>
                          {task.subtitle && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {task.subtitle}
                            </p>
                          )}
                        </div>
                        <Circle className="w-3 h-3 text-muted-foreground/30 shrink-0 mt-1" />
                      </button>
                      {isExpanded && task.description && (
                        <div className="mt-2 ml-5.5 pl-2 border-l-2 border-border/40">
                          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {task.description}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Review the breakdown, then start execution.
        </p>
        <Button
          size="sm"
          className="h-8 text-sm bg-amber text-background hover:bg-amber/90 gap-1"
          onClick={onComplete}
        >
          <ArrowRight className="w-3.5 h-3.5" />
          Start Execute
        </Button>
      </div>
    </div>
  );
}
