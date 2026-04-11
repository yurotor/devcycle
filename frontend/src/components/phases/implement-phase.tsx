"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  Loader2,
  CheckCircle2,
  Circle,
  Hand,
  ArrowRight,
  GitBranch,
} from "lucide-react";
import { type Ticket } from "@/lib/fake-data";

interface TaskRow {
  id: number;
  title: string;
  description: string;
  status: string;
  branchName: string | null;
  implementedManually: number;
  waveId: number;
}

interface WaveRow {
  id: number;
  name: string;
  orderIndex: number;
  tasks: TaskRow[];
}

interface ImplementPhaseProps {
  ticket: Ticket;
  onComplete: () => void;
}

export function ImplementPhase({ ticket, onComplete }: ImplementPhaseProps) {
  const [waves, setWaves] = useState<WaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);

  const loadTasks = async () => {
    const res = await fetch(`/api/tickets/${ticket.id}/tasks`);
    const data = await res.json();
    setWaves(data.waves ?? []);
  };

  useEffect(() => {
    loadTasks().finally(() => setLoading(false));
  }, [ticket.id]);

  const startTask = async (taskId: number) => {
    setBusyTaskId(taskId);
    try {
      await fetch(`/api/tickets/${ticket.id}/implement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", taskId }),
      });
      // Simulate implementation completing after a short delay
      setTimeout(async () => {
        await fetch(`/api/tickets/${ticket.id}/implement`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "complete", taskId }),
        });
        await loadTasks();
        setBusyTaskId(null);
      }, 1500);
    } catch {
      setBusyTaskId(null);
    }
  };

  const markManual = async (taskId: number) => {
    setBusyTaskId(taskId);
    try {
      await fetch(`/api/tickets/${ticket.id}/implement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "manual", taskId }),
      });
      await loadTasks();
    } finally {
      setBusyTaskId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allTasks = waves.flatMap((w) => w.tasks);
  const doneTasks = allTasks.filter(
    (t) => t.status === "done" || t.implementedManually
  );
  const allDone = allTasks.length > 0 && doneTasks.length === allTasks.length;

  const statusIcon = (task: TaskRow) => {
    if (task.status === "done")
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald shrink-0" />;
    if (task.implementedManually)
      return <Hand className="w-3.5 h-3.5 text-amber shrink-0" />;
    if (task.status === "in-progress" || busyTaskId === task.id)
      return <Loader2 className="w-3.5 h-3.5 text-cyan animate-spin shrink-0" />;
    return <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-4 py-3 border-b border-border bg-emerald/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play className="w-3.5 h-3.5 text-emerald" />
          <span className="text-[11px] font-medium">
            {doneTasks.length}/{allTasks.length} tasks complete
          </span>
        </div>
        <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-emerald rounded-full transition-all"
            style={{
              width: `${allTasks.length ? (doneTasks.length / allTasks.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {waves.map((wave) => (
            <div
              key={wave.id}
              className="border border-border rounded-lg overflow-hidden"
            >
              <div className="px-3 py-2 bg-secondary/50 border-b border-border">
                <span className="text-[11px] font-medium">{wave.name}</span>
              </div>
              <div className="divide-y divide-border/50">
                {wave.tasks.map((task) => {
                  const isDone = task.status === "done" || !!task.implementedManually;
                  const isBusy = busyTaskId === task.id;
                  return (
                    <div key={task.id} className="px-3 py-2.5 flex items-start gap-2">
                      <div className="mt-0.5">{statusIcon(task)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </p>
                        {task.branchName && (
                          <div className="flex items-center gap-1 mt-1">
                            <GitBranch className="w-3 h-3 text-muted-foreground" />
                            <code className="text-[9px] text-muted-foreground font-mono">
                              {task.branchName}
                            </code>
                          </div>
                        )}
                      </div>
                      {!isDone && !isBusy && (
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2 gap-1"
                            onClick={() => startTask(task.id)}
                          >
                            <Play className="w-3 h-3" />
                            Run
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2 gap-1"
                            onClick={() => markManual(task.id)}
                          >
                            <Hand className="w-3 h-3" />
                            Manual
                          </Button>
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

      {allDone && (
        <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald" />
            <span className="text-[11px] text-emerald">All tasks implemented</span>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs bg-emerald text-background hover:bg-emerald/90 gap-1"
            onClick={onComplete}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Create PR
          </Button>
        </div>
      )}
    </div>
  );
}
