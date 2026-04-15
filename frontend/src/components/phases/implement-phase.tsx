"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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
  MessageSquare,
  Wrench,
  Check,
  Trash2,
  AlertTriangle,
  Lightbulb,
  MinusCircle,
  Send,
} from "lucide-react";
import { type Ticket } from "@/lib/fake-data";
import { PipelineStatus } from "@/components/pipeline-status";

interface TodoItem {
  title: string;
  description: string;
  done: boolean;
}

interface TaskRow {
  id: number;
  title: string;
  description: string;
  status: string;
  branchName: string | null;
  prUrl: string | null;
  prNumber: number | null;
  implementedManually: number;
  repoName: string | null;
  todos: TodoItem[];
}

interface FileDiff {
  path: string;
  status: "added" | "modified" | "deleted";
  hunks: { oldStart: number; newStart: number; lines: string[] }[];
}

interface ReviewComment {
  id: number;
  taskId: number;
  file: string;
  line: number;
  content: string;
  priority: "critical" | "suggestion" | "nit";
  author: "ai" | "user";
  status: "open" | "done" | "deleted";
}

interface ImplementPhaseProps {
  ticket: Ticket;
  onComplete: () => void;
}

export function ImplementPhase({ ticket, onComplete }: ImplementPhaseProps) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyTaskIds, setBusyTaskIds] = useState<Set<number>>(new Set());
  const [runningAll, setRunningAll] = useState(false);
  const [creatingPrTaskId, setCreatingPrTaskId] = useState<number | null>(null);
  const [viewingTask, setViewingTask] = useState<TaskRow | null>(null);
  const [diffs, setDiffs] = useState<FileDiff[]>([]);
  const [loadingDiffs, setLoadingDiffs] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Review state
  const [reviewComments, setReviewComments] = useState<ReviewComment[]>([]);
  const [runningReview, setRunningReview] = useState(false);
  const [reviewRan, setReviewRan] = useState(false);
  const [addingCommentLine, setAddingCommentLine] = useState<{ file: string; line: number } | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [fixingCommentId, setFixingCommentId] = useState<number | null>(null);

  // Per-task job progress: { [taskId]: { progress, label, status, error?, errorType? } }
  const [jobProgress, setJobProgress] = useState<Record<number, { progress: number; label: string; status: string; error?: string; errorType?: string }>>({});
  // Live diff state
  const [isLive, setIsLive] = useState(false);
  const livePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadTasks = useCallback(async () => {
    const res = await fetch(`/api/tickets/${ticket.id}/tasks`);
    const data = await res.json();
    const taskList = data.tasks ?? [];
    setTasks(taskList);
    return taskList as TaskRow[];
  }, [ticket.id]);

  useEffect(() => {
    loadTasks().finally(() => setLoading(false));
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (livePollRef.current) clearInterval(livePollRef.current);
    };
  }, [ticket.id, loadTasks]);

  // ── Poll job progress for in-progress tasks ────────────────
  const jobProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const inProgressTasks = tasks
      .filter((t) => t.status === "in-progress");

    if (inProgressTasks.length === 0) {
      if (jobProgressRef.current) {
        clearInterval(jobProgressRef.current);
        jobProgressRef.current = null;
      }
      return;
    }

    const pollJobStatus = async () => {
      const updates: Record<number, { progress: number; label: string; status: string; error?: string; errorType?: string }> = {};
      await Promise.all(
        inProgressTasks.map(async (t) => {
          try {
            const res = await fetch(
              `/api/tickets/${ticket.id}/implement?action=job-status&taskId=${t.id}`
            );
            if (res.ok) {
              const data = await res.json();
              updates[t.id] = {
                progress: data.progress ?? 0,
                label: data.label ?? "Working...",
                status: data.status ?? "running",
                error: data.error,
                errorType: data.errorType,
              };
            }
          } catch { /* ignore */ }
        })
      );
      setJobProgress((prev) => ({ ...prev, ...updates }));
    };

    pollJobStatus();
    jobProgressRef.current = setInterval(pollJobStatus, 3000);
    return () => {
      if (jobProgressRef.current) clearInterval(jobProgressRef.current);
    };
  }, [tasks, ticket.id]);

  // ── Poll until a task leaves "in-progress" ──────────────────

  const waitForTask = useCallback((taskId: number): Promise<void> => {
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        const updatedTasks = await loadTasks();
        const t = updatedTasks.find((t: TaskRow) => t.id === taskId);
        if (!t || t.status !== "in-progress") {
          clearInterval(interval);
          if (pollRef.current === interval) pollRef.current = null;
          resolve();
        }
      }, 3000);
      pollRef.current = interval;
    });
  }, [loadTasks]);

  // ── Single task actions ──────────────────────────────────────

  const startTask = async (taskId: number) => {
    setBusyTaskIds((prev) => new Set(prev).add(taskId));
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/implement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", taskId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        console.error("[implement] Start failed:", data.error);
        setBusyTaskIds((prev) => { const next = new Set(prev); next.delete(taskId); return next; });
        return;
      }
      // Poll until task completes or fails
      await waitForTask(taskId);
      // Fetch final job status to capture any error info
      try {
        const jobRes = await fetch(`/api/tickets/${ticket.id}/implement?action=job-status&taskId=${taskId}`);
        if (jobRes.ok) {
          const jobData = await jobRes.json();
          setJobProgress((prev) => ({
            ...prev,
            [taskId]: {
              progress: jobData.progress ?? 0,
              label: jobData.label ?? "",
              status: jobData.status ?? "done",
              error: jobData.error,
              errorType: jobData.errorType,
            },
          }));
        }
      } catch { /* ignore */ }
      setBusyTaskIds((prev) => { const next = new Set(prev); next.delete(taskId); return next; });
    } catch {
      setBusyTaskIds((prev) => { const next = new Set(prev); next.delete(taskId); return next; });
    }
  };

  const markManual = async (taskId: number) => {
    setBusyTaskIds((prev) => new Set(prev).add(taskId));
    try {
      await fetch(`/api/tickets/${ticket.id}/implement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "manual", taskId }),
      });
      await loadTasks();
    } finally {
      setBusyTaskIds((prev) => { const next = new Set(prev); next.delete(taskId); return next; });
    }
  };

  // ── Run helpers ──────────────────────────────────────────────

  const runAll = async () => {
    setRunningAll(true);
    const pending = tasks.filter(
      (t) => t.status !== "done" && !t.implementedManually
    );
    for (const task of pending) {
      await startTask(task.id);
    }
    setRunningAll(false);
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
    setSelectedFile(null);
    setLoadingDiffs(true);
    setReviewComments([]);
    setReviewRan(false);
    setAddingCommentLine(null);
    setNewCommentText("");

    const taskIsLive = task.status === "in-progress";
    setIsLive(taskIsLive);

    // Stop any previous live poll
    if (livePollRef.current) { clearInterval(livePollRef.current); livePollRef.current = null; }

    try {
      if (taskIsLive) {
        // Load initial job progress
        try {
          const jobRes = await fetch(`/api/tickets/${ticket.id}/implement?action=job-status&taskId=${task.id}`);
          if (jobRes.ok) {
            const jobData = await jobRes.json();
            setJobProgress((prev) => ({
              ...prev,
              [task.id]: { progress: jobData.progress ?? 0, label: jobData.label ?? "Working...", status: jobData.status ?? "running" },
            }));
          }
        } catch { /* ignore */ }

        // Live mode — load from live-diff endpoint
        const res = await fetch(`/api/tickets/${ticket.id}/implement?action=live-diff&taskId=${task.id}`);
        const data = await res.json();
        const files = data.files ?? [];
        setDiffs(files);
        if (files.length > 0) setSelectedFile(files[0].path);

        // Start polling live diff every 5s
        livePollRef.current = setInterval(async () => {
          try {
            // Check if task is still in-progress
            const statusRes = await fetch(`/api/tickets/${ticket.id}/implement?action=job-status&taskId=${task.id}`);
            const statusData = await statusRes.json();

            if (statusData.status === "done") {
              // Task finished — switch to final diff
              clearInterval(livePollRef.current!);
              livePollRef.current = null;
              setIsLive(false);

              const finalRes = await fetch(`/api/tickets/${ticket.id}/implement?action=diff&taskId=${task.id}`);
              const finalData = await finalRes.json();
              const finalFiles = finalData.files ?? [];
              setDiffs(finalFiles);
              if (finalFiles.length > 0) setSelectedFile((prev) => {
                // Keep the current file selected if it still exists
                if (prev && finalFiles.some((f: FileDiff) => f.path === prev)) return prev;
                return finalFiles[0].path;
              });

              // Load review comments now that task is done
              const reviewRes = await fetch(`/api/tickets/${ticket.id}/review?taskId=${task.id}`);
              const reviewData = await reviewRes.json();
              const comments = (reviewData.comments ?? []).filter((c: ReviewComment) => c.status !== "deleted");
              setReviewComments(comments);
              if (comments.length > 0) setReviewRan(true);

              // Refresh tasks list
              loadTasks();
              return;
            }

            if (statusData.status === "failed") {
              clearInterval(livePollRef.current!);
              livePollRef.current = null;
              setIsLive(false);
              loadTasks();
              return;
            }

            // Update job progress for the modal view
            setJobProgress((prev) => ({
              ...prev,
              [task.id]: {
                progress: statusData.progress ?? 0,
                label: statusData.label ?? "Working...",
                status: statusData.status ?? "running",
              },
            }));

            // Still running — refresh live diff
            const liveRes = await fetch(`/api/tickets/${ticket.id}/implement?action=live-diff&taskId=${task.id}`);
            const liveData = await liveRes.json();
            const liveFiles = liveData.files ?? [];
            setDiffs(liveFiles);
            // Auto-select first file if nothing selected yet
            if (liveFiles.length > 0) setSelectedFile((prev) => {
              if (prev && liveFiles.some((f: FileDiff) => f.path === prev)) return prev;
              return liveFiles[0].path;
            });
          } catch { /* ignore poll errors */ }
        }, 5000);
      } else {
        // Static mode — load from DB
        const [diffRes, reviewRes] = await Promise.all([
          fetch(`/api/tickets/${ticket.id}/implement?action=diff&taskId=${task.id}`),
          fetch(`/api/tickets/${ticket.id}/review?taskId=${task.id}`),
        ]);
        const diffData = await diffRes.json();
        const reviewData = await reviewRes.json();
        const files = diffData.files ?? [];
        setDiffs(files);
        if (files.length > 0) setSelectedFile(files[0].path);
        const comments = (reviewData.comments ?? []).filter((c: ReviewComment) => c.status !== "deleted");
        setReviewComments(comments);
        if (comments.length > 0) setReviewRan(true);
      }
    } catch {
      setDiffs([]);
    } finally {
      setLoadingDiffs(false);
    }
  };

  // Clean up live poll when modal closes
  const closeViewer = () => {
    if (livePollRef.current) { clearInterval(livePollRef.current); livePollRef.current = null; }
    setViewingTask(null);
    setIsLive(false);
  };

  // ── Review actions ──────────────────────────────────────────

  const runReview = async () => {
    if (!viewingTask) return;
    setRunningReview(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run-review", taskId: viewingTask.id }),
      });
      const data = await res.json();
      setReviewComments(data.comments ?? []);
      setReviewRan(true);
    } finally {
      setRunningReview(false);
    }
  };

  const addUserComment = async () => {
    if (!viewingTask || !addingCommentLine || !newCommentText.trim()) return;
    const res = await fetch(`/api/tickets/${ticket.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add-comment",
        taskId: viewingTask.id,
        file: addingCommentLine.file,
        line: addingCommentLine.line,
        content: newCommentText.trim(),
      }),
    });
    const data = await res.json();
    if (data.comment) {
      setReviewComments((prev) => [...prev, data.comment]);
    }
    setAddingCommentLine(null);
    setNewCommentText("");
  };

  const updateCommentStatus = async (commentId: number, status: "done" | "deleted") => {
    await fetch(`/api/tickets/${ticket.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-comment", commentId, status }),
    });
    setReviewComments((prev) =>
      status === "deleted"
        ? prev.filter((c) => c.id !== commentId)
        : prev.map((c) => (c.id === commentId ? { ...c, status } : c))
    );
  };

  const fixThis = async (commentId: number) => {
    setFixingCommentId(commentId);
    try {
      await fetch(`/api/tickets/${ticket.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fix-this", commentId }),
      });
      setReviewComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, status: "done" as const } : c))
      );
    } finally {
      setFixingCommentId(null);
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

  const allTasks = tasks;
  const doneTasks = allTasks.filter(
    (t) => t.status === "done" || t.implementedManually
  );
  const allDone = allTasks.length > 0 && doneTasks.length === allTasks.length;
  const allPRsCreated = allDone && doneTasks.every((t) => t.prUrl);

  const isTaskDone = (task: TaskRow) =>
    task.status === "done" || !!task.implementedManually;

  const statusIcon = (task: TaskRow) => {
    if (task.status === "done")
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald shrink-0" />;
    if (task.implementedManually)
      return <Hand className="w-3.5 h-3.5 text-amber shrink-0" />;
    if (task.status === "in-progress" || busyTaskIds.has(task.id))
      return (
        <Loader2 className="w-3.5 h-3.5 text-cyan animate-spin shrink-0" />
      );
    if (jobProgress[task.id]?.status === "failed")
      return <AlertTriangle className="w-3.5 h-3.5 text-amber shrink-0" />;
    return <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />;
  };

  const activeFile = diffs.find((f) => f.path === selectedFile) ?? null;

  const statusBadge = (status: string) => {
    const cls =
      status === "added"
        ? "bg-emerald/15 text-emerald border-emerald/20"
        : status === "deleted"
        ? "bg-rose/15 text-rose border-rose/20"
        : "bg-amber/15 text-amber border-amber/20";
    const label = status === "added" ? "A" : status === "deleted" ? "D" : "M";
    return (
      <span className={`text-[9px] w-4 h-4 rounded flex items-center justify-center border font-bold shrink-0 ${cls}`}>
        {label}
      </span>
    );
  };

  return (
    <>
      {/* ── Diff modal — ADO-style with file browser ───────────── */}
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
              onClick={closeViewer}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="relative w-[92vw] h-[88vh] max-w-7xl bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden z-10"
            >
              {/* Modal header */}
              <div className="px-5 py-3 border-b border-border flex items-center gap-3 shrink-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isLive ? "bg-emerald/10 border border-emerald/20" : "bg-cyan/10 border border-cyan/20"
                }`}>
                  <FileCode className={`w-3.5 h-3.5 ${isLive ? "text-emerald" : "text-cyan"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold truncate">
                      {viewingTask.title}
                    </h3>
                    {isLive && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald/15 border border-emerald/25 text-emerald text-[10px] font-semibold uppercase tracking-wider shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
                        Live
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isLive
                      ? `Watching changes... ${diffs.length} file${diffs.length !== 1 ? "s" : ""} so far`
                      : <>
                          {viewingTask.branchName
                            ? `Branch: ${viewingTask.branchName}`
                            : "Changes review"}
                          {diffs.length > 0 &&
                            ` — ${diffs.length} file${diffs.length > 1 ? "s" : ""} changed`}
                          {reviewComments.filter((c) => c.status === "open").length > 0 &&
                            ` · ${reviewComments.filter((c) => c.status === "open").length} open comment${reviewComments.filter((c) => c.status === "open").length > 1 ? "s" : ""}`}
                        </>
                    }
                  </p>
                </div>
                {!isLive && (
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    variant={reviewRan ? "outline" : "default"}
                    onClick={runReview}
                    disabled={runningReview || diffs.length === 0}
                  >
                    {runningReview ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <MessageSquare className="w-3 h-3" />
                    )}
                    {reviewRan ? "Re-run Review" : "Run Review"}
                  </Button>
                )}
                <button
                  onClick={closeViewer}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body: file browser + diff */}
              <div className="flex-1 flex overflow-hidden">
                {loadingDiffs ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : diffs.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-sm text-muted-foreground gap-3">
                    {isLive ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin text-emerald" />
                        <span className="font-medium">
                          {viewingTask && jobProgress[viewingTask.id]
                            ? jobProgress[viewingTask.id].label
                            : "Starting..."}
                        </span>
                        {viewingTask && jobProgress[viewingTask.id] && (
                          <div className="w-48 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full bg-emerald rounded-full transition-all duration-500"
                                style={{ width: `${jobProgress[viewingTask.id].progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground/60">
                              {jobProgress[viewingTask.id].progress}%
                            </span>
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground/50">
                          Claude is analyzing the codebase. File changes will appear here in real-time.
                        </span>
                      </>
                    ) : (
                      "No changes to display."
                    )}
                  </div>
                ) : (
                  <>
                    {/* Left: file list */}
                    <div className="w-56 shrink-0 border-r border-border bg-secondary/30 flex flex-col">
                      <div className="px-3 py-2 border-b border-border">
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                          Changed Files
                        </span>
                      </div>
                      <ScrollArea className="flex-1">
                        <div className="py-1">
                          {diffs.map((file) => {
                            const fileName = file.path.split("/").pop() ?? file.path;
                            const dirPath = file.path.includes("/")
                              ? file.path.slice(0, file.path.lastIndexOf("/"))
                              : "";
                            const isSelected = selectedFile === file.path;
                            return (
                              <button
                                key={file.path}
                                onClick={() => setSelectedFile(file.path)}
                                className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors ${
                                  isSelected
                                    ? "bg-cyan/10 border-r-2 border-r-cyan"
                                    : "hover:bg-accent"
                                }`}
                              >
                                {statusBadge(file.status)}
                                <div className="min-w-0 flex-1">
                                  <p className={`text-xs font-mono truncate ${isSelected ? "text-foreground font-medium" : "text-foreground"}`}>
                                    {fileName}
                                  </p>
                                  {dirPath && (
                                    <p className="text-[10px] font-mono text-muted-foreground/60 truncate">
                                      {dirPath}
                                    </p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Right: inline diff */}
                    <div className="flex-1 flex flex-col min-w-0">
                      {activeFile ? (
                        <>
                          {/* File path header */}
                          <div className="shrink-0 px-4 py-2 bg-secondary/50 border-b border-border flex items-center gap-2">
                            <FileCode className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs font-mono font-medium truncate">
                              {activeFile.path}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ml-auto shrink-0 ${
                                activeFile.status === "added"
                                  ? "bg-emerald/15 text-emerald border-emerald/20"
                                  : activeFile.status === "deleted"
                                  ? "bg-rose/15 text-rose border-rose/20"
                                  : "bg-amber/15 text-amber border-amber/20"
                              }`}
                            >
                              {activeFile.status}
                            </span>
                          </div>
                          <ScrollArea className="flex-1">
                            <div className="font-mono text-xs leading-relaxed">
                              {activeFile.hunks.map((hunk, hi) => {
                                let oldLine = hunk.oldStart;
                                let newLine = hunk.newStart;
                                return (
                                  <div key={hi}>
                                    <div className="px-4 py-1 bg-sky/5 text-sky text-[11px] border-b border-border/30 sticky top-0 z-10">
                                      @@ -{hunk.oldStart} +{hunk.newStart} @@
                                    </div>
                                    {hunk.lines.map((line, li) => {
                                      const type = line[0];
                                      let ln1 = "";
                                      let ln2 = "";
                                      let currentLine = 0;
                                      if (type === "-") {
                                        ln1 = String(oldLine);
                                        currentLine = oldLine++;
                                      } else if (type === "+") {
                                        ln2 = String(newLine);
                                        currentLine = newLine++;
                                      } else {
                                        ln1 = String(oldLine++);
                                        ln2 = String(newLine);
                                        currentLine = newLine++;
                                      }

                                      // Find comments pinned to this line in this file
                                      const lineComments = reviewComments.filter(
                                        (c) => c.file === activeFile.path && c.line === currentLine && c.status !== "deleted"
                                      );
                                      const isAddingHere =
                                        addingCommentLine?.file === activeFile.path &&
                                        addingCommentLine?.line === currentLine;

                                      return (
                                        <div key={li}>
                                          {/* Diff line */}
                                          <div
                                            className={`group flex ${isLive ? "" : "cursor-pointer"} ${
                                              type === "+"
                                                ? "bg-emerald/8"
                                                : type === "-"
                                                ? "bg-rose/8"
                                                : ""
                                            } ${lineComments.length > 0 ? "border-l-2 border-l-violet/50" : ""}`}
                                            onClick={() => {
                                              if (isLive) return;
                                              setAddingCommentLine({ file: activeFile.path, line: currentLine });
                                              setNewCommentText("");
                                            }}
                                          >
                                            {/* Comment indicator */}
                                            <span className="w-5 shrink-0 flex items-center justify-center">
                                              {lineComments.length > 0 ? (
                                                <MessageSquare className="w-2.5 h-2.5 text-violet" />
                                              ) : (
                                                <Plus className="w-2.5 h-2.5 text-transparent group-hover:text-muted-foreground/40" />
                                              )}
                                            </span>
                                            <span className="w-10 shrink-0 text-right pr-1 select-none text-muted-foreground/30 border-r border-border/20">
                                              {ln1}
                                            </span>
                                            <span className="w-10 shrink-0 text-right pr-1 select-none text-muted-foreground/30 border-r border-border/20">
                                              {ln2}
                                            </span>
                                            <span className={`w-5 shrink-0 text-center select-none ${
                                              type === "+" ? "text-emerald" : type === "-" ? "text-rose" : "text-transparent"
                                            }`}>
                                              {type === "+" ? "+" : type === "-" ? "−" : " "}
                                            </span>
                                            <span className={`whitespace-pre-wrap break-all px-2 ${
                                              type === "+" ? "text-emerald" : type === "-" ? "text-rose" : "text-muted-foreground"
                                            }`}>
                                              {line.slice(1)}
                                            </span>
                                          </div>

                                          {/* Inline comments for this line */}
                                          {lineComments.map((comment) => (
                                            <div
                                              key={comment.id}
                                              className={`ml-5 mr-4 my-1 rounded-lg border text-xs font-sans ${
                                                comment.status === "done"
                                                  ? "bg-muted/50 border-border/50 opacity-60"
                                                  : comment.priority === "critical"
                                                  ? "bg-rose/5 border-rose/20"
                                                  : comment.priority === "suggestion"
                                                  ? "bg-amber/5 border-amber/20"
                                                  : "bg-muted/30 border-border"
                                              }`}
                                            >
                                              <div className="px-3 py-2 flex items-start gap-2">
                                                <span className="shrink-0 mt-0.5">
                                                  {comment.priority === "critical" ? (
                                                    <AlertTriangle className="w-3 h-3 text-rose" />
                                                  ) : comment.priority === "suggestion" ? (
                                                    <Lightbulb className="w-3 h-3 text-amber" />
                                                  ) : (
                                                    <MinusCircle className="w-3 h-3 text-muted-foreground" />
                                                  )}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="font-medium text-[10px] uppercase tracking-wider text-muted-foreground">
                                                      {comment.author === "ai" ? "AI Review" : "You"}
                                                    </span>
                                                    {comment.status === "done" && (
                                                      <span className="text-[10px] text-emerald">✓ resolved</span>
                                                    )}
                                                  </div>
                                                  <p className="text-foreground/80 leading-relaxed">{comment.content}</p>
                                                </div>
                                                {comment.status === "open" && (
                                                  <div className="flex items-center gap-0.5 shrink-0">
                                                    <button
                                                      onClick={(e) => { e.stopPropagation(); fixThis(comment.id); }}
                                                      disabled={fixingCommentId === comment.id}
                                                      className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-violet hover:bg-violet/10 transition-colors"
                                                      title="Fix this"
                                                    >
                                                      {fixingCommentId === comment.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                      ) : (
                                                        <Wrench className="w-3 h-3" />
                                                      )}
                                                    </button>
                                                    <button
                                                      onClick={(e) => { e.stopPropagation(); updateCommentStatus(comment.id, "done"); }}
                                                      className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-emerald hover:bg-emerald/10 transition-colors"
                                                      title="Mark as done"
                                                    >
                                                      <Check className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                      onClick={(e) => { e.stopPropagation(); updateCommentStatus(comment.id, "deleted"); }}
                                                      className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-rose hover:bg-rose/10 transition-colors"
                                                      title="Delete"
                                                    >
                                                      <Trash2 className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ))}

                                          {/* Add comment form */}
                                          {isAddingHere && (
                                            <div className="ml-5 mr-4 my-1 rounded-lg border border-violet/30 bg-violet/5 p-2 font-sans">
                                              <Textarea
                                                autoFocus
                                                value={newCommentText}
                                                onChange={(e) => setNewCommentText(e.target.value)}
                                                placeholder="Add a comment..."
                                                className="min-h-[60px] text-xs bg-background/50 border-border resize-none"
                                                onKeyDown={(e) => {
                                                  if (e.key === "Escape") setAddingCommentLine(null);
                                                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addUserComment();
                                                }}
                                              />
                                              <div className="flex justify-end gap-1.5 mt-1.5">
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-6 text-[11px] px-2"
                                                  onClick={() => setAddingCommentLine(null)}
                                                >
                                                  Cancel
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  className="h-6 text-[11px] px-2 gap-1"
                                                  onClick={addUserComment}
                                                  disabled={!newCommentText.trim()}
                                                >
                                                  <Send className="w-2.5 h-2.5" />
                                                  Comment
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                          Select a file to view changes
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
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
                disabled={runningAll || busyTaskIds.size > 0}
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
          <div className="py-4">
            <div className="divide-y divide-border/50">
              {tasks.map((task) => {
                const isDone = isTaskDone(task);
                const isBusy = busyTaskIds.has(task.id);
                return (
                  <div
                    key={task.id}
                    className="px-3 py-2.5 flex items-start gap-2"
                  >
                    <div className="mt-0.5">{statusIcon(task)}</div>
                    <div className="flex-1 min-w-0">
                      {/* 1. Task name — full row, wraps */}
                      <p
                        className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}
                      >
                        {task.title}
                      </p>
                      {/* 2. Repo name + action buttons */}
                      <div className="flex items-center gap-2 mt-1">
                        {task.repoName && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium bg-sky/15 text-sky border-sky/20 shrink-0">
                            {task.repoName}
                          </span>
                        )}
                        {(isDone || task.status === "in-progress") && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-5 text-[10px] px-1.5 gap-1 ${task.status === "in-progress" ? "text-emerald" : ""}`}
                              onClick={() => viewChanges(task)}
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </Button>
                            {isDone && !task.prUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 text-[10px] px-1.5 gap-1 text-sky"
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
                      </div>
                      {/* 3. Todo checklist — done items get strikethrough + green check, active item highlighted */}
                      {task.todos && task.todos.length > 0 && (() => {
                        const allDoneOverride = isDone; // task done → all todos done
                        const firstUndone = task.status === "in-progress" ? task.todos.findIndex((t) => !t.done) : -1;
                        return (
                          <div className="mt-1 space-y-0">
                            {task.todos.map((todo, idx) => {
                              const todoDone = allDoneOverride || todo.done;
                              const isActive = idx === firstUndone;
                              return (
                                <div key={idx} className="flex items-center gap-1.5">
                                  {todoDone ? (
                                    <CheckCircle2 className="w-3 h-3 text-emerald shrink-0" />
                                  ) : isActive ? (
                                    <div className="w-3 h-3 shrink-0 rounded-full border border-amber flex items-center justify-center">
                                      <div className="w-1.5 h-1.5 rounded-full bg-amber" />
                                    </div>
                                  ) : (
                                    <Circle className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                                  )}
                                  <span className={`text-xs ${
                                    todoDone ? "text-muted-foreground line-through"
                                    : isActive ? "text-foreground font-medium"
                                    : "text-foreground/80"
                                  }`}>
                                    {todo.title}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                      {/* Per-task progress bar + label for in-progress tasks */}
                      {task.status === "in-progress" && jobProgress[task.id] && (
                        <div className="mt-1.5 space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full bg-cyan rounded-full transition-all duration-500"
                                style={{ width: `${jobProgress[task.id].progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                              {jobProgress[task.id].progress}%
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {jobProgress[task.id].label}
                          </p>
                        </div>
                      )}
                      {/* Error message for failed tasks */}
                      {task.status === "pending" && jobProgress[task.id]?.status === "failed" && jobProgress[task.id]?.error && (
                        <div className="mt-1.5 flex items-start gap-1.5 text-xs text-amber">
                          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>{jobProgress[task.id].error}</span>
                        </div>
                      )}
                      {/* 4. Branch name */}
                      {task.branchName && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <GitBranch className="w-3 h-3 text-muted-foreground" />
                          <code className="text-[11px] text-muted-foreground font-mono">
                            {task.branchName}
                          </code>
                        </div>
                      )}
                      {/* 5. PR link */}
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
                      {/* 6. CI/CD statuses */}
                      {task.prNumber && (
                        <PipelineStatus
                          ticketId={Number(ticket.id)}
                          taskId={task.id}
                          prNumber={task.prNumber}
                        />
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!isDone && task.status !== "in-progress" && !isBusy && (() => {
                        const hasFailed = jobProgress[task.id]?.status === "failed";
                        const isNoChanges = hasFailed && jobProgress[task.id]?.errorType === "no_changes";
                        return (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs px-2 gap-1"
                              onClick={() => startTask(task.id)}
                            >
                              <Play className="w-3 h-3" />
                              {hasFailed ? "Retry" : "Run"}
                            </Button>
                            {isNoChanges && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs px-2 gap-1 text-emerald"
                                onClick={() => markManual(task.id)}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Mark Done
                              </Button>
                            )}
                            {!isNoChanges && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs px-2 gap-1"
                                onClick={() => markManual(task.id)}
                              >
                                <Hand className="w-3 h-3" />
                                Manual
                              </Button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>

        {allDone && (
          <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald" />
              <span className="text-sm text-emerald">
                {allPRsCreated
                  ? "All tasks implemented and PRs created"
                  : "All tasks implemented — create PRs to complete"}
              </span>
            </div>
            <Button
              size="sm"
              className="h-8 text-sm bg-emerald text-background hover:bg-emerald/90 gap-1"
              onClick={onComplete}
              disabled={!allPRsCreated}
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Complete
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
