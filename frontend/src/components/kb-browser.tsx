"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
} from "lucide-react";
import { FAKE_KB_TREE, type KBFile } from "@/lib/fake-data";

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
  const [expanded, setExpanded] = useState(depth < 2);

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
          <span className="text-xs truncate">{node.name}</span>
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
      <span className="text-xs truncate text-muted-foreground group-hover:text-foreground transition-colors">
        {node.name}
      </span>
    </button>
  );
}

export function KBBrowser({ onFileClick }: KBBrowserProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <div className="px-3 py-2 mb-1">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Knowledge Base
          </span>
        </div>
        {FAKE_KB_TREE.map((node) => (
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
