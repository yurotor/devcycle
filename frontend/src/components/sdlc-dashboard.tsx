"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  TestTube,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Loader2,
  ChevronRight,
  Shield,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SdlcPhaseConfig } from "@/components/sdlc-phase-config";

// ─── Types ──────────────────────────────────────────────────────

interface SdlcEpic {
  id: number;
  workspaceId: number;
  jiraKey: string;
  title: string;
  description: string | null;
  status: string;
  assignee: string | null;
  sdlcPhase: string;
  lastSyncedAt: number;
  hasDesignDoc: boolean;
  hasTestPlan: boolean;
  designDocStatus: string | null;
  testPlanStatus: string | null;
  signoffsPending: number;
  signoffsApproved: number;
  signoffsTotal: number;
}

const PHASE_ORDER = ["design", "development", "testing", "deployed"] as const;

const PHASE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  design: { label: "Design", color: "text-violet", bg: "bg-violet/10", border: "border-violet/20" },
  development: { label: "Development", color: "text-cyan", bg: "bg-cyan/10", border: "border-cyan/20" },
  testing: { label: "Testing", color: "text-amber", bg: "bg-amber/10", border: "border-amber/20" },
  deployed: { label: "Deployed", color: "text-emerald", bg: "bg-emerald/10", border: "border-emerald/20" },
};

// ─── Component ──────────────────────────────────────────────────

