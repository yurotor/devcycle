"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Plus,
  Trash2,
  Loader2,
  Save,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PhaseMapping {
  jiraStatus: string;
  sdlcPhase: string;
}

const SDLC_PHASES = [
  { value: "design", label: "Design" },
  { value: "development", label: "Development" },
  { value: "testing", label: "Testing" },
  { value: "deployed", label: "Deployed" },
];

export function SdlcPhaseConfig({
  wsId,
  onClose,
}: {
  wsId: number;
  onClose: () => void;
}) {
  const [mappings, setMappings] = useState<PhaseMapping[]>([]);
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/sdlc/config?wsId=${wsId}`);
        if (res.ok) {
          const data = await res.json();
          setMappings(data.mappings);
          setIsDefault(data.isDefault);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [wsId]);

  const handleAdd = () => {
    setMappings([...mappings, { jiraStatus: "", sdlcPhase: "design" }]);
    setDirty(true);
  };

  const handleRemove = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
    setDirty(true);
  };

  const handleChange = (index: number, field: keyof PhaseMapping, value: string) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], [field]: value };
    setMappings(updated);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/sdlc/config?wsId=${wsId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings: mappings.filter((m) => m.jiraStatus.trim()) }),
      });
      setIsDefault(false);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      // Delete custom config → API will return defaults
      await fetch(`/api/sdlc/config?wsId=${wsId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings: [] }),
      });
      const res = await fetch(`/api/sdlc/config?wsId=${wsId}`);
      if (res.ok) {
        const data = await res.json();
        setMappings(data.mappings);
        setIsDefault(true);
        setDirty(false);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group mappings by phase for display
  const grouped = SDLC_PHASES.map((phase) => ({
    ...phase,
    statuses: mappings
      .map((m, i) => ({ ...m, index: i }))
      .filter((m) => m.sdlcPhase === phase.value),
  }));

  return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Settings className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">SDLC Phase Mapping</h2>
        {isDefault && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
            Using defaults
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {!isDefault && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] gap-1"
              onClick={handleReset}
            >
              <RotateCcw className="w-3 h-3" /> Reset to defaults
            </Button>
          )}
          <Button
            size="sm"
            className="h-7 text-[11px] gap-1 bg-cyan text-background hover:bg-cyan/90"
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Map Jira statuses to SDLC phases. When Epics are synced, their Jira status determines which SDLC phase they appear in.
      </p>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-secondary/50 border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-1/2">
                Jira Status
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-1/3">
                SDLC Phase
              </th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {mappings.map((m, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="px-3 py-1.5">
                  <Input
                    value={m.jiraStatus}
                    onChange={(e) => handleChange(i, "jiraStatus", e.target.value)}
                    className="h-7 text-xs bg-transparent border-border/50"
                    placeholder="e.g. In Progress"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <select
                    value={m.sdlcPhase}
                    onChange={(e) => handleChange(i, "sdlcPhase", e.target.value)}
                    className="h-7 w-full px-2 text-xs bg-secondary border border-border/50 rounded-md outline-none"
                  >
                    {SDLC_PHASES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <button
                    onClick={() => handleRemove(i)}
                    className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-rose hover:bg-rose/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="h-7 text-[11px] gap-1"
        onClick={handleAdd}
      >
        <Plus className="w-3 h-3" /> Add mapping
      </Button>
    </div>
  );
}
