"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
  GripVertical,
} from "lucide-react";
import { FAKE_WAVES, type Wave, type WaveTask } from "@/lib/fake-data";
import { type Ticket } from "@/lib/fake-data";

interface DesignPhaseProps {
  ticket: Ticket;
  onComplete: () => void;
}

const REPO_COLORS: Record<string, string> = {
  "payments-api": "bg-cyan/10 text-cyan border-cyan/20",
  "payments-frontend": "bg-amber/10 text-amber border-amber/20",
  "shared-libs": "bg-emerald/10 text-emerald border-emerald/20",
  "auth-service": "bg-violet/10 text-violet border-violet/20",
  "e2e-tests": "bg-sky/10 text-sky border-sky/20",
};

const STATUS_ICON = {
  pending: <Circle className="w-3.5 h-3.5 text-muted-foreground" />,
  "in-progress": <Loader2 className="w-3.5 h-3.5 text-amber animate-spin" />,
  done: <CheckCircle2 className="w-3.5 h-3.5 text-emerald" />,
};

export function DesignPhase({ ticket, onComplete }: DesignPhaseProps) {
  const [waves] = useState<Wave[]>(FAKE_WAVES);

  // Get all unique repos for swimlane rows
  const repos = Array.from(new Set(waves.flatMap((w) => w.tasks.map((t) => t.repo))));

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber" />
          <span className="text-xs font-medium">Design Phase</span>
          <span className="text-[10px] text-muted-foreground ml-1">
            Wave-based task breakdown — swimlane view
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5">
          {/* Swimlane grid */}
          <div className="min-w-[640px]">
            {/* Header row - wave names */}
            <div className="flex gap-3 mb-3">
              <div className="w-32 shrink-0" /> {/* repo label column */}
              {waves.map((wave) => (
                <div key={wave.id} className="flex-1 min-w-[180px]">
                  <div className="text-[11px] font-medium text-muted-foreground px-1 flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-secondary flex items-center justify-center text-[10px] font-mono">
                      {wave.id.replace("w", "")}
                    </div>
                    {wave.name.replace(/Wave \d+ — /, "")}
                  </div>
                </div>
              ))}
            </div>

            {/* Repo rows */}
            {repos.map((repo) => (
              <div
                key={repo}
                className="flex gap-3 mb-2"
              >
                <div className="w-32 shrink-0 flex items-start pt-2.5">
                  <span
                    className={`text-[10px] px-2 py-1 rounded-md border font-mono ${
                      REPO_COLORS[repo] ?? "bg-secondary text-muted-foreground border-border"
                    }`}
                  >
                    {repo}
                  </span>
                </div>
                {waves.map((wave) => {
                  const tasksInCell = wave.tasks.filter(
                    (t) => t.repo === repo
                  );
                  return (
                    <div
                      key={wave.id}
                      className="flex-1 min-w-[180px] min-h-[60px]"
                    >
                      {tasksInCell.length > 0 ? (
                        <div className="space-y-1.5">
                          {tasksInCell.map((task) => (
                            <motion.div
                              key={task.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-2.5 rounded-lg border border-border/50 bg-card/80 hover:border-border hover:bg-card transition-all cursor-grab active:cursor-grabbing group"
                            >
                              <div className="flex items-start gap-2">
                                <GripVertical className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 mt-0.5 transition-colors" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    {STATUS_ICON[task.status]}
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                      {task.id}
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-medium leading-snug">
                                    {task.title}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                                    {task.description}
                                  </p>
                                  {task.dependsOn && task.dependsOn.length > 0 && (
                                    <div className="flex items-center gap-1 mt-1.5">
                                      <ArrowRight className="w-2.5 h-2.5 text-muted-foreground/40" />
                                      <span className="text-[9px] text-muted-foreground/60 font-mono">
                                        depends on {task.dependsOn.join(", ")}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-full min-h-[60px] rounded-lg border border-dashed border-border/30 flex items-center justify-center">
                          <span className="text-[10px] text-muted-foreground/30">
                            —
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Dependency arrows legend */}
          <div className="mt-6 p-3 rounded-lg bg-secondary/30 border border-border/30">
            <div className="text-[10px] text-muted-foreground space-y-1">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  {STATUS_ICON.done}
                  <span>Complete</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {STATUS_ICON["in-progress"]}
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {STATUS_ICON.pending}
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                  <span>Dependency</span>
                </div>
              </div>
              <p className="text-muted-foreground/60">
                Drag tasks between waves to reorganize. Dependencies are validated automatically.
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
