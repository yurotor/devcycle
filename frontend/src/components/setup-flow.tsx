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
} from "lucide-react";
import { FAKE_REPOS } from "@/lib/fake-data";

interface SetupFlowProps {
  onComplete: () => void;
}

type Step = "welcome" | "azure-pat" | "select-repos" | "connecting";

export function SetupFlow({ onComplete }: SetupFlowProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [pat, setPat] = useState("");
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());

  const toggleRepo = (id: string) => {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConnect = () => {
    setStep("connecting");
    setTimeout(onComplete, 2500);
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
                  <span className="text-lg font-semibold tracking-tight">
                    DevCycle
                  </span>
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
                  {
                    icon: FolderGit2,
                    label: "Scan & understand your codebase",
                  },
                  {
                    icon: Shield,
                    label: "Detect security & architecture issues",
                  },
                  {
                    icon: GitBranch,
                    label: "AI-powered implementation & review",
                  },
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
                <h2 className="text-2xl font-bold tracking-tight">
                  Connect Azure DevOps
                </h2>
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
                    defaultValue="https://dev.azure.com/fintech-corp"
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
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-cyan/5 border border-cyan/10">
                  <Shield className="w-4 h-4 text-cyan shrink-0" />
                  <span className="text-xs text-cyan/80">
                    Your PAT is stored locally and encrypted. It never leaves
                    your machine.
                  </span>
                </div>
              </div>

              <Button
                className="w-full h-11 bg-cyan text-background font-medium hover:bg-cyan/90 transition-all"
                onClick={() => setStep("select-repos")}
                disabled={pat.length < 3}
              >
                Connect & Select Repos
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

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
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
                  <span className="text-xs text-emerald font-medium">
                    Connected to fintech-corp
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Select repositories
                </h2>
                <p className="text-muted-foreground text-sm">
                  Choose which repos to scan. The AI will analyze the codebase
                  and build your knowledge base.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-1 mb-3">
                  FinTech Platform — {FAKE_REPOS.length} repositories
                </div>
                {FAKE_REPOS.map((repo, i) => (
                  <motion.button
                    key={repo.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => toggleRepo(repo.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                      selectedRepos.has(repo.id)
                        ? "bg-cyan/5 border-cyan/30"
                        : "bg-secondary/50 border-border/50 hover:border-border"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        selectedRepos.has(repo.id)
                          ? "bg-cyan border-cyan"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {selectedRepos.has(repo.id) && (
                        <Check className="w-3 h-3 text-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {repo.name}
                        </span>
                        {repo.defaultBranch !== "main" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber/10 text-amber border border-amber/20 font-mono">
                            {repo.defaultBranch}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {repo.languages.join(", ")}
                        </span>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="text-xs text-muted-foreground">
                          {repo.fileCount} files
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              <Button
                className="w-full h-11 bg-cyan text-background font-medium hover:bg-cyan/90 transition-all"
                onClick={handleConnect}
                disabled={selectedRepos.size === 0}
              >
                Scan {selectedRepos.size} repositories
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {step === "connecting" && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col items-center gap-4 py-12"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-cyan animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-2xl bg-cyan/10 animate-ping opacity-20" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-semibold">Initializing scan...</h3>
                <p className="text-sm text-muted-foreground">
                  Connecting to Azure DevOps and preparing workspace
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
