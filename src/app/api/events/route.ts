import { subscribe, unsubscribe } from "@/lib/events";

export const dynamic = "force-dynamic";

// Note: The event emitter is in-process, so events emitted from the MCP server
// (which runs as a separate process via `npm run mcp`) won't reach SSE clients.
// For cross-process support, swap the emitter for a DB-poll or Redis pub/sub approach.

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
