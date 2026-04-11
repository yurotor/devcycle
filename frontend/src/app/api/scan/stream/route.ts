// GET /api/scan/stream
//
// Server-Sent Events endpoint. Starts a repo scan and streams ScanEvents
// to the client in real time. Closes the stream when the scan finishes.

import { db } from "@/lib/db";
import { workspace } from "@/lib/db/schema";
import { ScanEngine, type ScanEvent, type DoneEvent } from "@/lib/scan/engine";

export const dynamic = "force-dynamic";
// Long-running SSE — disable the default 30s timeout on Vercel / serverless
export const maxDuration = 300;

export async function GET() {
  // Load workspace
  const [ws] = await db.select().from(workspace).limit(1);
  if (!ws) {
    return Response.json({ error: "Workspace not configured" }, { status: 404 });
  }

  // Build a ReadableStream that runs the scan and pushes events
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const emit = (event: ScanEvent | DoneEvent) => {
        try {
          controller.enqueue(encoder.encode(sseMessage(event)));
        } catch {
          // Client disconnected
        }
      };

      const engine = new ScanEngine(ws.id, emit);

      try {
        await engine.run();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emit({ repo: "system", message: `Scan failed: ${msg}`, type: "warning" });
        emit({ type: "done", summary: { repos: 0, findings: 0 } });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}

// ─── Helpers ──────────────────────────────────────────────────────

function sseMessage(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
}
