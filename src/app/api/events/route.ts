import { NextRequest, NextResponse } from "next/server";
import { emit, subscribe, unsubscribe } from "@/lib/events";

export const dynamic = "force-dynamic";

// POST /api/events — allows cross-process callers (e.g. MCP server) to trigger
// SSE events via HTTP instead of relying on the in-process event emitter.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const channel = body?.channel;
  if (typeof channel !== "string" || !channel) {
    return NextResponse.json({ error: "missing channel" }, { status: 400 });
  }
  emit(channel);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let cleaned = false;

      cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        unsubscribe(listener);
        clearInterval(keepAlive);
      };

      const listener = (channel: string) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ channel })}\n\n`)
          );
        } catch {
          cleanup!();
        }
      };

      // Keep-alive every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          cleanup!();
        }
      }, 30_000);

      subscribe(listener);
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
