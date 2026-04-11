"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  GitPullRequest,
  Eye,
  X,
  FileCode,
  Plus,
  Minus,
} from "lucide-react";
import { type Ticket } from "@/lib/fake-data";

interface TaskRow {
  id: number;
  title: string;
  description: string;
  status: string;
  branchName: string | null;
  prUrl: string | null;
  prNumber: number | null;
  implementedManually: number;
  waveId: number;
}

interface WaveRow {
  id: number;
  name: string;
  orderIndex: number;
  tasks: TaskRow[];
}

interface FileDiff {
  path: string;
  status: "added" | "modified" | "deleted";
  hunks: { oldStart: number; newStart: number; lines: string[] }[];
}

interface ImplementPhaseProps {
  ticket: Ticket;
  onComplete: () => void;
}

export function ImplementPhase({ ticket, onComplete }: ImplementPhaseProps) {
  const [waves, setWaves] = useState<WaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [runningWaveId, setRunningWaveId] = useState<number | null>(null);
  const [creatingPrTaskId, setCreatingPrTaskId] = useState<number | null>(null);
  const [viewingTask, setViewingTask] = useState<TaskRow | null>(null);
  const [diffs, setDiffs] = useState<FileDiff[]>([]);
  const [loadingDiffs, setLoadingDiffs] = useState(false);

  const loadTasks = async () => {
    const res = await fetch(`/api/tickets/${ticket.id}/tasks`);
    const data = await res.json();
    setWaves(data.waves ?? []);
  };

  useEffect(() => {
    loadTasks().finally(() => setLoading(false));
  }, [ticket.id]);

  // ── Single task actions ──────────────────────────────────────

  const startTask = async (taskId: number) => {
    setBusyTaskId(taskId);
    try {
      await fetch(`/api/tickets/${ticket.id}/implement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", taskId }),
      });
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

  // ── Run helpers ──────────────────────────────────────────────

  const runTasks = async (taskList: TaskRow[]) => {
    const pending = taskList.filter(
      (t) => t.status !== "done" && !t.implementedManually
    );
    for (const task of pending) {
      setBusyTaskId(task.id);
      try {
        await fetch(`/api/tickets/${ticket.id}/implement`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start", taskId: task.id }),
        });
        await new Promise((r) => setTimeout(r, 1000));
        await fetch(`/api/tickets/${ticket.id}/implement`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "complete", taskId: task.id }),
        });
        await loadTasks();
      } catch {
        // continue
      }
    }
    setBusyTaskId(null);
  };

  const runAll = async () => {
    setRunningAll(true);
    await runTasks(waves.flatMap((w) => w.tasks));
    setRunningAll(false);
  };

  const runWave = async (wave: WaveRow) => {
    setRunningWaveId(wave.id);
    await runTasks(wave.tasks);
    setRunningWaveId(null);
  };

  // ── Per-task PR ──────────────────────────────────────────────

  const createTaskPr = async (task: TaskRow) => {
    setCreatingPrTaskId(task.id);
    try {
      await fetch(`/api/tickets/${ticket.id}/implement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-pr", taskId: task.id }),
      });
      await loadTasks();
    } finally {
      setCreatingPrTaskId(null);
    }
  };

  // ── View diff ────────────────────────────────────────────────

  const viewChanges = async (task: TaskRow) => {
    setViewingTask(task);
    setLoadingDiffs(true);
    try {
      const res = await fetch(
        `/api/tickets/${ticket.id}/implement?action=diff&taskId=${task.id}`
      );
      const data = await res.json();
      setDiffs(data.files ?? []);
    } catch {
      setDiffs([]);
    } finally {
      setLoadingDiffs(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────

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

  const isTaskDone = (task: TaskRow) =>
    task.status === "done" || !!task.implementedManually;

  const statusIcon = (task: TaskRow) => {
    if (task.status === "done")
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald shrink-0" />;
    if (task.implementedManually)
      return <Hand className="w-3.5 h-3.5 text-amber shrink-0" />;
    if (task.status === "in-progress" || busyTaskId === task.id)
      return (
        <Loader2 className="w-3.5 h-3.5 text-cyan animate-spin shrink-0" />
      );
    return <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />;
  };

  const wavePendingCount = (wave: WaveRow) =>
    wave.tasks.filter((t) => !isTaskDone(t)).length;

  return (
    <>
      {/* ── Diff modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {viewingTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center"
          >
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setViewingTask(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="relative w-[90vw] h-[85vh] max-w-6xl bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden z-10"
            >
              {/* Modal header */}
              <div className="px-5 py-4 border-b border-border flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center">
                  <FileCode className="w-4 h-4 text-cyan" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">
                    {viewingTask.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {viewingTask.branchName
                      ? `Branch: ${viewingTask.branchName}`
                      : "Changes review"}
                    {diffs.length > 0 &&
                      ` — ${diffs.length} file${diffs.length > 1 ? "s" : ""} changed`}
                  </p>
                </div>
                <button
                  onClick={() => setViewingTask(null)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Diff body */}
              <ScrollArea className="flex-1">
                {loadingDiffs ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : diffs.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                    No changes to display.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {diffs.map((file) => (
                      <div key={file.path}>
                        {/* File header */}
                        <div className="sticky top-0 z-10 px-4 py-2 bg-secondary/80 backdrop-blur-sm border-b border-border flex items-center gap-2">
                          <FileCode className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs font-mono font-medium truncate">
                            {file.path}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ml-auto shrink-0 ${
                              file.status === "added"
                                ? "bg-emerald/15 text-emerald border-emerald/20"
                                : file.status === "deleted"
                                ? "bg-rose/15 text-rose border-rose/20"
                                : "bg-amber/15 text-amber border-amber/20"
                            }`}
                          >
                            {file.status}
                          </span>
                        </div>
                        {/* Hunks */}
                        <div className="font-mono text-xs leading-relaxed">
                          {file.hunks.map((hunk, hi) => (
                            <div key={hi}>
                              <div className="px-4 py-1 bg-sky/5 text-sky text-[11px] border-b border-border/30">
                                @@ -{hunk.oldStart} +{hunk.newStart} @@
                              </div>
                              {hunk.lines.map((line, li) => {
                                const type = line[0];
                                return (
                                  <div
                                    key={li}
                                    className={`px-4 py-0 flex ${
                                      type === "+"
                                        ? "bg-emerald/8 text-emerald"
                                        : type === "-"
                                        ? "bg-rose/8 text-rose"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    <span className="w-5 shrink-0 text-right mr-3 select-none opacity-40">
                                      {type === "+" ? (
                                        <Plus className="w-3 h-3 inline" />
                                      ) : type === "-" ? (
                                        <Minus className="w-3 h-3 inline" />
                                      ) : null}
                                    </span>
                                    <span className="whitespace-pre-wrap break-all">
                                      {line.slice(1)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main layout ────────────────────────────────────────── */}
      <div className="h-full flex flex-col">
        <div className="shrink-0 px-4 py-3 border-b border-border bg-emerald/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-3.5 h-3.5 text-emerald" />
            <span className="text-sm font-medium">
              {doneTasks.length}/{allTasks.length} tasks complete
            </span>
          </div>
          <div className="flex items-center gap-3">
            {!allDone && (
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald text-background hover:bg-emerald/90 gap-1"
                onClick={runAll}
                disabled={runningAll || !!busyTaskId}
              >
                {runningAll ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                Run All
              </Button>
            )}
            <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-emerald rounded-full transition-all"
                style={{
                  width: `${allTasks.length ? (doneTasks.length / allTasks.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4">
          <div className="py-4 space-y-4">
            {waves.map((wave) => {
              const pendingCount = wavePendingCount(wave);
              const isRunningWave = runningWaveId === wave.id;
              return (
                <div
                  key={wave.id}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <div className="px-3 py-2 bg-secondary/50 border-b border-border flex items-center justify-between">
                    <span className="text-sm font-medium">{wave.name}</span>
                    {pendingCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2 gap-1 text-emerald hover:text-emerald"
                        onClick={() => runWave(wave)}
                        disabled={!!busyTaskId || runningAll || isRunningWave}
                      >
                        {isRunningWave ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        Run Wave
                      </Button>
                    )}
                  </div>
                  <div className="divide-y divide-border/50">
                    {wave.tasks.map((task) => {
                      const isDone = isTaskDone(task);
                      const isBusy = busyTaskId === task.id;
                      return (
                        <div
                          key={task.id}
                          className="px-3 py-2.5 flex items-start gap-2"
                        >
                          <div className="mt-0.5">{statusIcon(task)}</div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}
                            >
                              {task.title}
                            </p>
                            {task.branchName && (
                              <div className="flex items-center gap-1 mt-1">
                                <GitBranch className="w-3 h-3 text-muted-foreground" />
                                <code className="text-[11px] text-muted-foreground font-mono">
                                  {task.branchName}
                                </code>
                              </div>
                            )}
                            {task.prUrl && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <GitPullRequest className="w-3 h-3 text-sky" />
                                <a
                                  href={task.prUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-sky hover:underline font-mono"
                                >
                                  PR #{task.prNumber}
                                </a>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {isDone && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs px-2 gap-1"
                                  onClick={() => viewChanges(task)}
                                >
                                  <Eye className="w-3 h-3" />
                                  View
                                </Button>
                                {!task.prUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs px-2 gap-1 text-sky"
                                    onClick={() => createTaskPr(task)}
                                    disabled={creatingPrTaskId === task.id}
                                  >
                                    {creatingPrTaskId === task.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <GitPullRequest className="w-3 h-3" />
                                    )}
                                    Create PR
                                  </Button>
                                )}
                              </>
                            )}
                            {!isDone && !isBusy && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs px-2 gap-1"
                                  onClick={() => startTask(task.id)}
                                >
                                  <Play className="w-3 h-3" />
                                  Run
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs px-2 gap-1"
                                  onClick={() => markManual(task.id)}
                                >
                                  <Hand className="w-3 h-3" />
                                  Manual
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {allDone && (
          <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald" />
              <span className="text-sm text-emerald">
                All tasks implemented
              </span>
            </div>
            <Button
              size="sm"
              className="h-8 text-sm bg-emerald text-background hover:bg-emerald/90 gap-1"
              onClick={onComplete}
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Create PR
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
