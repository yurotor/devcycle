"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  RefreshCw,
  Zap,
} from "lucide-react";

export interface KBFile {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: KBFile[];
}

interface KBBrowserProps {
  onFileClick: (path: string) => void;
}

function FileNode({
  node,
  depth,
  onFileClick,
}: {
  node: KBFile;
  depth: number;
  onFileClick: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-1.5 py-1 px-2 hover:bg-accent/50 rounded text-sm transition-colors group"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          )}
          {expanded ? (
            <FolderOpen className="w-3.5 h-3.5 text-amber shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-amber shrink-0" />
          )}
          <span className="text-sm truncate">{node.name}</span>
        </button>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <FileNode
                key={child.path}
                node={child}
                depth={depth + 1}
                onFileClick={onFileClick}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isMd = node.name.endsWith(".md");
  const isJson = node.name.endsWith(".json");
  const isYml = node.name.endsWith(".yml");

  return (
    <button
      onClick={() => onFileClick(node.path)}
      className="w-full flex items-center gap-1.5 py-1 px-2 hover:bg-accent/50 rounded text-sm transition-colors group"
      style={{ paddingLeft: `${depth * 16 + 8 + 14}px` }}
    >
      <File
        className={`w-3.5 h-3.5 shrink-0 ${
          isMd
            ? "text-cyan"
            : isJson
            ? "text-amber"
            : isYml
            ? "text-violet"
            : "text-muted-foreground"
        }`}
      />
      <span className="text-sm truncate text-muted-foreground group-hover:text-foreground transition-colors">
        {node.name}
      </span>
    </button>
  );
}

export function KBBrowser({ onFileClick }: KBBrowserProps) {
  const [tree, setTree] = useState<KBFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchTree = () => {
    setLoading(true);
    fetch("/api/kb/tree")
      .then((res) => res.json())
      .then((data) => setTree(data as KBFile[]))
      .catch(() => setTree([]))
      .finally(() => setLoading(false));
  };

  const triggerRescan = async () => {
    setScanning(true);
    try {
      await fetch("/api/scan/start", { method: "POST" });
    } catch {
      // ignore
    } finally {
      setTimeout(() => setScanning(false), 2000);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <div className="px-3 py-2 mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Knowledge Base
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={triggerRescan}
              className="text-muted-foreground hover:text-cyan transition-colors"
              title="Re-scan repositories"
              disabled={scanning}
            >
              <Zap className={`w-3 h-3 ${scanning ? "text-cyan animate-pulse" : ""}`} />
            </button>
            <button
              onClick={fetchTree}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh tree"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        {loading && tree.length === 0 && (
          <div className="px-3 py-4 text-xs text-muted-foreground">Loading...</div>
        )}
        {!loading && tree.length === 0 && (
          <div className="px-3 py-4 text-xs text-muted-foreground">
            No knowledge base files yet. Run a scan to populate.
          </div>
        )}
        {tree.map((node) => (
          <FileNode
            key={node.path}
            node={node}
            depth={0}
            onFileClick={onFileClick}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
