"use client";

import { useState, useEffect, type ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MarkdownViewerProps {
  path: string;
  onNavigate?: (path: string) => void;
  wsId?: number | null;
}

/** Resolve a relative link against the current file's directory. */
function resolveLink(href: string, currentPath: string): string | null {
  if (href.startsWith("http://") || href.startsWith("https://")) return null; // external
  const currentDir = currentPath.split("/").slice(0, -1);
  const parts = href.split("/");
  const resolved = [...currentDir];
  for (const p of parts) {
    if (p === "..") resolved.pop();
    else if (p !== ".") resolved.push(p);
  }
  return resolved.join("/");
}

/** Render inline markdown: **bold**, `code`, [links](path), and plain text. */
function renderInline(
  text: string,
  onNavigate: ((path: string) => void) | undefined,
  currentPath: string
): ReactNode[] {
  // Split on bold, code, and markdown links
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-foreground font-medium">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="text-xs px-1 py-0.5 rounded bg-secondary font-mono text-cyan"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const [, linkText, href] = linkMatch;
      const resolved = resolveLink(href, currentPath);
      if (resolved && onNavigate) {
        return (
          <button
            key={i}
            onClick={() => onNavigate(resolved)}
            className="text-cyan hover:text-cyan/80 underline underline-offset-2 decoration-cyan/40 hover:decoration-cyan/70 transition-colors"
          >
            {linkText}
          </button>
        );
      }
      // External link or no navigate handler
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan hover:text-cyan/80 underline underline-offset-2"
        >
          {linkText}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function MarkdownViewer({ path, onNavigate, wsId }: MarkdownViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setContent(null);
    setError(false);

    fetch(`/api/kb/file?path=${encodeURIComponent(path)}${wsId ? `&wsId=${wsId}` : ""}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.text();
      })
      .then(setContent)
      .catch(() => setError(true));
  }, [path, wsId]);

  if (content === null && !error) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const text = error
    ? `# ${path.split("/").pop()}\n\n*This file has not been generated yet. Run a scan to populate the knowledge base.*`
    : content!;

  const lines = text.split("\n");
  const inline = (t: string) => renderInline(t, onNavigate, path);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-4xl mx-auto">
        <div className="space-y-0">
          {lines.map((line, i) => {
            if (line.startsWith("# ")) {
              return (
                <h1 key={i} className="text-2xl font-bold mt-0 mb-4 text-foreground">
                  {inline(line.slice(2))}
                </h1>
              );
            }
            if (line.startsWith("## ")) {
              return (
                <h2 key={i} className="text-lg font-semibold mt-6 mb-2 text-foreground border-b border-border pb-1">
                  {inline(line.slice(3))}
                </h2>
              );
            }
            if (line.startsWith("### ")) {
              return (
                <h3 key={i} className="text-base font-semibold mt-4 mb-1.5 text-foreground">
                  {inline(line.slice(4))}
                </h3>
              );
            }
            if (line.startsWith("> ")) {
              return (
                <blockquote key={i} className="border-l-2 border-cyan/40 pl-3 py-0.5 text-sm text-muted-foreground italic my-2">
                  {inline(line.slice(2))}
                </blockquote>
              );
            }
            if (line.startsWith("```")) {
              return (
                <div key={i} className="text-xs font-mono text-cyan/70 my-1">
                  {line}
                </div>
              );
            }
            if (line.startsWith("| ")) {
              const cells = line.split("|").filter(Boolean);
              const isHeader = lines[i + 1]?.includes("---");
              const isSeparator = line.includes("---");
              if (isSeparator) return <div key={i} />;
              return (
                <div
                  key={i}
                  className={`flex text-sm ${
                    isHeader
                      ? "font-medium text-foreground border-b border-border pb-1 mb-1"
                      : "text-muted-foreground"
                  }`}
                >
                  {cells.map((cell, j) => (
                    <div key={j} className="flex-1 py-0.5 px-1">
                      {inline(cell.trim())}
                    </div>
                  ))}
                </div>
              );
            }
            if (line.startsWith("- ")) {
              return (
                <div key={i} className="text-sm text-muted-foreground ml-3 py-0.5 flex items-start gap-1.5">
                  <span className="text-cyan mt-0.5 shrink-0">·</span>
                  <span>{inline(line.slice(2))}</span>
                </div>
              );
            }
            if (line.match(/^\d+\./)) {
              return (
                <div key={i} className="text-sm text-muted-foreground ml-3 py-0.5">
                  {inline(line)}
                </div>
              );
            }
            if (line.trim() === "") {
              return <div key={i} className="h-2" />;
            }
            return (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed my-1">
                {inline(line)}
              </p>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
