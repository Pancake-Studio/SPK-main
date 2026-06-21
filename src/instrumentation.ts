/**
 * Next.js instrumentation hook — runs once when a server process boots.
 *
 * The Node-only setup lives in ./instrumentation-node and is imported *only*
 * in the nodejs runtime. Keeping `node:*` imports out of this file stops the
 * Edge runtime build (used by middleware) from trying — and failing — to bundle
 * them.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
