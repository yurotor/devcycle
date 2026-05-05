"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ChevronLeft,
  FileText,
  TestTube,
  Loader2,
  RefreshCw,
  Shield,
  CheckCircle,
  Clock,
  Sparkles,
  Pencil,
  Eye,
  Upload,
  AlertTriangle,
  List,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────

interface Epic {
  id: number;
  jiraKey: string;
  title: string;
  description: string | null;
  status: string;
  assignee: string | null;
  sdlcPhase: string;
}

interface ArtifactSection {
  id: number;
  artifactId: number;
  sectionKey: string;
  title: string;
  contentMarkdown: string;
  lastGeneratedAt: number | null;
  lastEditedByUser: number;
  orderIndex: number;
}

interface Artifact {
  id: number;
  epicId: number;
  type: string;
  status: string;
  generatedAt: number | null;
  editedAt: number | null;
  sections: ArtifactSection[];
}

interface Signoff {
  id: number;
  epicId: number;
  role: string;
  personName: string | null;
  status: string;
  signedAt: number | null;
}

const PHASE_STEPS = [
  { key: "design", label: "Design" },
  { key: "development", label: "Development" },
  { key: "testing", label: "Testing" },
  { key: "deployed", label: "Deployed" },
];

const ROLE_LABELS: Record<string, string> = {
  vp_eng: "VP Engineering",
  solution_architect: "Solution Architect",
  product_manager: "Product Manager",
  engineering_manager: "Engineering Manager",
};

// ─── Component ──────────────────────────────────────────────────

