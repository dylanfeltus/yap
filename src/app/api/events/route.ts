import { subscribe, unsubscribe } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const listener = (channel: string) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ channel })}\n\n`)
          );
        } catch {
          // Connection closed
          cleanup();
        }
      };

      // Keep-alive every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          cleanup();
        }
      }, 30_000);

      function cleanup() {
        unsubscribe(listener);
        clearInterval(keepAlive);
      }

      subscribe(listener);

      // Handle stream cancellation
      // The cancel callback is invoked when the client disconnects
    },
    cancel() {
      // ReadableStream cancel is called on disconnect — cleanup happens via
      // the try/catch in listener and keepAlive above
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