export function SdlcDashboard({
  wsId,
  workspaces,
  onEpicClick,
}: {
  wsId: number | null;
  workspaces: Array<{ id: number; name: string }>;
  onEpicClick: (epicId: number) => void;
}) {
  const [epics, setEpics] = useState<SdlcEpic[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sdlcWsId, setSdlcWsId] = useState<number | null>(wsId);
  const [sortField, setSortField] = useState<"jiraKey" | "sdlcPhase" | "title">("sdlcPhase");
  const [sortAsc, setSortAsc] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  const activeWsId = sdlcWsId ?? wsId;

  const fetchEpics = useCallback(async () => {
    if (!activeWsId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sdlc/epics?wsId=${activeWsId}`);
      if (res.ok) {
        const data = await res.json();
        const loaded = data.epics ?? [];
        setEpics(loaded);
        return loaded.length;
      }
    } finally {
      setLoading(false);
    }
    return 0;
  }, [activeWsId]);

  useEffect(() => {
    fetchEpics().then((count) => {
      if (count === 0 && activeWsId) {
        // Auto-sync on first load when empty
        setSyncing(true);
        fetch(`/api/sdlc/sync?wsId=${activeWsId}`, { method: "POST" })
          .then(() => fetchEpics())
          .finally(() => setSyncing(false));
      }
    });
  }, [fetchEpics, activeWsId]);

  const syncEpics = async () => {
    if (!activeWsId) return;
    setSyncing(true);
    try {
      await fetch(`/api/sdlc/sync?wsId=${activeWsId}`, { method: "POST" });
      await fetchEpics();
    } finally {
      setSyncing(false);
    }
  };

  // ── Alert metrics ──

  const missingDesignDocs = epics.filter(
    (e) => !e.hasDesignDoc && e.sdlcPhase !== "design"
  );
  const missingTestPlans = epics.filter(
    (e) => !e.hasTestPlan && (e.sdlcPhase === "testing" || e.sdlcPhase === "deployed")
  );
  const pendingSignoffs = epics.filter((e) => e.signoffsPending > 0);
  const staleDrafts = epics.filter(
    (e) =>
      (e.designDocStatus === "draft" || e.testPlanStatus === "draft") &&
      e.hasDesignDoc
  );

  // ── Phase distribution ──

  const phaseGroups = PHASE_ORDER.map((phase) => ({
    phase,
    config: PHASE_CONFIG[phase],
    epics: epics.filter((e) => e.sdlcPhase === phase),
  }));

  // ── Sorting ──

  const sorted = [...epics].sort((a, b) => {
    let cmp = 0;
    if (sortField === "jiraKey") cmp = a.jiraKey.localeCompare(b.jiraKey);
    else if (sortField === "title") cmp = a.title.localeCompare(b.title);
    else cmp = PHASE_ORDER.indexOf(a.sdlcPhase as any) - PHASE_ORDER.indexOf(b.sdlcPhase as any);
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-lg font-semibold tracking-tight">SDLC Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {epics.length} active epic{epics.length !== 1 ? "s" : ""} across{" "}
              {phaseGroups.filter((g) => g.epics.length > 0).length} phases
            </p>
          </div>

          {/* Workspace dropdown */}
          {workspaces.length > 1 && (
            <Select
              value={String(activeWsId ?? "")}
              onChange={(v) => setSdlcWsId(parseInt(v, 10))}
              options={workspaces.map((ws) => ({ value: String(ws.id), label: ws.name }))}
            />
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={syncEpics}
            disabled={syncing}
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Jira"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setShowConfig(!showConfig)}
            title="Phase mapping settings"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Phase config */}
        {showConfig && activeWsId && (
          <SdlcPhaseConfig
            wsId={activeWsId}
            onClose={() => setShowConfig(false)}
          />
        )}

        {/* Alert cards */}
        <div className="grid grid-cols-4 gap-3">
          <AlertCard
            icon={FileText}
            label="Missing Design Docs"
            count={missingDesignDocs.length}
            color="text-rose"
            bg="bg-rose/10"
            border="border-rose/20"
          />
          <AlertCard
            icon={TestTube}
            label="Missing Test Plans"
            count={missingTestPlans.length}
            color="text-amber"
            bg="bg-amber/10"
            border="border-amber/20"
          />
          <AlertCard
            icon={Clock}
            label="Pending Signoffs"
            count={pendingSignoffs.length}
            color="text-violet"
            bg="bg-violet/10"
            border="border-violet/20"
          />
          <AlertCard
            icon={FileText}
            label="Stale Drafts"
            count={staleDrafts.length}
            color="text-muted-foreground"
            bg="bg-secondary"
            border="border-border"
          />
        </div>

        {/* Phase pipeline */}
        <div className="grid grid-cols-4 gap-3">
          {phaseGroups.map(({ phase, config, epics: phaseEpics }) => (
            <div
              key={phase}
              className={`rounded-lg border ${config.border} ${config.bg} p-3`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-sm font-medium ${config.color}`}>
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {phaseEpics.length}
                </span>
              </div>
              <div className="space-y-1">
                {phaseEpics.slice(0, 5).map((epic) => (
                  <button
                    key={epic.id}
                    onClick={() => onEpicClick(epic.id)}
                    className="w-full text-left px-2 py-1.5 rounded text-xs bg-background/60 hover:bg-background transition-colors truncate"
                  >
                    <span className="text-muted-foreground">{epic.jiraKey}</span>{" "}
                    {epic.title}
                  </button>
                ))}
                {phaseEpics.length > 5 && (
                  <span className="text-[10px] text-muted-foreground px-2">
                    +{phaseEpics.length - 5} more
                  </span>
                )}
                {phaseEpics.length === 0 && (
                  <span className="text-[10px] text-muted-foreground px-2">
                    No epics
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Epic table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
                <SortHeader field="jiraKey" current={sortField} asc={sortAsc} onClick={handleSort}>
                  Epic
                </SortHeader>
                <SortHeader field="title" current={sortField} asc={sortAsc} onClick={handleSort}>
                  Title
                </SortHeader>
                <SortHeader field="sdlcPhase" current={sortField} asc={sortAsc} onClick={handleSort}>
                  Phase
                </SortHeader>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Design Doc</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Test Plan</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Signoffs</th>
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((epic) => {
                const pc = PHASE_CONFIG[epic.sdlcPhase] ?? PHASE_CONFIG.design;
                return (
                  <tr
                    key={epic.id}
                    onClick={() => onEpicClick(epic.id)}
                    className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {epic.jiraKey}
                    </td>
                    <td className="px-3 py-2 max-w-[300px] truncate">{epic.title}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${pc.bg} ${pc.color} border ${pc.border}`}>
                        {pc.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <ArtifactBadge has={epic.hasDesignDoc} status={epic.designDocStatus} />
                    </td>
                    <td className="px-3 py-2">
                      <ArtifactBadge has={epic.hasTestPlan} status={epic.testPlanStatus} />
                    </td>
                    <td className="px-3 py-2">
                      <SignoffBadge
                        approved={epic.signoffsApproved}
                        total={epic.signoffsTotal}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    No epics found. Click "Sync Jira" to load epics.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function AlertCard({
  icon: Icon,
  label,
  count,
  color,
  bg,
  border,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <div className={`rounded-lg border ${border} ${bg} p-3`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className={`text-2xl font-semibold ${count > 0 ? color : "text-muted-foreground"}`}>
          {count}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground mt-1 block">{label}</span>
    </div>
  );
}

function ArtifactBadge({ has, status }: { has: boolean; status: string | null }) {
  if (!has) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-rose/80">
        <AlertTriangle className="w-3 h-3" /> Missing
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald">
        <CheckCircle className="w-3 h-3" /> Approved
      </span>
    );
  }
  if (status === "reviewed") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-cyan">
        <CheckCircle className="w-3 h-3" /> Reviewed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-amber">
      <FileText className="w-3 h-3" /> Draft
    </span>
  );
}

function SignoffBadge({ approved, total }: { approved: number; total: number }) {
  if (total === 0) {
    return <span className="text-[10px] text-muted-foreground">—</span>;
  }
  const allApproved = approved === total;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] ${
        allApproved ? "text-emerald" : "text-amber"
      }`}
    >
      <Shield className="w-3 h-3" />
      {approved}/{total}
    </span>
  );
}

function SortHeader({
  field,
  current,
  asc,
  onClick,
  children,
}: {
  field: string;
  current: string;
  asc: boolean;
  onClick: (field: any) => void;
  children: React.ReactNode;
}) {
  const active = field === current;
  return (
    <th
      className="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
      onClick={() => onClick(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active && (
          <span className="text-[9px]">{asc ? "▲" : "▼"}</span>
        )}
      </span>
    </th>
  );
}
