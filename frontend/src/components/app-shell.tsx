"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Zap,
  FolderTree,
  LayoutGrid,
  AlertTriangle,
  Settings,
  X,
  ChevronLeft,
  GitMerge,
  Key,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  Activity,
  TrendingUp,
  Shield,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { KBBrowser } from "@/components/kb-browser";
import { KanbanBoard } from "@/components/kanban-board";
import { SuggestionsPanel } from "@/components/suggestions-panel";
import { TicketDetail } from "@/components/ticket-detail";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { ScanPill } from "@/components/scan-pill";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { SetupFlow } from "@/components/setup-flow";
import { KBChatDrawer } from "@/components/kb-chat-drawer";
import { LogInsightsPanel } from "@/components/log-insights-panel";
import { NrInsightsPanel } from "@/components/nr-insights-panel";
import { SdlcDashboard } from "@/components/sdlc-dashboard";
import { SdlcEpicDetail } from "@/components/sdlc-epic-detail";
import { type Ticket } from "@/lib/fake-data";

type SidebarTab = "kb" | "suggestions";
type MainView = "board" | "file" | "insights" | "apm" | "sdlc" | "sdlc-epic";
type TicketPanel = { ticket: Ticket } | null;

export function AppShell() {
  const [sidebarTab, setSidebarTab] = useState<SidebarTab | null>(null);
  const [mainView, setMainView] = useState<MainView>("board");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [ticketPanel, setTicketPanel] = useState<TicketPanel>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [jiraUrl, setJiraUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [findingsCount, setFindingsCount] = useState(0);
  const [boardFilter, setBoardFilter] = useState("");
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [sdlcEpicId, setSdlcEpicId] = useState<number | null>(null);
  const [showReconnectJira, setShowReconnectJira] = useState(false);
  const [workspaces, setWorkspaces] = useState<Array<{ id: number; name: string; jiraProjectKey: string | null }>>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("devcycle:activeWorkspaceId");
      return stored ? parseInt(stored, 10) : null;
    }
    return null;
  });

  // ── Bootstrap: load workspace + tickets + suggestions count ──

  useEffect(() => {
    async function bootstrap() {
      try {
        // First: resolve workspace list + active ID
        let wsRes = await fetch(activeWorkspaceId ? `/api/workspace?id=${activeWorkspaceId}` : "/api/workspace");
        // Stale localStorage ID → fall back to default
        if (!wsRes.ok && activeWorkspaceId) {
          wsRes = await fetch("/api/workspace");
        }
        let wsId: number | null = activeWorkspaceId;
        let connectedJiraUrl: string | null = null;

        if (wsRes.ok) {
          const ws = await wsRes.json();
          connectedJiraUrl = ws.jiraUrl ?? null;
          setJiraUrl(connectedJiraUrl);
          if (ws.workspaces) {
            setWorkspaces(ws.workspaces);
          }
          // Always sync wsId from response
          if (ws.id) {
            wsId = ws.id;
            setActiveWorkspaceId(wsId);
            localStorage.setItem("devcycle:activeWorkspaceId", String(wsId));
          }
        }

        // Then: fetch tickets + suggestions scoped to workspace
        const q = wsId ? `?wsId=${wsId}` : "";
        const [ticketsRes, suggestionsRes] = await Promise.all([
          fetch(`/api/tickets${q}`),
          fetch(`/api/suggestions${q}`),
        ]);
        if (suggestionsRes.ok) {
          const data = await suggestionsRes.json();
          setFindingsCount((data.suggestions ?? []).length);
        }
        if (ticketsRes.ok) {
          const data = await ticketsRes.json();
          const loaded: Ticket[] = data.tickets ?? [];
          setTickets(loaded);
          if (connectedJiraUrl && loaded.length === 0) {
            syncTickets();
          }
        }
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────

  const syncTickets = async () => {
    setSyncing(true);
    const q = activeWorkspaceId ? `?wsId=${activeWorkspaceId}` : "";
    try {
      await fetch(`/api/jira/sync${q}`, { method: "POST" });
      const res = await fetch(`/api/tickets${q}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets ?? []);
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleTicketClick = (ticket: Ticket) => {
    setTicketPanel({ ticket });
  };

  const handleFileClick = (path: string) => {
    setFilePath(path);
    setMainView("file");
  };

  const handlePhaseChange = (ticketId: string, newPhase: Ticket["phase"]) => {
    // Optimistic update
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, phase: newPhase } : t))
    );
    if (ticketPanel?.ticket.id === ticketId) {
      setTicketPanel({ ticket: { ...ticketPanel.ticket, phase: newPhase } });
    }
    // Persist (fire and forget)
    fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: newPhase }),
    }).catch(console.error);
  };

  const switchWorkspace = async (id: number) => {
    setActiveWorkspaceId(id);
    localStorage.setItem("devcycle:activeWorkspaceId", String(id));
    setLoading(true);
    setTicketPanel(null);
    try {
      const [wsRes, ticketsRes, suggestionsRes] = await Promise.all([
        fetch(`/api/workspace?id=${id}`),
        fetch(`/api/tickets?wsId=${id}`),
        fetch(`/api/suggestions?wsId=${id}`),
      ]);
      if (wsRes.ok) {
        const ws = await wsRes.json();
        setJiraUrl(ws.jiraUrl ?? null);
      }
      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        setTickets(data.tickets ?? []);
      }
      if (suggestionsRes.ok) {
        const data = await suggestionsRes.json();
        setFindingsCount((data.suggestions ?? []).length);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewWorkspaceComplete = async () => {
    setShowNewWorkspace(false);
    // Reload workspaces + switch to the newest one
    const wsRes = await fetch("/api/workspace");
    if (wsRes.ok) {
      const ws = await wsRes.json();
      setWorkspaces(ws.workspaces ?? []);
      // Switch to the newest workspace (highest ID)
      const newest = (ws.workspaces as Array<{ id: number }>)?.sort((a: { id: number }, b: { id: number }) => b.id - a.id)[0];
      if (newest) {
        switchWorkspace(newest.id);
      }
    }
  };

  const deleteWorkspace = async (id: number) => {
    try {
      const res = await fetch(`/api/workspace/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      const remaining = workspaces.filter((w) => w.id !== id);
      setWorkspaces(remaining);
      // If we deleted the active workspace, switch to first remaining
      if (activeWorkspaceId === id && remaining.length > 0) {
        switchWorkspace(remaining[0].id);
      }
    } catch (err) {
      console.error("Failed to delete workspace", err);
    }
  };

  const sidebarItems = [
    { id: "kb" as const, icon: FolderTree, label: "KB" },
    {
      id: "suggestions" as const,
      icon: AlertTriangle,
      label: "Findings",
      count: findingsCount,
    },
  ];

  const sidebarOpen = sidebarTab !== null;

  // ── Empty state (Jira not connected) ─────────────────────────

  const noJira = !jiraUrl && !loading && tickets.length === 0;

  return (
    <div className="h-full flex relative">

      {/* Icon rail */}
      <div className="w-12 border-r border-border bg-sidebar flex flex-col items-center py-3 gap-1 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center mb-1">
          <Zap className="w-4 h-4 text-cyan" />
        </div>

        {workspaces.length > 0 && (
          <div className="mb-2">
            <WorkspaceSwitcher
              workspaces={workspaces}
              activeId={activeWorkspaceId}
              onSwitch={switchWorkspace}
              onNew={() => setShowNewWorkspace(true)}
              onDelete={deleteWorkspace}
            />
          </div>
        )}

        <button
          onClick={() => { setMainView("board"); setTicketPanel(null); setSidebarTab(null); }}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
            mainView === "board" && !sidebarOpen
              ? "bg-cyan/10 text-cyan"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
          title="Board"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        <button
          onClick={() => { setMainView("insights"); setTicketPanel(null); setSidebarTab(null); }}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
            mainView === "insights"
              ? "bg-cyan/10 text-cyan"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
          title="Log Insights"
        >
          <Activity className="w-4 h-4" />
        </button>

        <button
          onClick={() => { setMainView("apm"); setTicketPanel(null); setSidebarTab(null); }}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
            mainView === "apm"
              ? "bg-violet/10 text-violet"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
          title="APM Insights"
        >
          <TrendingUp className="w-4 h-4" />
        </button>

        <button
          onClick={() => { setMainView("sdlc"); setSdlcEpicId(null); setTicketPanel(null); setSidebarTab(null); }}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
            mainView === "sdlc" || mainView === "sdlc-epic"
              ? "bg-emerald/10 text-emerald"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
          title="SDLC"
        >
          <Shield className="w-4 h-4" />
        </button>

        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setSidebarTab(sidebarTab === item.id ? null : item.id)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all relative ${
              sidebarTab === item.id
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
            title={item.label}
          >
            <item.icon className="w-4 h-4" />
            {item.count && (
              <span className="absolute -top-0.5 -right-0.5 text-[8px] w-4 h-4 rounded-full bg-rose/80 text-white flex items-center justify-center font-medium">
                {item.count}
              </span>
            )}
          </button>
        ))}

        <div className="mt-auto">
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sidebar panel */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="border-r border-border bg-sidebar flex flex-col shrink-0 overflow-hidden"
          >
            <div className="h-12 flex items-center px-3 gap-2 border-b border-border shrink-0">
              <span className="text-xs font-medium flex-1">
                {sidebarTab === "kb" ? "Knowledge Base" : "Scan Findings"}
              </span>
              <button
                onClick={() => setSidebarTab(null)}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {sidebarTab === "kb" && <KBBrowser onFileClick={handleFileClick} wsId={activeWorkspaceId} />}
              {sidebarTab === "suggestions" && (
                <SuggestionsPanel wsId={activeWorkspaceId} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 min-w-0 bg-background flex">
        <div className={ticketPanel ? "flex-1 min-w-0 flex flex-col" : "flex-1 flex flex-col"}>
          {/* Global top bar */}
          {!noJira && (
            <div className="sticky top-0 z-10 shrink-0 h-12 flex items-center px-5 border-b border-border bg-background gap-3">
              {mainView === "file" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setMainView("board")}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              {(mainView === "sdlc" || mainView === "sdlc-epic") && (
                <h2 className="text-base font-semibold tracking-tight">SDLC</h2>
              )}
              {mainView === "board" && (
                <>
                  <h2 className="text-base font-semibold tracking-tight">Board</h2>
                  <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">
                    {tickets.length} tickets
                  </span>
                  <div className="relative max-w-[250px] w-full">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50" />
                    <input
                      type="text"
                      value={boardFilter}
                      onChange={(e) => setBoardFilter(e.target.value)}
                      placeholder="Filter tickets..."
                      className="w-full h-7 pl-7 pr-3 text-xs bg-secondary/50 border border-border/50 rounded-md outline-none focus:border-cyan/40 focus:ring-1 focus:ring-cyan/20 placeholder:text-muted-foreground/40 transition-colors"
                    />
                  </div>
                </>
              )}
              {mainView === "file" && filePath && (
                <code className="text-xs text-muted-foreground font-mono">
                  {filePath}
                </code>
              )}
              <div className="ml-auto flex items-center gap-3">
                <ScanPill wsId={activeWorkspaceId} />
                {jiraUrl && mainView === "board" && (
                  <>
                  <button
                    onClick={() => setShowReconnectJira(true)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    title="Reconnect Jira credentials"
                  >
                    <Key className="w-3 h-3" />
                    Reconnect
                  </button>
                  <button
                    onClick={syncTickets}
                    disabled={syncing}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="Sync from Jira"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Syncing..." : "Sync Jira"}
                  </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* View content */}
          <div className="flex-1 min-h-0">
            <AnimatePresence mode="wait">
              {mainView === "board" && (
                <motion.div
                  key="board"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  {noJira ? (
                    <NoJiraState wsId={activeWorkspaceId} onConnected={(t) => { setTickets(t); setJiraUrl("connected"); }} />
                  ) : (
                    <KanbanBoard
                      tickets={tickets}
                      onTicketClick={handleTicketClick}
                      activeTicketId={ticketPanel?.ticket.id}
                      filter={boardFilter}
                    />
                  )}
                </motion.div>
              )}
              {mainView === "insights" && (
                <motion.div
                  key="insights"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  <LogInsightsPanel wsId={activeWorkspaceId} />
                </motion.div>
              )}
              {mainView === "apm" && (
                <motion.div
                  key="apm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  <NrInsightsPanel wsId={activeWorkspaceId} />
                </motion.div>
              )}
              {mainView === "sdlc" && (
                <motion.div
                  key="sdlc"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  <SdlcDashboard
                    wsId={activeWorkspaceId}
                    workspaces={workspaces}
                    onEpicClick={(epicId) => {
                      setSdlcEpicId(epicId);
                      setMainView("sdlc-epic");
                    }}
                  />
                </motion.div>
              )}
              {mainView === "sdlc-epic" && sdlcEpicId && (
                <motion.div
                  key={`sdlc-epic-${sdlcEpicId}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  <SdlcEpicDetail
                    epicId={sdlcEpicId}
                    wsId={activeWorkspaceId!}
                    onBack={() => {
                      setSdlcEpicId(null);
                      setMainView("sdlc");
                    }}
                  />
                </motion.div>
              )}
              {mainView === "file" && filePath && (
                <motion.div
                  key={`file-${filePath}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  <div className="h-full overflow-auto">
                    <MarkdownViewer path={filePath} onNavigate={handleFileClick} wsId={activeWorkspaceId} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Ticket detail panel */}
        <AnimatePresence>
          {ticketPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 560, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="border-l border-border bg-background shrink-0 overflow-hidden"
            >
              <div className="w-[560px] h-full">
                <TicketDetail
                  ticket={ticketPanel.ticket}
                  onBack={() => setTicketPanel(null)}
                  onPhaseChange={(phase) =>
                    handlePhaseChange(ticketPanel.ticket.id, phase)
                  }
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* KB Chat Drawer */}
      <KBChatDrawer wsId={activeWorkspaceId} />

      {/* Reconnect Jira overlay */}
      <AnimatePresence>
        {showReconnectJira && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50 bg-background/95 flex items-center justify-center"
          >
            <button
              onClick={() => setShowReconnectJira(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <NoJiraState
              wsId={activeWorkspaceId}
              onConnected={(t) => {
                setTickets(t);
                setJiraUrl("connected");
                setShowReconnectJira(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* New workspace overlay */}
      <AnimatePresence>
        {showNewWorkspace && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50 bg-background"
          >
            <button
              onClick={() => setShowNewWorkspace(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <SetupFlow mode="add" onComplete={handleNewWorkspaceComplete} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NoJiraState({ wsId, onConnected }: { wsId: number | null; onConnected: (tickets: Ticket[]) => void }) {
  const [jiraUrl, setJiraUrl] = useState(process.env.NEXT_PUBLIC_DEBUG_JIRA_URL ?? "");
  const [projectKey, setProjectKey] = useState(
    process.env.NEXT_PUBLIC_DEBUG_JIRA_URL
      ? (process.env.NEXT_PUBLIC_DEBUG_JIRA_URL.match(/\/projects\/([A-Z][A-Z0-9_]*)/i)?.[1]?.toUpperCase() ?? "")
      : ""
  );
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_DEBUG_JIRA_EMAIL ?? "");
  const [token, setToken] = useState(process.env.NEXT_PUBLIC_DEBUG_JIRA_TOKEN ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractProjectKey = (url: string): string => {
    const m = url.match(/\/projects\/([A-Z][A-Z0-9_]*)/i);
    return m ? m[1].toUpperCase() : "";
  };

  const handleUrlChange = (url: string) => {
    setJiraUrl(url);
    const key = extractProjectKey(url);
    if (key) setProjectKey(key);
  };

  const handleConnect = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/jira/connect${wsId ? `?wsId=${wsId}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jiraUrl, projectKey, email, token }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail ? `${data.error} — ${data.detail}` : data.error ?? "Failed");
      }
      // Reload tickets
      const ticketsRes = await fetch(`/api/tickets${wsId ? `?wsId=${wsId}` : ""}`);
      const ticketsData = await ticketsRes.json();
      onConnected(ticketsData.tickets ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-violet/10 border border-violet/20 flex items-center justify-center">
            <GitMerge className="w-6 h-6 text-violet" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Connect Jira</h3>
            <p className="text-xs text-muted-foreground">
              Load your tickets onto the board
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Input
            placeholder="https://myorg.atlassian.net/jira/software/projects/CLN/boards/1"
            className="h-9 bg-secondary border-border/50 font-mono text-xs"
            value={jiraUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
          />
          <Input
            placeholder="Project key (e.g. CLN)"
            className="h-9 bg-secondary border-border/50 font-mono text-xs uppercase"
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
          />
          <Input
            placeholder="Email (Jira Cloud)"
            className="h-9 bg-secondary border-border/50 text-xs"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="password"
              placeholder="API token / PAT"
              className="h-9 pl-9 bg-secondary border-border/50 font-mono text-xs"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-rose/10 border border-rose/20">
              <AlertCircle className="w-3.5 h-3.5 text-rose shrink-0 mt-0.5" />
              <span className="text-[11px] text-rose/90 leading-snug">{error}</span>
            </div>
          )}

          <Button
            className="w-full h-9 bg-violet text-background text-xs font-medium hover:bg-violet/90"
            onClick={handleConnect}
            disabled={loading || !jiraUrl || !token}
          >
            {loading ? (
              <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Connecting...</>
            ) : (
              "Connect Jira"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
