/**
 * Node.js-runtime boot setup (imported by instrumentation.ts only in nodejs).
 *
 * WSL2 fix: Node's dual-stack "Happy Eyeballs" connect tries IPv6 first, but
 * WSL2's IPv6 is typically unroutable, so outbound HTTPS to external services
 * (Web Push / WNS / FCM, Google OAuth token + JWKS) hangs with
 * `AggregateError [ETIMEDOUT]` — no HTTP status, just a silent timeout.
 * Forcing IPv4 (and disabling the dual-stack race) makes those calls succeed.
 * Harmless on non-WSL hosts.
 */
import * as dns from "node:dns";
import * as net from "node:net";

dns.setDefaultResultOrder("ipv4first");
// Node 18.18+/19.4+: skip the IPv6/IPv4 connection race entirely.
net.setDefaultAutoSelectFamily?.(false);

console.log("[instrumentation] Node runtime: forcing IPv4 (WSL2 push/OAuth fix)");
