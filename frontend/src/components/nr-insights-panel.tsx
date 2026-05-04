"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Zap,
  BarChart3,
  Settings,
  Check,
  X,
  Clock,
  Database,
  TrendingUp,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface NrInsight {
  id: number;
  connectionId: number;
  appName: string;
  metricType: string;
  metricLabel: string | null;
  currentValue: number;
  baselineValue: number;
  severity: string;
  nrqlQuery: string | null;
  diagnosis: string | null;
  fixSuggestion: string | null;
  fixPrd: string | null;
  crossRefData: {
    elasticErrors: Array<{ template: string; count: number; severity: string }>;
    elasticSamples: Array<Record<string, unknown>>;
    kbContext: string;
  } | null;
  histogramData: { key: number; count: number }[] | null;
  status: string;
  jiraTicketId: number | null;
  detectedAt: number;
  updatedAt: number;
}

interface NrConnection {
  id: number;
  name: string;
  accountId: string;
  appNames: string[];
  pollingEnabled: number;
}

const METRIC_TYPES = [
  { key: "all", label: "All Metrics" },
  { key: "error_rate", label: "Error Rate" },
  { key: "latency_p95", label: "P95 Latency" },
  { key: "slow_db", label: "Slow DB" },
] as const;

export function NrInsightsPanel({ wsId }: { wsId: number | null }) {
  const [insights, setInsights] = useState<NrInsight[]>([]);
  const [connections, setConnections] = useState<NrConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricFilter, setMetricFilter] = useState<string>("all");
  const [showMuted, setShowMuted] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const q = wsId ? `wsId=${wsId}` : "";

  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams(q);
      params.set("showMuted", String(showMuted));
      if (metricFilter !== "all") params.set("metricType", metricFilter);

      const [connRes, insRes] = await Promise.all([
        fetch(`/api/newrelic/connect?${q}`),
        fetch(`/api/newrelic/insights?${params}`),
      ]);
      if (connRes.ok) {
        const data = await connRes.json();
        setConnections(data.connections ?? []);
      }
      if (insRes.ok) {
        const data = await insRes.json();
        setInsights(data.insights ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [q, showMuted, metricFilter]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleMute = async (id: number) => {
    await fetch(`/api/newrelic/insights/${id}/mute?${q}`, { method: "PATCH" });
    loadData();
  };

  const handleAnalyze = async (id: number) => {
    setAnalyzingId(id);
    try {
      const res = await fetch(`/api/newrelic/insights/${id}/analyze?${q}`, { method: "POST" });
      if (res.ok) loadData();
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleAcceptFix = async (id: number) => {
    setAcceptingId(id);
    try {
      const res = await fetch(`/api/newrelic/insights/${id}/accept?${q}`, { method: "POST" });
      if (res.ok) loadData();
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (connections.length === 0) {
    return <NoConnectionState wsId={wsId} onConnected={loadData} />;
  }

  const criticalCount = insights.filter((i) => i.severity === "critical").length;
  const warningCount = insights.filter((i) => i.severity === "warning").length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 h-14 flex items-center px-5 border-b border-border gap-3">
        <TrendingUp className="w-5 h-5 text-violet" />
        <h2 className="text-lg font-semibold">APM Insights</h2>

        {criticalCount > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-rose/20 text-rose border-rose/30">
            {criticalCount} critical
          </span>
        )}
        {warningCount > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-amber/20 text-amber border-amber/30">
            {warningCount} warning
          </span>
        )}

        <select
          value={metricFilter}
          onChange={(e) => setMetricFilter(e.target.value)}
          className="ml-auto h-8 px-2 text-sm bg-secondary border border-border/50 rounded-md outline-none"
        >
          {METRIC_TYPES.map((mt) => (
            <option key={mt.key} value={mt.key}>{mt.label}</option>
          ))}
        </select>

        <button
          onClick={() => setSettingsOpen(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Manage connections"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowMuted(!showMuted)}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            showMuted ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          title={showMuted ? "Hide muted" : "Show muted"}
        >
          {showMuted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>

      <NrConnectionSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        connections={connections}
        wsId={wsId}
        onSaved={loadData}
      />

      {/* Summary bar */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-border/50 bg-secondary/30">
        <span className="text-sm text-muted-foreground">
          Monitoring {connections.reduce((sum, c) => sum + c.appNames.length, 0)} apps
        </span>
        <span className="text-border">|</span>
        <span className="text-sm text-muted-foreground">{insights.length} anomalies</span>
      </div>

      {/* Insights list */}
      <div className="flex-1 overflow-auto">
        {insights.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No APM anomalies detected yet. Waiting for next poll cycle...
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {insights.map((insight) => (
              <NrInsightRow
                key={insight.id}
                insight={insight}
                expanded={expandedId === insight.id}
                onToggle={() => setExpandedId(expandedId === insight.id ? null : insight.id)}
                onMute={() => handleMute(insight.id)}
                onAnalyze={() => handleAnalyze(insight.id)}
                onAcceptFix={() => handleAcceptFix(insight.id)}
                analyzing={analyzingId === insight.id}
                accepting={acceptingId === insight.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NrInsightRow({
  insight,
  expanded,
  onToggle,
  onMute,
  onAnalyze,
  onAcceptFix,
  analyzing,
  accepting,
}: {
  insight: NrInsight;
  expanded: boolean;
  onToggle: () => void;
  onMute: () => void;
  onAnalyze: () => void;
  onAcceptFix: () => void;
  analyzing: boolean;
  accepting: boolean;
}) {
  const severityColor = {
    critical: "bg-rose/20 text-rose border-rose/30",
    warning: "bg-amber/20 text-amber border-amber/30",
    info: "bg-secondary text-muted-foreground border-border/50",
  }[insight.severity] ?? "bg-secondary text-muted-foreground border-border/50";

  const metricIcon = {
    error_rate: <Zap className="w-4 h-4 text-rose" />,
    latency_p95: <Clock className="w-4 h-4 text-amber" />,
    slow_db: <Database className="w-4 h-4 text-violet" />,
  }[insight.metricType] ?? <BarChart3 className="w-4 h-4" />;

  const metricLabel = {
    error_rate: "Errors",
    latency_p95: "P95 Latency",
    slow_db: "Slow DB",
  }[insight.metricType] ?? insight.metricType;

  const ratio = insight.baselineValue > 0
    ? (insight.currentValue / insight.baselineValue).toFixed(1)
    : "N/A";

  const formatValue = (v: number, type: string) => {
    if (type === "error_rate") return `${v} errors`;
    return `${v}ms`;
  };

  const timeAgo = formatTimeAgo(insight.detectedAt);

  return (
    <div className={`${insight.status === "muted" ? "opacity-50" : ""}`}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-start gap-3 hover:bg-accent/30 transition-colors text-left"
      >
        <div className="mt-0.5 text-muted-foreground">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            {metricIcon}
            <span className="text-sm font-medium">{insight.appName}</span>
            <span className="text-xs text-muted-foreground">· {metricLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {insight.metricLabel && (
              <span className="truncate max-w-[200px] font-mono">{insight.metricLabel}</span>
            )}
            <span>{formatValue(insight.currentValue, insight.metricType)}</span>
            <span>·</span>
            <span>{ratio}x baseline</span>
            <span>·</span>
            <span>{timeAgo}</span>
            {insight.diagnosis && (
              <>
                <span>·</span>
                <span className="text-cyan truncate max-w-[250px]">{insight.diagnosis}</span>
              </>
            )}
          </div>
        </div>

        <span className={`text-xs font-semibold px-2 py-0.5 rounded border shrink-0 ${severityColor}`}>
          {insight.severity}
        </span>

        {insight.histogramData && insight.histogramData.length > 0 && (
          <div className="w-20 h-8 shrink-0">
            <Sparkline data={insight.histogramData.map((b) => b.count)} />
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 pl-10 space-y-3">
          {/* Metric detail */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-secondary/50 rounded p-2">
              <div className="text-muted-foreground">Current</div>
              <div className="font-semibold">{formatValue(insight.currentValue, insight.metricType)}</div>
            </div>
            <div className="bg-secondary/50 rounded p-2">
              <div className="text-muted-foreground">Baseline</div>
              <div className="font-semibold">{formatValue(insight.baselineValue, insight.metricType)}</div>
            </div>
            <div className="bg-secondary/50 rounded p-2">
              <div className="text-muted-foreground">Ratio</div>
              <div className="font-semibold">{ratio}x</div>
            </div>
          </div>

          {/* NRQL query */}
          {insight.nrqlQuery && (
            <div className="text-xs font-mono bg-secondary/50 rounded p-3 whitespace-pre-wrap text-muted-foreground">
              {insight.nrqlQuery}
            </div>
          )}

          {/* Cross-referenced Elastic errors */}
          {insight.crossRefData?.elasticErrors && insight.crossRefData.elasticErrors.length > 0 && (
            <div className="text-sm bg-orange-500/5 border border-orange-500/20 rounded p-3 space-y-1">
              <span className="font-medium text-orange-400">Related Elastic Errors:</span>
              {insight.crossRefData.elasticErrors.slice(0, 5).map((e, i) => (
                <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className={`px-1 rounded ${e.severity === "critical" ? "bg-rose/20 text-rose" : "bg-amber/20 text-amber"}`}>
                    {e.severity}
                  </span>
                  <span className="truncate">{e.template}</span>
                  <span>({e.count} hits)</span>
                </div>
              ))}
            </div>
          )}

          {/* Diagnosis */}
          {insight.diagnosis && (
            <div className="text-sm bg-cyan/5 border border-cyan/20 rounded p-3">
              <span className="font-medium text-cyan">Diagnosis: </span>
              {insight.diagnosis}
            </div>
          )}

          {/* Fix suggestion */}
          {insight.fixSuggestion && (
            <div className="text-sm bg-emerald/5 border border-emerald/20 rounded p-3">
              <span className="font-medium text-emerald">Suggested Fix: </span>
              {insight.fixSuggestion}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); onMute(); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {insight.status === "muted" ? "Unmute" : "Mute"}
            </button>

            {!insight.fixSuggestion && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1.5"
                onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
                disabled={analyzing}
              >
                {analyzing ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analyzing...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" />Analyze</>
                )}
              </Button>
            )}

            {insight.fixSuggestion && insight.status !== "accepted" && (
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5 bg-emerald text-white hover:bg-emerald/90"
                onClick={(e) => { e.stopPropagation(); onAcceptFix(); }}
                disabled={accepting}
              >
                {accepting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Creating ticket...</>
                ) : (
                  "Accept Fix"
                )}
              </Button>
            )}

            {insight.status === "accepted" && insight.jiraTicketId && (
              <span className="text-xs text-emerald">Ticket created</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const w = 80;
  const h = 32;
  const step = w / Math.max(data.length - 1, 1);

  const points = data
    .map((v, i) => `${i * step},${h - (v / max) * (h - 2)}`)
    .join(" ");

  return (
    <svg width={w} height={h} className="text-violet">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NoConnectionState({ wsId, onConnected }: { wsId: number | null; onConnected: () => void }) {
  const [accountId, setAccountId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [appNamesInput, setAppNamesInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    setLoading(true);
    try {
      const appNames = appNamesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`/api/newrelic/connect${wsId ? `?wsId=${wsId}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Default", accountId, apiKey, appNames }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Failed");
      onConnected();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-violet/10 border border-violet/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-violet" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Connect NewRelic</h3>
            <p className="text-xs text-muted-foreground">
              Monitor APM anomalies across your services
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <input
            placeholder="Account ID"
            className="w-full h-9 px-3 bg-secondary border border-border/50 rounded-md text-xs font-mono outline-none focus:border-violet/40"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          />
          <input
            type="password"
            placeholder="API Key (Insights Query Key)"
            className="w-full h-9 px-3 bg-secondary border border-border/50 rounded-md text-xs font-mono outline-none focus:border-violet/40"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <div className="space-y-1">
            <input
              placeholder="App names (comma-separated, e.g. Selling, Selling-Ingestion)"
              className="w-full h-9 px-3 bg-secondary border border-border/50 rounded-md text-xs font-mono outline-none focus:border-violet/40"
              value={appNamesInput}
              onChange={(e) => setAppNamesInput(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground px-1">
              Leave empty to monitor all apps in the account
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-rose/10 border border-rose/20">
              <AlertCircle className="w-3.5 h-3.5 text-rose shrink-0 mt-0.5" />
              <span className="text-[11px] text-rose/90 leading-snug">{error}</span>
            </div>
          )}

          <Button
            className="w-full h-9 bg-violet text-white text-xs font-medium hover:bg-violet/90"
            onClick={handleConnect}
            disabled={loading || !accountId || !apiKey}
          >
            {loading ? (
              <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Testing connection...</>
            ) : (
              "Connect"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function NrConnectionSettingsModal({
  open,
  onOpenChange,
  connections,
  wsId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connections: NrConnection[];
  wsId: number | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState<NrConnection | null>(null);
  const [accountId, setAccountId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [changeApiKey, setChangeApiKey] = useState(false);
  const [appNamesInput, setAppNamesInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = wsId ? `?wsId=${wsId}` : "";

  const startEdit = (conn: NrConnection) => {
    setEditing(conn);
    setAccountId(conn.accountId);
    setApiKey("");
    setChangeApiKey(false);
    setAppNamesInput(conn.appNames.join(", "));
    setError(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setError(null);
    setSaving(true);

    try {
      const appNames = appNamesInput.split(",").map((s) => s.trim()).filter(Boolean);
      const payload: Record<string, unknown> = {
        id: editing.id,
        accountId,
        appNames,
      };
      if (changeApiKey && apiKey) payload.apiKey = apiKey;

      const res = await fetch(`/api/newrelic/connect${q}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Failed");

      setEditing(null);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>NewRelic Connections</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {connections.map((conn) => {
            const isEditing = editing?.id === conn.id;

            if (isEditing) {
              return (
                <div key={conn.id} className="rounded-lg border border-violet/30 bg-violet/5 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{conn.name}</span>
                    <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <input
                    placeholder="Account ID"
                    className="w-full h-8 px-2.5 bg-secondary border border-border/50 rounded text-xs font-mono outline-none focus:border-violet/40"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                  />

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={changeApiKey}
                        onChange={(e) => setChangeApiKey(e.target.checked)}
                        className="rounded"
                      />
                      Change API key
                    </label>
                    {changeApiKey && (
                      <input
                        type="password"
                        placeholder="New API key"
                        className="w-full h-8 px-2.5 bg-secondary border border-border/50 rounded text-xs font-mono outline-none focus:border-violet/40"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    )}
                  </div>

                  <input
                    placeholder="App names (comma-separated)"
                    className="w-full h-8 px-2.5 bg-secondary border border-border/50 rounded text-xs font-mono outline-none focus:border-violet/40"
                    value={appNamesInput}
                    onChange={(e) => setAppNamesInput(e.target.value)}
                  />

                  {error && (
                    <div className="flex items-start gap-2 px-2.5 py-1.5 rounded bg-rose/10 border border-rose/20">
                      <AlertCircle className="w-3.5 h-3.5 text-rose shrink-0 mt-0.5" />
                      <span className="text-[11px] text-rose/90 leading-snug">{error}</span>
                    </div>
                  )}

                  <Button
                    size="sm"
                    className="w-full h-8 bg-violet text-white text-xs hover:bg-violet/90"
                    onClick={handleSave}
                    disabled={saving || !accountId}
                  >
                    {saving ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Testing...</>
                    ) : (
                      "Update"
                    )}
                  </Button>
                </div>
              );
            }

            return (
              <button
                key={conn.id}
                onClick={() => startEdit(conn)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/50 hover:border-border hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-emerald" />
                  </div>
                  <span className="text-sm font-medium">{conn.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {conn.appNames.length} apps
                </span>
              </button>
            );
          })}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
