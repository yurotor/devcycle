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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { KBBrowser } from "@/components/kb-browser";
import { KanbanBoard } from "@/components/kanban-board";
import { SuggestionsPanel } from "@/components/suggestions-panel";
import { TicketDetail } from "@/components/ticket-detail";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { type Ticket } from "@/lib/fake-data";

type SidebarTab = "kb" | "suggestions";
type MainView = "board" | "file";
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

  // ── Bootstrap: load workspace + tickets + suggestions count ──

  useEffect(() => {
    async function bootstrap() {
      try {
        const [wsRes, ticketsRes, suggestionsRes] = await Promise.all([
          fetch("/api/workspace"),
          fetch("/api/tickets"),
          fetch("/api/suggestions"),
        ]);
        if (suggestionsRes.ok) {
          const data = await suggestionsRes.json();
          setFindingsCount((data.suggestions ?? []).length);
        }
        let connectedJiraUrl: string | null = null;
        if (wsRes.ok) {
          const ws = await wsRes.json();
          connectedJiraUrl = ws.jiraUrl ?? null;
          setJiraUrl(connectedJiraUrl);
        }
        if (ticketsRes.ok) {
          const data = await ticketsRes.json();
          const loaded: Ticket[] = data.tickets ?? [];
          setTickets(loaded);
          // Auto-sync if Jira is connected but tickets are empty (e.g. first boot after connect)
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
    try {
      await fetch("/api/jira/sync", { method: "POST" });
      const res = await fetch("/api/tickets");
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
        <div className="w-8 h-8 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center mb-3">
          <Zap className="w-4 h-4 text-cyan" />
        </div>

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
              {sidebarTab === "kb" && <KBBrowser onFileClick={handleFileClick} />}
              {sidebarTab === "suggestions" && (
                <SuggestionsPanel />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 min-w-0 bg-background flex">
        <div className={ticketPanel ? "flex-1 min-w-0" : "flex-1"}>
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
                  <NoJiraState onConnected={(t) => { setTickets(t); setJiraUrl("connected"); }} />
                ) : (
                  <KanbanBoard
                    tickets={tickets}
                    onTicketClick={handleTicketClick}
                    activeTicketId={ticketPanel?.ticket.id}
                    onSync={jiraUrl ? syncTickets : undefined}
                    syncing={syncing}
                  />
                )}
              </motion.div>
            )}
            {mainView === "file" && filePath && (
              <motion.div
                key={`file-${filePath}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full flex flex-col"
              >
                <div className="h-12 flex items-center px-4 gap-3 border-b border-border shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setMainView("board")}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <code className="text-xs text-muted-foreground font-mono">
                    {filePath}
                  </code>
                </div>
                <div className="flex-1 overflow-auto">
                  <MarkdownViewer path={filePath} onNavigate={handleFileClick} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
    </div>
  );
}

function NoJiraState({ onConnected }: { onConnected: (tickets: Ticket[]) => void }) {
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
      const res = await fetch("/api/jira/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jiraUrl, projectKey, email, token }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail ? `${data.error} — ${data.detail}` : data.error ?? "Failed");
      }
      // Reload tickets
      const ticketsRes = await fetch("/api/tickets");
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
