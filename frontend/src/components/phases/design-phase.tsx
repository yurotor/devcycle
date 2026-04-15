"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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

interface TodoItem {
  title: string;
  description: string;
  done: boolean;
}

interface TaskRow {
  id: number;
  title: string;
  subtitle: string | null;
  description: string;
  repoName: string | null;
  status: string;
  todos: TodoItem[];
}

interface DesignPhaseProps {
  ticket: Ticket;
  onComplete: () => void;
}

export function DesignPhase({ ticket, onComplete }: DesignPhaseProps) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
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
      setTasks(data.tasks ?? []);
      setExpandedTasks(new Set());
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let retries = 0;
    const maxRetries = 5; // poll up to 5 times (15s total) waiting for bg generation

    const loadAndRetry = async () => {
      const res = await fetch(`/api/tickets/${ticket.id}/tasks`);
      const data = await res.json();
      const taskList = data.tasks ?? [];
      if (cancelled) return;

      if (taskList.length === 0 && retries < maxRetries) {
        // Tasks may still be generating in background (fire-and-forget from plan phase)
        retries++;
        setTimeout(loadAndRetry, 3000);
        return;
      }

      setTasks(taskList);
      setLoading(false);
    };

    loadAndRetry().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticket.id]);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-amber mb-3" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
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

  const uniqueRepos = new Set(
    tasks.map((t) => t.repoName).filter(Boolean)
  );

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-4 py-3 border-b border-border bg-amber/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-amber" />
          <span className="text-sm font-medium">
            {tasks.length} tasks across {uniqueRepos.size} repos
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
        <div className="py-4 space-y-1">
          {tasks.map((task) => {
            const isExpanded = expandedTasks.has(task.id);
            return (
              <div
                key={task.id}
                className="border border-border/50 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className="w-full px-3 py-2.5 flex items-start gap-2 text-left group hover:bg-secondary/30 transition-colors"
                >
                  <span className="mt-0.5 shrink-0 text-muted-foreground/40">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {task.repoName && (
                        <Badge
                          variant="outline"
                          className="bg-sky/15 text-sky border-sky/20 text-[10px] px-1.5 py-0 h-4 shrink-0"
                        >
                          {task.repoName}
                        </Badge>
                      )}
                      <p className="text-sm font-medium truncate group-hover:text-foreground transition-colors">
                        {task.title}
                      </p>
                    </div>
                    {task.subtitle && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {task.subtitle}
                      </p>
                    )}
                    {!isExpanded && task.todos.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {task.todos.map((todo, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5"
                          >
                            <Circle className="w-2.5 h-2.5 text-muted-foreground/30 shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">
                              {todo.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 ml-5.5 space-y-3">
                    {task.description && (
                      <div className="pl-2 border-l-2 border-border/40">
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {task.description}
                        </p>
                      </div>
                    )}
                    {task.todos.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                          Todo items
                        </p>
                        {task.todos.map((todo, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 py-0.5"
                          >
                            <Circle className="w-3 h-3 text-muted-foreground/30 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-sm text-foreground/90">
                                {todo.title}
                              </p>
                              {todo.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {todo.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
