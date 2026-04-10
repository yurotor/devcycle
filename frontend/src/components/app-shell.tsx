"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Zap,
  FolderTree,
  LayoutGrid,
  AlertTriangle,
  Settings,
  ChevronLeft,
  X,
} from "lucide-react";
import { KBBrowser } from "@/components/kb-browser";
import { KanbanBoard } from "@/components/kanban-board";
import { SuggestionsPanel } from "@/components/suggestions-panel";
import { TicketDetail } from "@/components/ticket-detail";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { FAKE_TICKETS, FAKE_SUGGESTIONS, type Ticket } from "@/lib/fake-data";

type SidebarTab = "kb" | "suggestions";
type MainView = "board" | "file";
type TicketPanel = { ticket: Ticket } | null;

export function AppShell() {
  const [sidebarTab, setSidebarTab] = useState<SidebarTab | null>(null);
  const [mainView, setMainView] = useState<MainView>("board");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [ticketPanel, setTicketPanel] = useState<TicketPanel>(null);
  const [tickets, setTickets] = useState(FAKE_TICKETS);

  const handleTicketClick = (ticket: Ticket) => {
    setTicketPanel({ ticket });
  };

  const handleFileClick = (path: string) => {
    setFilePath(path);
    setMainView("file");
  };

  const handlePhaseChange = (ticketId: string, newPhase: Ticket["phase"]) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, phase: newPhase } : t))
    );
    if (ticketPanel && ticketPanel.ticket.id === ticketId) {
      setTicketPanel({
        ticket: { ...ticketPanel.ticket, phase: newPhase },
      });
    }
  };

  const sidebarItems = [
    { id: "kb" as const, icon: FolderTree, label: "KB" },
    {
      id: "suggestions" as const,
      icon: AlertTriangle,
      label: "Findings",
      count: FAKE_SUGGESTIONS.length,
    },
  ];

  const sidebarOpen = sidebarTab !== null;

  return (
    <div className="h-full flex">
      {/* Icon rail — always visible */}
      <div className="w-12 border-r border-border bg-sidebar flex flex-col items-center py-3 gap-1 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center mb-3">
          <Zap className="w-4 h-4 text-cyan" />
        </div>

        <button
          onClick={() => {
            setMainView("board");
            setTicketPanel(null);
            setSidebarTab(null);
          }}
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
            onClick={() =>
              setSidebarTab(sidebarTab === item.id ? null : item.id)
            }
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

      {/* Sidebar panel — slides in when a tab is selected */}
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
              {sidebarTab === "kb" && (
                <KBBrowser onFileClick={handleFileClick} />
              )}
              {sidebarTab === "suggestions" && (
                <SuggestionsPanel suggestions={FAKE_SUGGESTIONS} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content — board or file viewer */}
      <div className="flex-1 min-w-0 bg-background flex">
        <div className={`${ticketPanel ? "flex-1 min-w-0" : "flex-1"}`}>
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
                <KanbanBoard
                  tickets={tickets}
                  onTicketClick={handleTicketClick}
                  activeTicketId={ticketPanel?.ticket.id}
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
                  <MarkdownViewer path={filePath} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Ticket detail panel — slides in from the right */}
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
