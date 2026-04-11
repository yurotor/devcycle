"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Layers, Loader2, Circle, ArrowRight } from "lucide-react";
import { type Ticket } from "@/lib/fake-data";

interface TaskRow {
  id: number;
  title: string;
  description: string;
  status: string;
  waveId: number;
}

interface WaveRow {
  id: number;
  name: string;
  orderIndex: number;
  tasks: TaskRow[];
}

interface DesignPhaseProps {
  ticket: Ticket;
  onComplete: () => void;
}

export function DesignPhase({ ticket, onComplete }: DesignPhaseProps) {
  const [waves, setWaves] = useState<WaveRow[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tickets/${ticket.id}/tasks`)
      .then((r) => r.json())
      .then((data) => setWaves(data.waves ?? []))
      .finally(() => setLoading(false));
  }, [ticket.id]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/design/generate`, {
        method: "POST",
      });
      const data = await res.json();
      setWaves(data.waves ?? []);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (waves.length === 0 && !generating) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-amber/10 border border-amber/20 flex items-center justify-center mx-auto">
            <Layers className="w-5 h-5 text-amber" />
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-sm">Design Task Breakdown</h3>
            <p className="text-xs text-muted-foreground">
              AI will break this ticket into implementation waves and tasks.
            </p>
          </div>
          <Button
            className="bg-amber text-background hover:bg-amber/90 text-xs h-9"
            onClick={generate}
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            Generate Waves
          </Button>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-amber mb-3" />
        <p className="text-xs text-muted-foreground">
          Generating wave/task breakdown...
        </p>
      </div>
    );
  }

  const totalTasks = waves.reduce((n, w) => n + w.tasks.length, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-4 py-3 border-b border-border bg-amber/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-amber" />
          <span className="text-[11px] font-medium">
            {waves.length} waves &middot; {totalTasks} tasks
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[10px] gap-1"
          onClick={generate}
          disabled={generating}
        >
          Regenerate
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {waves.map((wave) => (
            <div
              key={wave.id}
              className="border border-border rounded-lg overflow-hidden"
            >
              <div className="px-3 py-2 bg-secondary/50 border-b border-border">
                <span className="text-[11px] font-medium">{wave.name}</span>
              </div>
              <div className="divide-y divide-border/50">
                {wave.tasks.map((task) => (
                  <div key={task.id} className="px-3 py-2.5 flex items-start gap-2">
                    <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{task.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                        {task.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Review the breakdown, then advance to Implement.
        </p>
        <Button
          size="sm"
          className="h-8 text-xs bg-amber text-background hover:bg-amber/90 gap-1"
          onClick={onComplete}
        >
          <ArrowRight className="w-3.5 h-3.5" />
          Start Implementation
        </Button>
      </div>
    </div>
  );
}
