"use client";

import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";

interface Workspace {
  id: number;
  name: string;
  jiraProjectKey: string | null;
}

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  activeId: number | null;
  onSwitch: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
}

export function WorkspaceSwitcher({ workspaces, activeId, onSwitch, onNew, onDelete }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const active = workspaces.find((w) => w.id === activeId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-all text-muted-foreground hover:text-foreground hover:bg-accent"
        title={active ? active.name : "Switch workspace"}
      >
        <ChevronsUpDown className="w-4 h-4" />
      </PopoverTrigger>
      <PopoverContent side="right" align="start" sideOffset={4} className="w-56 p-1">
        <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">Workspaces</div>
        {workspaces.map((ws) => (
          <div key={ws.id} className="group flex items-center gap-1">
            <button
              onClick={() => { onSwitch(ws.id); setOpen(false); setConfirmDeleteId(null); }}
              className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors text-left"
            >
              <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                {ws.id === activeId && <Check className="w-3.5 h-3.5 text-cyan" />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{ws.name}</div>
                {ws.jiraProjectKey && (
                  <div className="text-[10px] text-muted-foreground">{ws.jiraProjectKey}</div>
                )}
              </div>
            </button>
            {workspaces.length > 1 && (
              confirmDeleteId === ws.id ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(ws.id); setOpen(false); setConfirmDeleteId(null); }}
                  className="shrink-0 px-1.5 py-1 rounded text-[10px] font-medium bg-rose/10 text-rose hover:bg-rose/20 transition-colors"
                  title="Confirm delete"
                >
                  confirm
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(ws.id); }}
                  className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-rose hover:bg-rose/10 transition-all"
                  title="Delete workspace"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )
            )}
          </div>
        ))}
        <div className="border-t border-border mt-1 pt-1">
          <button
            onClick={() => { onNew(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors text-muted-foreground"
          >
            <Plus className="w-4 h-4" />
            <span>New workspace</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
