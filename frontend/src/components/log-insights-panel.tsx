"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Bug,
  Zap,
  BarChart3,
  Settings,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface LogInsight {
  id: number;
  connectionId: number;
  environment: string;
  type: string;
  severity: string;
  messageTemplate: string | null;
  exceptionClassName: string | null;
  diagnosis: string | null;
  fixSuggestion: string | null;
  fixPrd: string | null;
  count: number;
  currentRate: number;
  sampleData: unknown[] | null;
  histogramData: { key: string; count: number }[] | null;
  status: string;
  jiraTicketId: number | null;
  detectedAt: number;
  updatedAt: number;
}

interface Connection {
  id: number;
  name: string;
  url: string;
  indexPattern: string;
  environment: string;
  pollingEnabled: number;
}

interface ActivityCounter {
  key: string;
  label: string;
  count: number;
}

const ENVIRONMENTS = ["dev", "qa", "staging", "production"] as const;

export function LogInsightsPanel({ wsId }: { wsId: number | null }) {
  const [insights, setInsights] = useState<LogInsight[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [environment, setEnvironment] = useState<string>("dev");
  const [showMuted, setShowMuted] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [activityCounters, setActivityCounters] = useState<ActivityCounter[]>([]);
  const [activityWindow, setActivityWindow] = useState<string>("1h");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const q = wsId ? `wsId=${wsId}` : "";

  const loadData = useCallback(async () => {
    try {
      const [connRes, insRes, actRes] = await Promise.all([
        fetch(`/api/elastic/connect?${q}`),
        fetch(`/api/elastic/insights?${q}&environment=${environment}&showMuted=${showMuted}`),
        fetch(`/api/elastic/activity?${q}&environment=${environment}&window=${activityWindow}`),
      ]);
      if (connRes.ok) {
        const data = await connRes.json();
        setConnections(data.connections ?? []);
      }
      if (insRes.ok) {
        const data = await insRes.json();
        setInsights(data.insights ?? []);
      }
      if (actRes.ok) {
        const data = await actRes.json();
        setActivityCounters(data.counters ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [q, environment, showMuted, activityWindow]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleMute = async (id: number) => {
    await fetch(`/api/elastic/insights/${id}/mute?${q}`, { method: "PATCH" });
    loadData();
  };

  const handleSuggestFix = async (id: number) => {
    setAnalyzingId(id);
    try {
      const res = await fetch(`/api/elastic/insights/${id}/analyze?${q}`, { method: "POST" });
      if (res.ok) loadData();
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleAcceptFix = async (id: number) => {
    setAcceptingId(id);
    try {
      const res = await fetch(`/api/elastic/insights/${id}/accept?${q}`, { method: "POST" });
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

  const envConnection = connections.find((c) => c.environment === environment);
  const configuredEnvs = new Set(connections.map((c) => c.environment));

  if (connections.length === 0) {
    return <NoConnectionState wsId={wsId} onConnected={loadData} />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 h-14 flex items-center px-5 border-b border-border gap-3">
        <Activity className="w-5 h-5 text-cyan" />
        <h2 className="text-lg font-semibold">Log Insights</h2>
        <span className="text-sm text-muted-foreground px-2 py-0.5 rounded bg-secondary">
          {insights.length} patterns
        </span>

        {/* Environment selector */}
        <Select
          value={environment}
          onChange={setEnvironment}
          options={ENVIRONMENTS.map((env) => ({ value: env, label: `${env}${configuredEnvs.has(env) ? "" : " (not configured)"}` }))}
          className="ml-auto"
        />

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
          title={showMuted ? "Hide muted patterns" : "Show muted patterns"}
        >
          {showMuted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>

      <ConnectionSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        connections={connections}
        wsId={wsId}
        onSaved={loadData}
      />

      {/* Activity summary bar */}
      {activityCounters.length > 0 && (
        <div className="shrink-0 flex items-center gap-1.5 px-5 py-3 border-b border-border/50 bg-secondary/30">
          {activityCounters.map((c, i) => (
            <div key={c.key} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-border mx-1.5">|</span>}
              <span className="text-sm text-muted-foreground">{c.label}:</span>
              <AnimatedCounter value={c.count} isError={c.key === "errors"} />
            </div>
          ))}
          <Select
            value={activityWindow}
            onChange={setActivityWindow}
            options={[{ value: "5m", label: "5m" }, { value: "1h", label: "1h" }, { value: "24h", label: "24h" }]}
            className="ml-auto"
          />
        </div>
      )}

      {/* Insights table */}
      <div className="flex-1 overflow-auto">
        {!envConnection ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-sm text-muted-foreground">
              No connection configured for <span className="font-medium text-foreground">{environment}</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="w-3.5 h-3.5" />
              Configure now
            </Button>
          </div>
        ) : insights.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No error patterns detected yet. Waiting for next poll cycle...
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {insights.map((insight) => (
              <InsightRow
                key={insight.id}
                insight={insight}
                expanded={expandedId === insight.id}
                onToggle={() => setExpandedId(expandedId === insight.id ? null : insight.id)}
                onMute={() => handleMute(insight.id)}
                onSuggestFix={() => handleSuggestFix(insight.id)}
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

function InsightRow({
  insight,
  expanded,
  onToggle,
  onMute,
  onSuggestFix,
  onAcceptFix,
  analyzing,
  accepting,
}: {
  insight: LogInsight;
  expanded: boolean;
  onToggle: () => void;
  onMute: () => void;
  onSuggestFix: () => void;
  onAcceptFix: () => void;
  analyzing: boolean;
  accepting: boolean;
}) {
  const severityColor = {
    critical: "bg-rose/20 text-rose border-rose/30",
    warning: "bg-amber/20 text-amber border-amber/30",
    info: "bg-secondary text-muted-foreground border-border/50",
  }[insight.severity] ?? "bg-secondary text-muted-foreground border-border/50";

  const typeIcon = {
    exception: <Bug className="w-4 h-4" />,
    new_error: <Zap className="w-4 h-4 text-violet" />,
    pattern: <BarChart3 className="w-4 h-4" />,
  }[insight.type] ?? <BarChart3 className="w-4 h-4" />;

  const label = insight.exceptionClassName ?? insight.messageTemplate ?? "Unknown";
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
            {typeIcon}
            <span className="text-sm font-medium truncate">{label}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{insight.count.toLocaleString()} hits</span>
            <span>·</span>
            <span>{timeAgo}</span>
            {insight.diagnosis && (
              <>
                <span>·</span>
                <span className="text-cyan truncate max-w-[300px]">{insight.diagnosis}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {insight.type === "new_error" && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-violet/20 text-violet border-violet/30">
              New
            </span>
          )}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${severityColor}`}>
            {insight.severity}
          </span>
        </div>

        {/* Sparkline — 30-min error rate trend */}
        {insight.histogramData && insight.histogramData.length > 0 && (
          <div className="w-20 h-8 shrink-0">
            <Sparkline data={insight.histogramData.map((b) => b.count)} />
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 pl-10 space-y-3">
          {/* Sample data / stack trace */}
          {insight.sampleData && (Array.isArray(insight.sampleData) ? insight.sampleData.length > 0 : true) && (
            <div className="text-xs font-mono bg-secondary/50 rounded p-3 max-h-48 overflow-auto whitespace-pre-wrap">
              {typeof insight.sampleData === "string"
                ? insight.sampleData
                : JSON.stringify(insight.sampleData, null, 2)}
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
                onClick={(e) => { e.stopPropagation(); onSuggestFix(); }}
                disabled={analyzing}
              >
                {analyzing ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analyzing...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" />Suggest Fix</>
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

function AnimatedCounter({ value, isError }: { value: number; isError?: boolean }) {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [value]);

  const formatted = value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
      ? `${(value / 1_000).toFixed(1)}K`
      : String(value);

  return (
    <span
      className={`text-base font-semibold tabular-nums transition-all duration-500 ${
        flash ? "text-cyan scale-110" : isError ? "text-foreground" : "text-foreground"
      }`}
    >
      {formatted}
    </span>
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
    <svg width={w} height={h} className="text-cyan">
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
  const [env, setEnv] = useState<string>("dev");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [indexPattern, setIndexPattern] = useState("logs-*");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/elastic/connect${wsId ? `?wsId=${wsId}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: env, url, apiKey, indexPattern, environment: env }),
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
          <div className="w-12 h-12 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
            <Activity className="w-6 h-6 text-cyan" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Connect Elasticsearch</h3>
            <p className="text-xs text-muted-foreground">
              Monitor error patterns in your logs
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <select
            value={env}
            onChange={(e) => setEnv(e.target.value)}
            className="w-full h-9 px-3 bg-secondary border border-border/50 rounded-md text-xs outline-none focus:border-cyan/40"
          >
            {ENVIRONMENTS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <input
            placeholder="https://your-cluster.es.us-east-1.aws.elastic.cloud:9243"
            className="w-full h-9 px-3 bg-secondary border border-border/50 rounded-md text-xs font-mono outline-none focus:border-cyan/40"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <input
            type="password"
            placeholder="API key"
            className="w-full h-9 px-3 bg-secondary border border-border/50 rounded-md text-xs font-mono outline-none focus:border-cyan/40"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <input
            placeholder="Index pattern (e.g. logs-*)"
            className="w-full h-9 px-3 bg-secondary border border-border/50 rounded-md text-xs font-mono outline-none focus:border-cyan/40"
            value={indexPattern}
            onChange={(e) => setIndexPattern(e.target.value)}
          />

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-rose/10 border border-rose/20">
              <AlertCircle className="w-3.5 h-3.5 text-rose shrink-0 mt-0.5" />
              <span className="text-[11px] text-rose/90 leading-snug">{error}</span>
            </div>
          )}

          <Button
            className="w-full h-9 bg-cyan text-background text-xs font-medium hover:bg-cyan/90"
            onClick={handleConnect}
            disabled={loading || !url || !apiKey}
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

function ConnectionSettingsModal({
  open,
  onOpenChange,
  connections,
  wsId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connections: Connection[];
  wsId: number | null;
  onSaved: () => void;
}) {
  const [editingEnv, setEditingEnv] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [changeApiKey, setChangeApiKey] = useState(false);
  const [indexPattern, setIndexPattern] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connByEnv = new Map(connections.map((c) => [c.environment, c]));
  const q = wsId ? `?wsId=${wsId}` : "";

  const startEdit = (env: string) => {
    const existing = connByEnv.get(env);
    setEditingEnv(env);
    setUrl(existing?.url ?? "");
    setApiKey("");
    setChangeApiKey(!existing);
    setIndexPattern(existing?.indexPattern ?? "logs-*");
    setError(null);
  };

  const cancelEdit = () => {
    setEditingEnv(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!editingEnv) return;
    setError(null);
    setSaving(true);

    const existing = connByEnv.get(editingEnv);

    try {
      const isUpdate = !!existing;
      const payload: Record<string, unknown> = {
        url,
        indexPattern,
        environment: editingEnv,
      };

      if (isUpdate) {
        payload.id = existing.id;
        if (changeApiKey && apiKey) payload.apiKey = apiKey;
      } else {
        payload.name = editingEnv;
        payload.apiKey = apiKey;
      }

      const res = await fetch(`/api/elastic/connect${q}`, {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Failed");

      setEditingEnv(null);
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
          <DialogTitle>Elasticsearch Connections</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {ENVIRONMENTS.map((env) => {
            const conn = connByEnv.get(env);
            const isEditing = editingEnv === env;

            if (isEditing) {
              return (
                <div key={env} className="rounded-lg border border-cyan/30 bg-cyan/5 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{env}</span>
                    <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <input
                    placeholder="Elasticsearch URL"
                    className="w-full h-8 px-2.5 bg-secondary border border-border/50 rounded text-xs font-mono outline-none focus:border-cyan/40"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />

                  {conn ? (
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
                          className="w-full h-8 px-2.5 bg-secondary border border-border/50 rounded text-xs font-mono outline-none focus:border-cyan/40"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      type="password"
                      placeholder="API key"
                      className="w-full h-8 px-2.5 bg-secondary border border-border/50 rounded text-xs font-mono outline-none focus:border-cyan/40"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  )}

                  <input
                    placeholder="Index pattern (e.g. logs-*)"
                    className="w-full h-8 px-2.5 bg-secondary border border-border/50 rounded text-xs font-mono outline-none focus:border-cyan/40"
                    value={indexPattern}
                    onChange={(e) => setIndexPattern(e.target.value)}
                  />

                  {error && (
                    <div className="flex items-start gap-2 px-2.5 py-1.5 rounded bg-rose/10 border border-rose/20">
                      <AlertCircle className="w-3.5 h-3.5 text-rose shrink-0 mt-0.5" />
                      <span className="text-[11px] text-rose/90 leading-snug">{error}</span>
                    </div>
                  )}

                  <Button
                    size="sm"
                    className="w-full h-8 bg-cyan text-background text-xs hover:bg-cyan/90"
                    onClick={handleSave}
                    disabled={saving || !url || (!conn && !apiKey)}
                  >
                    {saving ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Testing...</>
                    ) : conn ? (
                      "Update"
                    ) : (
                      "Connect"
                    )}
                  </Button>
                </div>
              );
            }

            return (
              <button
                key={env}
                onClick={() => startEdit(env)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/50 hover:border-border hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {conn ? (
                    <div className="w-5 h-5 rounded-full bg-emerald/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-emerald" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-secondary border border-border/50" />
                  )}
                  <span className="text-sm font-medium">{env}</span>
                </div>
                {conn && (
                  <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                    {conn.url}
                  </span>
                )}
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