export function SdlcEpicDetail({
  epicId,
  wsId,
  onBack,
}: {
  epicId: number;
  wsId: number;
  onBack: () => void;
}) {
  const [epic, setEpic] = useState<Epic | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [signoffs, setSignoffs] = useState<Signoff[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState<{
    currentSection: string | null;
    completedSections: number;
    totalSections: number;
  } | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [activeArtifact, setActiveArtifact] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState("");
  const [tocOpen, setTocOpen] = useState(() => typeof window !== "undefined" && window.innerWidth > 1280);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentArtifactForToc = artifacts.find((a) => a.type === activeArtifact) ?? null;

  const fetchDetail = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/sdlc/epics/${epicId}`);
      if (res.ok) {
        const data = await res.json();
        setEpic(data.epic);
        setArtifacts(data.artifacts);
        setSignoffs(data.signoffs);
        if (!activeArtifact && data.artifacts.length > 0) {
          setActiveArtifact(data.artifacts[0].type);
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [epicId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Build TOC entries from current artifact sections
  const tocEntries = useMemo(() => {
    if (!currentArtifactForToc) return [];
    const entries: { id: string; title: string; level: number }[] = [];
    for (const section of currentArtifactForToc.sections) {
      const sectionId = `section-${section.sectionKey}`;
      entries.push({ id: sectionId, title: section.title, level: 0 });
      const sectionTitleLower = section.title.toLowerCase().trim();
      const lines = (section.contentMarkdown ?? "").split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith("### ")) {
          const title = line.slice(4);
          if (title.toLowerCase().trim() !== sectionTitleLower) {
            entries.push({ id: `${sectionId}-h3-${i}`, title, level: 2 });
          }
        } else if (line.startsWith("## ")) {
          const title = line.slice(3);
          if (title.toLowerCase().trim() !== sectionTitleLower) {
            entries.push({ id: `${sectionId}-h2-${i}`, title, level: 1 });
          }
        }
      }
    }
    return entries;
  }, [currentArtifactForToc]);

  // Scroll tracking for active heading
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || tocEntries.length === 0) return;

    const handleScroll = () => {
      const containerTop = container.getBoundingClientRect().top;
      let active: string | null = null;
      for (const entry of tocEntries) {
        const el = document.getElementById(entry.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top - containerTop <= 80) {
            active = entry.id;
          }
        }
      }
      setActiveHeadingId(active);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [tocEntries]);

  const handleGenerate = async (type: string) => {
    setGenerating(type);
    setGenProgress({ currentSection: null, completedSections: 0, totalSections: 0 });
    setActiveArtifact(type);

    try {
      const res = await fetch("/api/sdlc/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epicId, type }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("[sdlc] generation failed:", data);
        setGenerating(null);
        setGenProgress(null);
        return;
      }

      const { artifactId } = await res.json();
      let lastCompleted = 0;

      const poll = async () => {
        try {
          const sr = await fetch(`/api/sdlc/generate-status?artifactId=${artifactId}`);
          if (!sr.ok) return;
          const status = await sr.json();

          setGenProgress({
            currentSection: status.currentSection,
            completedSections: status.completedSections,
            totalSections: status.totalSections,
          });

          if (status.completedSections > lastCompleted) {
            lastCompleted = status.completedSections;
            await fetchDetail(true);
          }

          if (status.status === "done" || status.status === "failed") {
            setGenerating(null);
            setGenProgress(null);
            await fetchDetail(true);
            return;
          }
        } catch {}
        setTimeout(poll, 2000);
      };

      setTimeout(poll, 2000);
    } catch {
      setGenerating(null);
      setGenProgress(null);
    }
  };

  const handleRegenerateSection = async (artifactId: number, sectionKey: string) => {
    setRegenerating(sectionKey);
    try {
      const res = await fetch("/api/sdlc/regenerate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifactId, sectionKey }),
      });
      if (res.ok) {
        await fetchDetail();
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("[sdlc] regen failed:", data);
        alert(`Regeneration failed: ${data.detail ?? data.error ?? "unknown error"}`);
      }
    } finally {
      setRegenerating(null);
    }
  };

  const handleSaveSection = async (artifactId: number, sectionKey: string) => {
    await fetch(`/api/sdlc/artifacts/${artifactId}/sections/${sectionKey}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editBuffer }),
    });
    setEditingSection(null);
    await fetchDetail();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!epic) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        Epic not found
      </div>
    );
  }

  const designDoc = artifacts.find((a) => a.type === "design_doc");
  const testPlan = artifacts.find((a) => a.type === "test_plan");
  const currentArtifact = artifacts.find((a) => a.type === activeArtifact);

  const handleTocClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="h-full flex">
      {/* TOC Rail */}
      {currentArtifact && tocOpen && (
        <div className="w-56 shrink-0 border-r border-border bg-secondary/20 overflow-y-auto sticky top-0 h-full">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contents</span>
            <button
              onClick={() => setTocOpen(false)}
              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
          <nav className="p-2 space-y-0.5">
            {tocEntries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => handleTocClick(entry.id)}
                className={`w-full text-left px-2 py-1 rounded text-xs transition-colors relative ${
                  activeHeadingId === entry.id
                    ? "bg-cyan/10 text-cyan font-medium border-l-2 border-cyan"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50 border-l-2 border-transparent"
                }`}
                style={{ paddingLeft: `${entry.level * 12 + 8}px` }}
              >
                <span className="line-clamp-2">{entry.title}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
      {/* TOC closed tab */}
      {currentArtifact && !tocOpen && (
        <button
          onClick={() => setTocOpen(true)}
          className="shrink-0 w-6 flex flex-col items-center justify-center border-r border-border bg-secondary/20 hover:bg-secondary/40 transition-colors group"
          title="Show table of contents"
        >
          <List className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
        </button>
      )}
      <div ref={scrollRef} className="h-full overflow-auto flex-1">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onBack}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-muted-foreground">
                {epic.jiraKey}
              </span>
              <PhaseBadge phase={epic.sdlcPhase} />
            </div>
            <h1 className="text-lg font-semibold tracking-tight truncate mt-0.5">
              {epic.title}
            </h1>
          </div>
        </div>

        {/* Phase timeline */}
        <div className="flex items-center gap-1">
          {PHASE_STEPS.map((step, i) => {
            const currentIdx = PHASE_STEPS.findIndex((s) => s.key === epic.sdlcPhase);
            const isPast = i < currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <div key={step.key} className="flex items-center gap-1 flex-1">
                <div
                  className={`flex-1 h-1.5 rounded-full transition-colors ${
                    isPast
                      ? "bg-emerald"
                      : isCurrent
                      ? "bg-cyan"
                      : "bg-border"
                  }`}
                />
                <span
                  className={`text-xs whitespace-nowrap ${
                    isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Generation banner */}
        {generating && genProgress && (
          <div className="px-4 py-3 rounded-lg border border-cyan/20 bg-cyan/5 space-y-2">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-cyan shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-cyan">
                  Generating {generating === "design_doc" ? "Design Document" : "Test Plan"}
                  {genProgress.totalSections > 0
                    ? ` (${genProgress.completedSections}/${genProgress.totalSections})`
                    : "..."}
                </span>
                {genProgress.currentSection && (
                  <span className="text-[10px] text-muted-foreground block mt-0.5 truncate">
                    Writing: {genProgress.currentSection}
                  </span>
                )}
              </div>
            </div>
            {genProgress.totalSections > 0 && (
              <div className="h-1 rounded-full bg-cyan/10 overflow-hidden">
                <div
                  className="h-full bg-cyan rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((genProgress.completedSections / genProgress.totalSections) * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Artifact cards */}
        <div className="grid grid-cols-2 gap-3">
          <ArtifactCard
            icon={FileText}
            label="Design Document"
            type="design_doc"
            artifact={designDoc}
            generating={generating === "design_doc"}
            active={activeArtifact === "design_doc"}
            onGenerate={() => handleGenerate("design_doc")}
            onSelect={() => setActiveArtifact("design_doc")}
          />
          <ArtifactCard
            icon={TestTube}
            label="Test Plan"
            type="test_plan"
            artifact={testPlan}
            generating={generating === "test_plan"}
            active={activeArtifact === "test_plan"}
            onGenerate={() => handleGenerate("test_plan")}
            onSelect={() => setActiveArtifact("test_plan")}
          />
        </div>

        {/* Signoff tracker */}
        {signoffs.length > 0 && (
          <div className="border border-border rounded-lg p-3">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-violet" />
              Signoff Tracker
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {signoffs.map((s) => (
                <button
                  key={s.id}
                  onClick={async () => {
                    await fetch(`/api/sdlc/signoffs/${s.id}`, { method: "PATCH" });
                    await fetchDetail(true);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-xs border cursor-pointer transition-colors ${
                    s.status === "approved"
                      ? "border-emerald/20 bg-emerald/5 hover:bg-emerald/10"
                      : "border-border bg-secondary/30 hover:bg-secondary/50"
                  }`}
                >
                  {s.status === "approved" ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald shrink-0" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0 text-left">
                    <div className="font-medium truncate">
                      {ROLE_LABELS[s.role] ?? s.role}
                    </div>
                    {s.personName && (
                      <div className="text-muted-foreground truncate">{s.personName}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Artifact content */}
        {currentArtifact && (
          <div className="border border-border rounded-lg">
            <div className="px-4 py-2 border-b border-border bg-secondary/30 flex items-center gap-2">
              <span className="text-sm font-medium">
                {currentArtifact.type === "design_doc" ? "Design Document" : "Test Plan"}
              </span>
              <StatusBadge status={currentArtifact.status} />
              <div className="ml-auto flex items-center gap-2">
                {currentArtifact.generatedAt && (
                  <span className="text-xs text-muted-foreground">
                    Generated {new Date(currentArtifact.generatedAt).toLocaleDateString()}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5 px-2.5 cursor-pointer"
                  onClick={() => alert("Confluence publishing is coming soon!")}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Publish to Confluence
                </Button>
              </div>
            </div>
            <div className="divide-y divide-border/50">
              {currentArtifact.sections.map((section) => {
                const isEditing = editingSection === `${currentArtifact.id}:${section.sectionKey}`;
                const isRegen = regenerating === section.sectionKey;
                return (
                  <div key={section.id} id={`section-${section.sectionKey}`} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-semibold">{section.title}</h4>
                      {section.lastEditedByUser === 1 && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-cyan/10 text-cyan border border-cyan/20">
                          edited
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (isEditing) {
                              setEditingSection(null);
                            } else {
                              setEditingSection(`${currentArtifact.id}:${section.sectionKey}`);
                              setEditBuffer(section.contentMarkdown);
                            }
                          }}
                          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          title={isEditing ? "Cancel edit" : "Edit"}
                        >
                          {isEditing ? <Eye className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => handleRegenerateSection(currentArtifact.id, section.sectionKey)}
                          disabled={isRegen}
                          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                          title="Regenerate section"
                        >
                          {isRegen ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editBuffer}
                          onChange={(e) => setEditBuffer(e.target.value)}
                          className="w-full min-h-[120px] px-3 py-2 text-sm font-mono bg-secondary/50 border border-border rounded-md outline-none focus:border-cyan/40 focus:ring-1 focus:ring-cyan/20 resize-y"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px]"
                            onClick={() => setEditingSection(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-6 text-[10px] bg-cyan text-background hover:bg-cyan/90"
                            onClick={() => handleSaveSection(currentArtifact.id, section.sectionKey)}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-foreground/90 leading-relaxed prose prose-sm prose-invert max-w-none">
                        <MarkdownContent content={section.contentMarkdown} sectionKey={section.sectionKey} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Epic description */}
        {epic.description && (
          <div className="border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">
              Epic Description
            </h3>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {epic.description}
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function PhaseBadge({ phase }: { phase: string }) {
  const config: Record<string, { label: string; color: string; bg: string; border: string }> = {
    design: { label: "Design", color: "text-violet", bg: "bg-violet/10", border: "border-violet/20" },
    development: { label: "Development", color: "text-cyan", bg: "bg-cyan/10", border: "border-cyan/20" },
    testing: { label: "Testing", color: "text-amber", bg: "bg-amber/10", border: "border-amber/20" },
    deployed: { label: "Deployed", color: "text-emerald", bg: "bg-emerald/10", border: "border-emerald/20" },
  };
  const c = config[phase] ?? config.design;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${c.bg} ${c.color} border ${c.border}`}>
      {c.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald/10 text-emerald border border-emerald/20">
        Approved
      </span>
    );
  }
  if (status === "reviewed") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-cyan/10 text-cyan border border-cyan/20">
        Reviewed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber/10 text-amber border border-amber/20">
      Draft
    </span>
  );
}

function ArtifactCard({
  icon: Icon,
  label,
  type,
  artifact,
  generating,
  active,
  onGenerate,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  type: string;
  artifact: Artifact | undefined;
  generating: boolean;
  active: boolean;
  onGenerate: () => void;
  onSelect: () => void;
}) {
  if (!artifact) {
    return (
      <div className="border border-dashed border-border rounded-lg p-4 flex flex-col items-center gap-2">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
        <Button
          size="sm"
          className="h-7 text-xs gap-1.5 bg-cyan text-background hover:bg-cyan/90"
          onClick={onGenerate}
          disabled={generating}
        >
          {generating ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3" /> Generate
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={onSelect}
      className={`border rounded-lg p-3 text-left transition-colors ${
        active
          ? "border-cyan/40 bg-cyan/5"
          : "border-border hover:border-border/80 hover:bg-secondary/20"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${active ? "text-cyan" : "text-muted-foreground"}`} />
        <span className="text-sm font-medium">{label}</span>
        <StatusBadge status={artifact.status} />
      </div>
      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
        <span>{artifact.sections.length} sections</span>
        {artifact.generatedAt && (
          <span>· {new Date(artifact.generatedAt).toLocaleDateString()}</span>
        )}
      </div>
      <div className="mt-1.5">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[10px] gap-1 px-2"
          onClick={(e) => {
            e.stopPropagation();
            onGenerate();
          }}
          disabled={generating}
        >
          {generating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          Regenerate
        </Button>
      </div>
    </button>
  );
}

function MarkdownContent({ content, sectionKey }: { content: string; sectionKey?: string }) {
  if (!content) {
    return <span className="text-muted-foreground italic">No content yet</span>;
  }

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      const headingId = sectionKey ? `section-${sectionKey}-h3-${i}` : undefined;
      elements.push(
        <h5 key={i} id={headingId} className="font-semibold mt-3 mb-1">
          {line.slice(4)}
        </h5>
      );
    } else if (line.startsWith("## ")) {
      const headingId = sectionKey ? `section-${sectionKey}-h2-${i}` : undefined;
      elements.push(
        <h4 key={i} id={headingId} className="font-semibold mt-3 mb-1">
          {line.slice(3)}
        </h4>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h3 key={i} className="font-bold mt-3 mb-1">
          {line.slice(2)}
        </h3>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="ml-4 list-disc">
          <InlineMarkdown text={line.slice(2)} />
        </li>
      );
    } else if (line.match(/^\d+\. /)) {
      const text = line.replace(/^\d+\. /, "");
      elements.push(
        <li key={i} className="ml-4 list-decimal">
          <InlineMarkdown text={text} />
        </li>
      );
    } else if (line.startsWith("```")) {
      // Collect code block
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} className="bg-secondary/80 rounded px-2 py-1.5 my-1 text-[10px] overflow-x-auto">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i}>
          <InlineMarkdown text={line} />
        </p>
      );
    }
  }

  return <>{elements}</>;
}

function InlineMarkdown({ text }: { text: string }) {
  // Handle **bold**, `code`, and *italic*
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Code
    const codeMatch = remaining.match(/`(.+?)`/);

    const matches = [
      boldMatch ? { idx: boldMatch.index!, len: boldMatch[0].length, type: "bold" as const, content: boldMatch[1] } : null,
      codeMatch ? { idx: codeMatch.index!, len: codeMatch[0].length, type: "code" as const, content: codeMatch[1] } : null,
    ]
      .filter(Boolean)
      .sort((a, b) => a!.idx - b!.idx);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;
    if (first.idx > 0) {
      parts.push(remaining.slice(0, first.idx));
    }

    if (first.type === "bold") {
      parts.push(<strong key={key++}>{first.content}</strong>);
    } else {
      parts.push(
        <code key={key++} className="bg-secondary/80 px-1 rounded text-[10px]">
          {first.content}
        </code>
      );
    }

    remaining = remaining.slice(first.idx + first.len);
  }

  return <>{parts}</>;
}
