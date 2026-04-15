"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  CheckCircle2,
  Loader2,
  XCircle,
  ExternalLink,
  RotateCcw,
  Copy,
  Wrench,
  Rocket,
  PauseCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Types (matching API response) ───────────────────────────────

interface PipelineStage {
  id: number;
  stageName: string;
  stageOrder: number;
  status: string;
  durationMs: number | null;
}

interface FailureAnalysis {
  summary: string;
  issueType: "code" | "infrastructure" | "unknown";
  suggestedFix: string | null;
}

interface PipelineRun {
  id: number;
  taskId: number;
  pipelineType: string;
  status: string;
  jenkinsUrl: string | null;
  jenkinsBuildNumber: number | null;
  stages: PipelineStage[];
  failureAnalysis: FailureAnalysis | null;
  startedAt: number | null;
  finishedAt: number | null;
}

interface TaskPipelineStatus {
  taskId: number;
  prNumber: number | null;
  prMerged: boolean;
  pullRequest: PipelineRun | null;
  autoDeploy: PipelineRun | null;
}

// ─── Helpers ────────────────────────────────────────────────────

function phaseName(stage: PipelineStage): string {
  const name = stage.stageName;
  if (/load|init|properties/i.test(name)) return "Load";
  if (/build/i.test(name)) return "Build";
  if (/test/i.test(name)) return "Test";
  if (/deploy/i.test(name)) return "Deploy";
  if (/approv/i.test(name)) return "Approval";
  return name;
}

const ISSUE_TYPE_STYLES: Record<string, string> = {
  code: "bg-violet/15 text-violet border-violet/20",
  infrastructure: "bg-amber/15 text-amber border-amber/20",
  unknown: "bg-muted text-muted-foreground border-border",
};

// ─── Failure Detail ────────────────────────────────────────────

function FailureDetail({
  run,
  ticketId,
  onFixAndRepush,
}: {
  run: PipelineRun;
  ticketId: number;
  onFixAndRepush?: (runId: number) => void;
}) {
  const [analysis, setAnalysis] = useState<FailureAnalysis | null>(run.failureAnalysis);
  const [analyzing, setAnalyzing] = useState(false);
  const triggered = useRef(false);

  const triggerAnalysis = useCallback(async () => {
    if (analysis || analyzing || triggered.current) return;
    triggered.current = true;
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", pipelineRunId: run.id, force: true }),
      });
      const data = await res.json();
      if (data.analysis) setAnalysis(data.analysis);
    } catch { /* ignore */ }
    finally { setAnalyzing(false); }
  }, [analysis, analyzing, ticketId, run.id]);

  useEffect(() => {
    if (!analysis) triggerAnalysis();
  }, [analysis, triggerAnalysis]);

  useEffect(() => {
    if (run.failureAnalysis && !analysis) setAnalysis(run.failureAnalysis);
  }, [run.failureAnalysis, analysis]);

  if (analyzing && !analysis) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
        <span className="text-[10px] text-muted-foreground">Analyzing...</span>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex items-start gap-1.5">
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {analysis.summary}
        </p>
        <Badge className={`shrink-0 text-[9px] ${ISSUE_TYPE_STYLES[analysis.issueType]}`}>
          {analysis.issueType}
        </Badge>
      </div>
      {analysis.suggestedFix && (
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed line-clamp-2">
          Fix: {analysis.suggestedFix}
        </p>
      )}
      {analysis.issueType === "code" && onFixAndRepush && (
        <Button
          size="sm"
          className="h-6 text-[10px] bg-violet text-white hover:bg-violet/90 gap-1"
          onClick={() => onFixAndRepush(run.id)}
        >
          <Wrench className="w-3 h-3" />
          Fix & Re-push
        </Button>
      )}
    </div>
  );
}

// ─── Inline Action Buttons ──────────────────────────────────────

