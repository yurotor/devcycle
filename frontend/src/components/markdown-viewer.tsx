"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MarkdownViewerProps {
  path: string;
}

export function MarkdownViewer({ path }: MarkdownViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setContent(null);
    setError(false);

    fetch(`/api/kb/file?path=${encodeURIComponent(path)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.text();
      })
      .then(setContent)
      .catch(() => setError(true));
  }, [path]);

  if (content === null && !error) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const text = error
    ? `# ${path.split("/").pop()}\n\n*This file has not been generated yet. Run a scan to populate the knowledge base.*`
    : content!;

  const lines = text.split("\n");

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="space-y-0">
          {lines.map((line, i) => {
            if (line.startsWith("# ")) {
              return (
                <h1
                  key={i}
                  className="text-xl font-bold mt-0 mb-4 text-foreground"
                >
                  {line.replace("# ", "")}
                </h1>
              );
            }
            if (line.startsWith("## ")) {
              return (
                <h2
                  key={i}
                  className="text-sm font-semibold mt-6 mb-2 text-foreground border-b border-border pb-1"
                >
                  {line.replace("## ", "")}
                </h2>
              );
            }
            if (line.startsWith("### ")) {
              return (
                <h3
                  key={i}
                  className="text-xs font-semibold mt-4 mb-1.5 text-foreground"
                >
                  {line.replace("### ", "")}
                </h3>
              );
            }
            if (line.startsWith("> ")) {
              return (
                <blockquote
                  key={i}
                  className="border-l-2 border-cyan/40 pl-3 py-0.5 text-xs text-muted-foreground italic my-2"
                >
                  {line.replace("> ", "")}
                </blockquote>
              );
            }
            if (line.startsWith("```")) {
              return (
                <div
                  key={i}
                  className="text-[10px] font-mono text-cyan/70 my-1"
                >
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
                  className={`flex text-xs ${
                    isHeader
                      ? "font-medium text-foreground border-b border-border pb-1 mb-1"
                      : "text-muted-foreground"
                  }`}
                >
                  {cells.map((cell, j) => (
                    <div key={j} className="flex-1 py-0.5 px-1">
                      {cell.trim()}
                    </div>
                  ))}
                </div>
              );
            }
            if (line.startsWith("- ")) {
              const item = line.replace("- ", "");
              return (
                <div
                  key={i}
                  className="text-xs text-muted-foreground ml-3 py-0.5 flex items-start gap-1.5"
                >
                  <span className="text-cyan mt-0.5 shrink-0">·</span>
                  <span>
                    {item.split(/(\*\*.*?\*\*|\`.*?\`)/).map((part, pi) => {
                      if (part.startsWith("**") && part.endsWith("**")) {
                        return (
                          <strong key={pi} className="text-foreground font-medium">
                            {part.slice(2, -2)}
                          </strong>
                        );
                      }
                      if (part.startsWith("`") && part.endsWith("`")) {
                        return (
                          <code
                            key={pi}
                            className="text-[10px] px-1 py-0.5 rounded bg-secondary font-mono text-cyan"
                          >
                            {part.slice(1, -1)}
                          </code>
                        );
                      }
                      return <span key={pi}>{part}</span>;
                    })}
                  </span>
                </div>
              );
            }
            if (line.match(/^\d+\./)) {
              return (
                <div
                  key={i}
                  className="text-xs text-muted-foreground ml-3 py-0.5"
                >
                  {line.split(/(\*\*.*?\*\*)/).map((part, pi) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <strong key={pi} className="text-foreground font-medium">
                        {part.slice(2, -2)}
                      </strong>
                    ) : (
                      <span key={pi}>{part}</span>
                    )
                  )}
                </div>
              );
            }
            if (line.trim() === "") {
              return <div key={i} className="h-2" />;
            }
            return (
              <p
                key={i}
                className="text-xs text-muted-foreground leading-relaxed my-1"
              >
                {line.split(/(\*\*.*?\*\*|\`.*?\`)/).map((part, pi) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                      <strong key={pi} className="text-foreground font-medium">
                        {part.slice(2, -2)}
                      </strong>
                    );
                  }
                  if (part.startsWith("`") && part.endsWith("`")) {
                    return (
                      <code
                        key={pi}
                        className="text-[10px] px-1 py-0.5 rounded bg-secondary font-mono text-cyan"
                      >
                        {part.slice(1, -1)}
                      </code>
                    );
                  }
                  return <span key={pi}>{part}</span>;
                })}
              </p>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
