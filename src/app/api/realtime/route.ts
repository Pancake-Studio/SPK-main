import { getCurrentUser } from "@/lib/auth";
import { subscribeToUser, type RealtimeEvent } from "@/server/realtime";

// Long-lived SSE connection — must run on the Node runtime, never cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let teardown: () => void = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: RealtimeEvent) => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`,
            ),
          );
        } catch {
          /* controller already closed */
        }
      };

      // Open the stream promptly with a comment line.
      controller.enqueue(encoder.encode(": connected\n\n"));

      const unsubscribe = subscribeToUser(user.id, send);

      // Heartbeat keeps proxies from dropping the idle connection.
      const ping = setInterval(() => send({ type: "ping", payload: { t: Date.now() } }), 25_000);

      teardown = () => {
        clearInterval(ping);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
    },
    cancel() {
      teardown();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
