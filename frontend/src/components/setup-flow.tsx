"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GitBranch,
  Key,
  ChevronRight,
  Check,
  Loader2,
  Shield,
  FolderGit2,
  Zap,
  AlertCircle,
  Search,
} from "lucide-react";

interface SetupFlowProps {
  onComplete: () => void;
  /** "fresh" = first-time setup (full wizard). "add" = new workspace (skip PAT steps). */
  mode?: "fresh" | "add";
}

type Step = "welcome" | "azure-pat" | "workspace-name" | "select-repos" | "jira";

interface AdoRepo {
  adoId: string;
  name: string;
  project: string;
  defaultBranch: string;
}

export function SetupFlow({ onComplete, mode = "fresh" }: SetupFlowProps) {
  const isAdd = mode === "add";
  const [step, setStep] = useState<Step>(isAdd ? "workspace-name" : "welcome");
  const [orgUrl, setOrgUrl] = useState(process.env.NEXT_PUBLIC_DEBUG_ADO_URL ?? "");
  const [pat, setPat] = useState(process.env.NEXT_PUBLIC_DEBUG_ADO_PAT ?? "");
  const [isValidating, setIsValidating] = useState(false);
  const [availableRepos, setAvailableRepos] = useState<AdoRepo[]>([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<string>>(new Set());
  const [repoSearch, setRepoSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [createdWsId, setCreatedWsId] = useState<number | null>(null);

  // Jira step state
  const [jiraUrl, setJiraUrl] = useState(process.env.NEXT_PUBLIC_DEBUG_JIRA_URL ?? "");
  const [jiraProjectKey, setJiraProjectKey] = useState(
    process.env.NEXT_PUBLIC_DEBUG_JIRA_URL
      ? (process.env.NEXT_PUBLIC_DEBUG_JIRA_URL.match(/\/projects\/([A-Z][A-Z0-9_]*)/i)?.[1]?.toUpperCase() ?? "")
      : ""
  );
  const [jiraEmail, setJiraEmail] = useState(process.env.NEXT_PUBLIC_DEBUG_JIRA_EMAIL ?? "");
  const [jiraToken, setJiraToken] = useState(process.env.NEXT_PUBLIC_DEBUG_JIRA_TOKEN ?? "");
  const [isConnectingJira, setIsConnectingJira] = useState(false);

  /** Extracts the org name from https://dev.azure.com/org-name */
  const orgName = orgUrl.trim().replace(/\/$/, "").split("/").pop() ?? orgUrl;

  /** Groups repos by project for the UI header label. */
  const projectNames = [...new Set(availableRepos.map((r) => r.project))];
  const projectLabel =
    projectNames.length === 1 ? projectNames[0] : `${projectNames.length} projects`;

  const toggleRepo = (adoId: string) => {
    setSelectedRepoIds((prev) => {
      const next = new Set(prev);
      if (next.has(adoId)) next.delete(adoId);
      else next.add(adoId);
      return next;
    });
  };

  // ── Workspace name step → load repos with stored creds ──────

  const handleWorkspaceNameNext = async () => {
    setError(null);
    setLoadingRepos(true);
    try {
      const res = await fetch("/api/azure/repos");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to list repos");
      setAvailableRepos(data.repos);
      setSelectedRepoIds(new Set());
      setStep("select-repos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load repos");
    } finally {
      setLoadingRepos(false);
    }
  };

  // ── Step 1: validate PAT + list repos ──────────────────────

  const handleValidatePat = async () => {
    setError(null);
    setIsValidating(true);
    try {
      const res = await fetch("/api/azure/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgUrl, pat }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.detail
          ? `${data.error} — ${data.detail}`
          : (data.error ?? "Connection failed");
        throw new Error(msg);
      }

      setAvailableRepos(data.repos);

      // Pre-select repos matching NEXT_PUBLIC_PROJECTS env var (case-insensitive)
      const defaultProjects = (process.env.NEXT_PUBLIC_PROJECTS ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (defaultProjects.length > 0) {
        const matched = new Set(
          (data.repos as AdoRepo[])
            .filter((r) => defaultProjects.includes(r.name.toLowerCase()))
            .map((r) => r.adoId)
        );
        setSelectedRepoIds(matched);
      } else {
        setSelectedRepoIds(new Set());
      }

      setStep("select-repos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsValidating(false);
    }
  };

  // ── Step 2: save workspace + trigger scan + go to Jira step ──

  const handleSave = async () => {
    setError(null);
    const selected = availableRepos.filter((r) => selectedRepoIds.has(r.adoId));
    try {
      const payload: Record<string, unknown> = {
        name: isAdd ? workspaceName : orgName,
        azureOrgUrl: orgUrl,
        repos: selected,
      };
      // Only send PAT on first-time setup
      if (!isAdd) payload.pat = pat;

      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save workspace");
      }
      const newWsId = data.id;
      if (newWsId) setCreatedWsId(newWsId);
      // Fire-and-forget: start scan in background
      fetch(`/api/scan/start${newWsId ? `?wsId=${newWsId}` : ""}`, { method: "POST" }).catch(console.error);
      setStep("jira");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  /** Extracts project key from a Jira URL like .../projects/CLN/boards/482 */
  const extractProjectKey = (url: string): string => {
    const m = url.match(/\/projects\/([A-Z][A-Z0-9_]*)/i);
    return m ? m[1].toUpperCase() : "";
  };

  const handleJiraUrlChange = (url: string) => {
    setJiraUrl(url);
    const key = extractProjectKey(url);
    if (key) setJiraProjectKey(key);
  };

  // ── Step 3a: connect Jira ───────────────────────────────────

  const handleJiraConnect = async () => {
    setError(null);
    setIsConnectingJira(true);
    try {
      const res = await fetch(`/api/jira/connect${createdWsId ? `?wsId=${createdWsId}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jiraUrl, projectKey: jiraProjectKey, email: jiraEmail, token: jiraToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.detail
          ? `${data.error} — ${data.detail}`
          : (data.error ?? "Jira connection failed");
        throw new Error(msg);
      }
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Jira connection failed");
    } finally {
      setIsConnectingJira(false);
    }
  };

  // ── Step 3b: skip Jira ──────────────────────────────────────

  const handleJiraSkip = () => {
    onComplete();
  };

  return (
    <div className="h-full flex items-center justify-center relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-cyan/5 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-violet/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg px-6">
        <AnimatePresence mode="wait">

          {/* ── Welcome ─────────────────────────────────────── */}
          {step === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-8"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-cyan" />
                  </div>
                  <span className="text-lg font-semibold tracking-tight">DevCycle</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Ship better software,
                  <br />
                  <span className="text-cyan">faster.</span>
                </h1>
                <p className="text-muted-foreground text-base leading-relaxed">
                  Connect your repos and tickets. DevCycle scans your codebase,
                  builds a knowledge base, and guides your team from analysis to
                  production.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { icon: FolderGit2, label: "Scan & understand your codebase" },
                  { icon: Shield, label: "Detect security & architecture issues" },
                  { icon: GitBranch, label: "AI-powered implementation & review" },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
                    className="flex items-center gap-3 text-sm text-muted-foreground"
                  >
                    <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4" />
                    </div>
                    {item.label}
                  </motion.div>
                ))}
              </div>

              <Button
                className="w-full h-11 bg-cyan text-background font-medium hover:bg-cyan/90 transition-all"
                onClick={() => setStep("azure-pat")}
              >
                Get Started
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {/* ── Azure PAT ───────────────────────────────────── */}
          {step === "azure-pat" && (
            <motion.div
              key="pat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Connect Azure DevOps</h2>
                <p className="text-muted-foreground text-sm">
                  Provide a Personal Access Token with read access to code, and
                  permissions to create and comment on pull requests.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Organization URL
                  </label>
                  <Input
                    placeholder="https://dev.azure.com/your-org"
                    className="h-11 bg-secondary border-border/50 font-mono text-sm"
                    value={orgUrl}
                    onChange={(e) => setOrgUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !isValidating && pat.length >= 3 && orgUrl.length >= 10 && handleValidatePat()}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Personal Access Token
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Enter your PAT"
                      className="h-11 pl-10 bg-secondary border-border/50 font-mono text-sm"
                      value={pat}
                      onChange={(e) => setPat(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !isValidating && pat.length >= 3 && orgUrl.length >= 10 && handleValidatePat()}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-cyan/5 border border-cyan/10">
                  <Shield className="w-4 h-4 text-cyan shrink-0" />
                  <span className="text-xs text-cyan/80">
                    Your PAT is stored locally and encrypted. It never leaves your machine.
                  </span>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-rose/10 border border-rose/20">
                    <AlertCircle className="w-4 h-4 text-rose shrink-0" />
                    <span className="text-xs text-rose/90">{error}</span>
                  </div>
                )}
              </div>

              <Button
                className="w-full h-11 bg-cyan text-background font-medium hover:bg-cyan/90 transition-all"
                onClick={handleValidatePat}
                disabled={isValidating || pat.length < 3 || orgUrl.length < 10}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect & Select Repos
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* ── Workspace Name (add mode) ─────────────────── */}
          {step === "workspace-name" && (
            <motion.div
              key="workspace-name"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">New Workspace</h2>
                <p className="text-muted-foreground text-sm">
                  Give your workspace a name, then pick which repos to include.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Workspace name
                  </label>
                  <Input
                    placeholder="e.g. Lending, Platform, Mobile"
                    className="h-11 bg-secondary border-border/50 text-sm"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && workspaceName.trim() && handleWorkspaceNameNext()}
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-rose/10 border border-rose/20">
                    <AlertCircle className="w-4 h-4 text-rose shrink-0" />
                    <span className="text-xs text-rose/90">{error}</span>
                  </div>
                )}
              </div>

              <Button
                className="w-full h-11 bg-cyan text-background font-medium hover:bg-cyan/90 transition-all"
                onClick={handleWorkspaceNameNext}
                disabled={!workspaceName.trim() || loadingRepos}
              >
                {loadingRepos ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading repos...
                  </>
                ) : (
                  <>
                    Select Repos
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* ── Select repos ────────────────────────────────── */}
          {step === "select-repos" && (
            <motion.div
              key="repos"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="space-y-2">
                {!isAdd && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
                    <span className="text-xs text-emerald font-medium">
                      Connected to {orgName}
                    </span>
                  </div>
                )}
                {isAdd && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground font-medium">
                      Workspace: {workspaceName}
                    </span>
                  </div>
                )}
                <h2 className="text-2xl font-bold tracking-tight">Select repositories</h2>
                <p className="text-muted-foreground text-sm">
                  Choose which repos to include in this workspace.
                </p>
              </div>

              {(() => {
                const projects = [...new Set(availableRepos.map((r) => r.project))].sort();
                if (projects.length <= 1) return null;
                return (
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-secondary border border-border/50 rounded-md outline-none focus:border-cyan/40 focus:ring-1 focus:ring-cyan/20 text-foreground"
                  >
                    <option value="">All projects</option>
                    {projects.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                );
              })()}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter repos..."
                  className="h-9 pl-9 bg-secondary border-border/50 text-xs"
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                />
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(() => {
                  const q = repoSearch.trim().toLowerCase();
                  let filtered = selectedProject
                    ? availableRepos.filter((r) => r.project === selectedProject)
                    : availableRepos;
                  if (q) {
                    filtered = filtered.filter((r) => r.name.toLowerCase().includes(q));
                  }
                  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selectedRepoIds.has(r.adoId));
                  const toggleAll = () => {
                    setSelectedRepoIds((prev) => {
                      const next = new Set(prev);
                      if (allFilteredSelected) {
                        filtered.forEach((r) => next.delete(r.adoId));
                      } else {
                        filtered.forEach((r) => next.add(r.adoId));
                      }
                      return next;
                    });
                  };
                  return (
                    <>
                      <div className="flex items-center justify-between px-1 mb-2">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                          {filtered.length !== availableRepos.length ? `${filtered.length} of ${availableRepos.length}` : availableRepos.length} repositories
                          {selectedRepoIds.size > 0 && ` · ${selectedRepoIds.size} selected`}
                        </span>
                        {filtered.length > 0 && (
                          <button
                            onClick={toggleAll}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                              allFilteredSelected ? "bg-cyan border-cyan" : "border-muted-foreground/30"
                            }`}>
                              {allFilteredSelected && <Check className="w-2.5 h-2.5 text-background" />}
                            </div>
                            {allFilteredSelected ? "Unselect all" : "Select all"}
                          </button>
                        )}
                      </div>
                      {filtered.map((repo, i) => (
                  <motion.button
                    key={repo.adoId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => toggleRepo(repo.adoId)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                      selectedRepoIds.has(repo.adoId)
                        ? "bg-cyan/5 border-cyan/30"
                        : "bg-secondary/50 border-border/50 hover:border-border"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        selectedRepoIds.has(repo.adoId)
                          ? "bg-cyan border-cyan"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {selectedRepoIds.has(repo.adoId) && (
                        <Check className="w-3 h-3 text-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{repo.name}</span>
                        {repo.defaultBranch !== "main" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber/10 text-amber border border-amber/20 font-mono">
                            {repo.defaultBranch}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {repo.project}
                      </div>
                    </div>
                  </motion.button>
                      ))}
                      {filtered.length === 0 && (
                        <div className="py-8 text-center text-xs text-muted-foreground/50">
                          No repos match &ldquo;{repoSearch}&rdquo;
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-rose/10 border border-rose/20">
                  <AlertCircle className="w-4 h-4 text-rose shrink-0" />
                  <span className="text-xs text-rose/90">{error}</span>
                </div>
              )}

              <Button
                className="w-full h-11 bg-cyan text-background font-medium hover:bg-cyan/90 transition-all"
                onClick={handleSave}
                disabled={selectedRepoIds.size === 0}
              >
                Scan {selectedRepoIds.size}{" "}
                {selectedRepoIds.size === 1 ? "repository" : "repositories"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {/* ── Jira (optional) ─────────────────────────────── */}
          {step === "jira" && (
            <motion.div
              key="jira"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Connect Jira</h2>
                <p className="text-muted-foreground text-sm">
                  Link your Jira project to load tickets onto the board. You can
                  skip this and connect later.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Jira board or project URL
                  </label>
                  <Input
                    placeholder="https://myorg.atlassian.net/jira/software/projects/CLN/boards/1"
                    className="h-11 bg-secondary border-border/50 font-mono text-xs"
                    value={jiraUrl}
                    onChange={(e) => handleJiraUrlChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Project key
                  </label>
                  <Input
                    placeholder="CLN"
                    className="h-11 bg-secondary border-border/50 font-mono text-sm uppercase"
                    value={jiraProjectKey}
                    onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Email{" "}
                    <span className="normal-case font-normal text-muted-foreground/60">
                      (Jira Cloud only)
                    </span>
                  </label>
                  <Input
                    placeholder="you@company.com"
                    className="h-11 bg-secondary border-border/50 text-sm"
                    value={jiraEmail}
                    onChange={(e) => setJiraEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    API Token / PAT
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Enter your token"
                      className="h-11 pl-10 bg-secondary border-border/50 font-mono text-sm"
                      value={jiraToken}
                      onChange={(e) => setJiraToken(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-rose/10 border border-rose/20">
                    <AlertCircle className="w-4 h-4 text-rose shrink-0" />
                    <span className="text-xs text-rose/90">{error}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-11"
                  onClick={handleJiraSkip}
                >
                  Skip for now
                </Button>
                <Button
                  className="flex-1 h-11 bg-cyan text-background font-medium hover:bg-cyan/90"
                  onClick={handleJiraConnect}
                  disabled={isConnectingJira || !jiraUrl || !jiraToken}
                >
                  {isConnectingJira ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Connect Jira
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
