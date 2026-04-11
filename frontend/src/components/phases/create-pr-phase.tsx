"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  GitPullRequest,
  Loader2,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { type Ticket } from "@/lib/fake-data";

interface PRResult {
  number: number;
  url: string;
  title: string;
}

interface CreatePRPhaseProps {
  ticket: Ticket;
  onComplete: () => void;
}

export function CreatePRPhase({ ticket, onComplete }: CreatePRPhaseProps) {
  const [pr, setPr] = useState<PRResult | null>(null);
  const [creating, setCreating] = useState(false);

  const createPR = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/pr`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.pr) setPr(data.pr);
    } finally {
      setCreating(false);
    }
  };

  if (!pr && !creating) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-sky/10 border border-sky/20 flex items-center justify-center mx-auto">
            <GitPullRequest className="w-5 h-5 text-sky" />
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-sm">Create Pull Request</h3>
            <p className="text-xs text-muted-foreground">
              Create a PR in Azure DevOps with all implemented task branches.
            </p>
          </div>
          <Button
            className="bg-sky text-background hover:bg-sky/90 text-xs h-9"
            onClick={createPR}
          >
            <GitPullRequest className="w-3.5 h-3.5 mr-1.5" />
            Create PR
          </Button>
        </div>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-sky mb-3" />
        <p className="text-xs text-muted-foreground">Creating pull request...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-8">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-12 h-12 rounded-xl bg-sky/10 border border-sky/20 flex items-center justify-center mx-auto">
          <GitPullRequest className="w-5 h-5 text-sky" />
        </div>
        <div className="space-y-1">
          <h3 className="font-medium text-sm">PR #{pr!.number} Created</h3>
          <p className="text-xs text-muted-foreground">{pr!.title}</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <a
            href={pr!.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-sky hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            {pr!.url}
          </a>
          <Button
            size="sm"
            className="h-8 text-xs bg-sky text-background hover:bg-sky/90 gap-1 mt-2"
            onClick={onComplete}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Proceed to Review
          </Button>
        </div>
      </div>
    </div>
  );
}