function FailureActions({
  run,
  ticketId,
}: {
  run: PipelineRun;
  ticketId: number;
}) {
  const [rerunning, setRerunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRerun = async () => {
    setRerunning(true);
    try {
      await fetch(`/api/tickets/${ticketId}/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rerun", pipelineRunId: run.id }),
      });
    } finally {
      setRerunning(false);
    }
  };

  const handleCopyError = () => {
    const text = run.failureAnalysis
      ? `Pipeline Failure: ${run.failureAnalysis.summary}\n\nSuggested Fix: ${run.failureAnalysis.suggestedFix ?? "N/A"}`
      : `Pipeline ${run.pipelineType} failed at build #${run.jenkinsBuildNumber}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={handleRerun}
        disabled={rerunning}
        className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        title="Rerun job"
      >
        {rerunning ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <RotateCcw className="w-3 h-3" />
        )}
      </button>
      <button
        onClick={handleCopyError}
        className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        title={copied ? "Copied!" : "Copy error"}
      >
        <Copy className="w-3 h-3" />
      </button>
    </>
  );
}

// ─── Main Component ─────────────────────────────────────────────

interface PipelineStatusProps {
  ticketId: number;
  taskId: number;
  prNumber: number | null;
}

export function PipelineStatus({ ticketId, taskId, prNumber }: PipelineStatusProps) {
  const [status, setStatus] = useState<TaskPipelineStatus | null>(null);
  const [fixing, setFixing] = useState<"running" | "done" | "failed" | null>(null);
  const [fixError, setFixError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fixPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/pipeline?action=status`);
      const data = await res.json();
      const taskStatus = (data.statuses as TaskPipelineStatus[])?.find(
        (s) => s.taskId === taskId
      );
      setStatus(taskStatus ?? null);
    } catch { /* ignore */ }
  }, [ticketId, taskId]);

  useEffect(() => {
    if (!prNumber) return;
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus, prNumber]);

  const pollFixStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/implement?action=job-status&taskId=${taskId}`);
      const data = await res.json();
      if (data.status === "done") {
        setFixing("done");
        if (fixPollRef.current) clearInterval(fixPollRef.current);
        setTimeout(fetchStatus, 3000);
        setTimeout(() => setFixing(null), 5000);
      } else if (data.status === "failed") {
        setFixing("failed");
        setFixError(data.error?.slice(0, 200) ?? "Fix failed");
        if (fixPollRef.current) clearInterval(fixPollRef.current);
        setTimeout(() => { setFixing(null); setFixError(null); }, 10000);
      }
    } catch { /* ignore */ }
  }, [ticketId, taskId, fetchStatus]);

  useEffect(() => {
    return () => { if (fixPollRef.current) clearInterval(fixPollRef.current); };
  }, []);

  const handleFixAndRepush = async (runId: number) => {
    setFixing("running");
    setFixError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fix-and-repush", pipelineRunId: runId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFixing("failed");
        setFixError(data.error ?? "Fix request failed");
        setTimeout(() => { setFixing(null); setFixError(null); }, 10000);
        return;
      }
      fixPollRef.current = setInterval(pollFixStatus, 5_000);
    } catch {
      setFixing(null);
    }
  };

  if (!prNumber || !status) return null;

  const ci = status.pullRequest;
  const cd = status.autoDeploy;
  if (!ci && !cd) return null;

  if (fixing === "running") {
    return (
      <div className="mt-2 flex items-center gap-1.5 pl-0.5">
        <Rocket className="w-3 h-3 text-muted-foreground shrink-0" />
        <Loader2 className="w-3.5 h-3.5 text-violet animate-spin shrink-0" />
        <span className="text-xs text-violet font-medium">Fixing & re-pushing...</span>
      </div>
    );
  }
  if (fixing === "done") {
    return (
      <div className="mt-2 flex items-center gap-1.5 pl-0.5">
        <Rocket className="w-3 h-3 text-muted-foreground shrink-0" />
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald shrink-0" />
        <span className="text-xs text-emerald font-medium">Fix pushed, waiting for CI...</span>
      </div>
    );
  }
  if (fixing === "failed") {
    return (
      <div className="mt-2 flex items-center gap-1.5 pl-0.5">
        <Rocket className="w-3 h-3 text-muted-foreground shrink-0" />
        <XCircle className="w-3.5 h-3.5 text-rose shrink-0" />
        <span className="text-xs text-rose font-medium">Fix failed</span>
        {fixError && <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{fixError}</span>}
      </div>
    );
  }

  // Determine CI (ADO gate) vs Pull Request Build (Jenkins) state
  // ci run with no jenkinsBuildNumber = still in ADO CI phase
  // ci run with jenkinsBuildNumber = Jenkins Pull Request Build phase
  const ciIsAdoPhase = ci && !ci.jenkinsBuildNumber;
  const ciIsJenkinsPhase = ci && !!ci.jenkinsBuildNumber;
  const ciStatus = ci?.status;
  const cdStatus = cd?.status;

  const cdActiveStage = cd?.stages.find((s) => s.status === "running" || s.status === "paused");
  const cdFailedStage = cd?.stages.find((s) => s.status === "failure");
  const cdPhase = cdFailedStage ? phaseName(cdFailedStage) : cdActiveStage ? phaseName(cdActiveStage) : null;

  const jenkinsFailedStage = ci?.stages.find((s) => s.status === "failure");
  const jenkinsPhase = jenkinsFailedStage ? phaseName(jenkinsFailedStage) : null;
  const jenkinsActiveStage = ci?.stages.find((s) => s.status === "running");
  const jenkinsRunningPhase = jenkinsActiveStage ? phaseName(jenkinsActiveStage) : null;

  const failedRun = cdStatus === "failure" ? cd : ciStatus === "failure" ? ci : null;

  return (
    <div className="mt-2 space-y-1">
      {/* ── Row 1: CI (ADO gate) ── */}
      {ci && !cd && (
        <div className="flex items-center gap-1.5 pl-0.5">
          <span className="text-[10px] text-muted-foreground font-medium w-6 shrink-0">CI</span>
          {ciIsAdoPhase && ciStatus === "pending" && (
            <>
              <Loader2 className="w-3 h-3 text-muted-foreground/50 animate-spin shrink-0" />
              <span className="text-xs text-muted-foreground">Running...</span>
            </>
          )}
          {ciIsAdoPhase && ciStatus === "running" && (
            <>
              <Loader2 className="w-3 h-3 text-cyan animate-spin shrink-0" />
              <span className="text-xs text-cyan font-medium">Running...</span>
            </>
          )}
          {ciIsAdoPhase && ciStatus === "failure" && (
            <>
              <XCircle className="w-3 h-3 text-rose shrink-0" />
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-rose font-medium hover:underline underline-offset-2 decoration-rose/40 cursor-pointer transition-colors"
              >
                Failed
              </button>
              <FailureActions run={ci} ticketId={ticketId} />
            </>
          )}
          {ciIsJenkinsPhase && (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald shrink-0" />
              <span className="text-xs text-emerald font-medium">Passed</span>
            </>
          )}
          {ciStatus === "success" && (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald shrink-0" />
              <span className="text-xs text-emerald font-medium">Passed</span>
            </>
          )}
        </div>
      )}

      {/* ── Row 2: Pull Request Build (Jenkins) — only when Jenkins build exists or CI done ── */}
      {ci && !cd && (ciIsJenkinsPhase || ciStatus === "success" || ciStatus === "failure") && ciIsJenkinsPhase && (
        <div className="flex items-center gap-1.5 pl-0.5">
          <span className="text-[10px] text-muted-foreground font-medium w-6 shrink-0">Build</span>
          {ciStatus === "running" && (
            <>
              <Loader2 className="w-3 h-3 text-cyan animate-spin shrink-0" />
              <span className="text-xs text-cyan font-medium">
                {jenkinsRunningPhase ? `Running: ${jenkinsRunningPhase}...` : "Running..."}
              </span>
            </>
          )}
          {ciStatus === "success" && (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald shrink-0" />
              <span className="text-xs text-emerald font-medium">Passed</span>
            </>
          )}
          {ciStatus === "failure" && (
            <>
              <XCircle className="w-3 h-3 text-rose shrink-0" />
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-rose font-medium hover:underline underline-offset-2 decoration-rose/40 cursor-pointer transition-colors"
              >
                {jenkinsPhase ? `Failed at ${jenkinsPhase}` : "Failed"}
              </button>
              <FailureActions run={ci} ticketId={ticketId} />
            </>
          )}
          {ci.jenkinsUrl && (
            <a
              href={ci.jenkinsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
              title="Open in Jenkins"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* ── Post-merge: CI + Build passed, show Deploy row ── */}
      {cd && (
        <>
          {/* Collapsed CI + Build summary */}
          <div className="flex items-center gap-1.5 pl-0.5">
            <span className="text-[10px] text-muted-foreground font-medium w-6 shrink-0">CI</span>
            <CheckCircle2 className="w-3 h-3 text-emerald/50 shrink-0" />
            <span className="text-[10px] text-muted-foreground">Passed</span>
            <span className="text-[10px] text-muted-foreground font-medium ml-2">Build</span>
            <CheckCircle2 className="w-3 h-3 text-emerald/50 shrink-0" />
            <span className="text-[10px] text-muted-foreground">Passed</span>
          </div>
          {/* Deploy row */}
          <div className="flex items-center gap-1.5 pl-0.5">
            <span className="text-[10px] text-muted-foreground font-medium w-6 shrink-0">Deploy</span>
            {cdStatus === "success" && (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald shrink-0" />
                <span className="text-xs text-emerald font-medium">Deployed</span>
              </>
            )}
            {cdStatus === "running" && cdActiveStage?.status !== "paused" && (
              <>
                <Loader2 className="w-3 h-3 text-cyan animate-spin shrink-0" />
                <span className="text-xs text-cyan font-medium">
                  {cdPhase ? `${cdPhase}...` : "Deploying..."}
                </span>
              </>
            )}
            {cdStatus === "running" && cdActiveStage?.status === "paused" && (
              <>
                <PauseCircle className="w-3 h-3 text-amber shrink-0" />
                <span className="text-xs text-amber font-medium">
                  {cdPhase ?? "Awaiting Approval"}
                </span>
              </>
            )}
            {cdStatus === "pending" && (
              <>
                <Loader2 className="w-3 h-3 text-muted-foreground/50 animate-spin shrink-0" />
                <span className="text-xs text-muted-foreground">Pending...</span>
              </>
            )}
            {cdStatus === "failure" && cd && (
              <>
                <XCircle className="w-3 h-3 text-rose shrink-0" />
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-rose font-medium hover:underline underline-offset-2 decoration-rose/40 cursor-pointer transition-colors"
                >
                  {cdPhase ? `Failed at ${cdPhase}` : "Failed"}
                </button>
                <FailureActions run={cd} ticketId={ticketId} />
              </>
            )}
            {cd?.jenkinsUrl && (
              <a
                href={cd.jenkinsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                title="Open in Jenkins"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </>
      )}

      {expanded && failedRun && (
        <FailureDetail
          run={failedRun}
          ticketId={ticketId}
          onFixAndRepush={handleFixAndRepush}
        />
      )}
    </div>
  );
}

// ─── Aggregate badge for kanban ─────────────────────────────────

export function DeployBadge({ ticketId }: { ticketId: number }) {
  const [statuses, setStatuses] = useState<TaskPipelineStatus[]>([]);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const res = await fetch(`/api/tickets/${ticketId}/pipeline?action=status`);
        const data = await res.json();
        setStatuses(data.statuses ?? []);
      } catch { /* ignore */ }
    };
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 30_000);
    return () => clearInterval(interval);
  }, [ticketId]);

  if (statuses.length === 0) return null;

  const deployed = statuses.filter(
    (s) => s.autoDeploy?.status === "success"
  ).length;
  const failing = statuses.filter(
    (s) =>
      s.pullRequest?.status === "failure" || s.autoDeploy?.status === "failure"
  ).length;
  const total = statuses.length;

  if (failing > 0) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose/15 text-rose border border-rose/20 font-medium">
        {failing} failing
      </span>
    );
  }

  if (deployed > 0) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald/15 text-emerald border border-emerald/20 font-medium">
        {deployed}/{total} deployed
      </span>
    );
  }

  const running = statuses.filter(
    (s) =>
      s.pullRequest?.status === "running" || s.autoDeploy?.status === "running"
  ).length;
  if (running > 0) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan/15 text-cyan border border-cyan/20 font-medium">
        {running} running
      </span>
    );
  }

  return null;
}
