import type { NextConfig } from "next";

/**
 * The app is reached through a reverse proxy on a different public domain
 * (https://nallyz-dev.fe-grp.com → http://172.24.45.38:3000). Two cross-origin
 * gates must allow that domain, or things fail *silently*:
 *
 * - `experimental.serverActions.allowedOrigins`: Next rejects Server Action
 *   POSTs whose `Origin` doesn't match the forwarded host. Without this every
 *   action (login, push subscribe, test push, mark-read) is blocked behind the
 *   proxy → the device never registers for push → no notifications.
 * - `allowedDevOrigins`: lets the proxied origin load dev/HMR/_next resources.
 *
 * Add any other host you serve the app from (LAN IP, localhost).
 */
const ORIGINS = [
  "nallyz-dev.fe-grp.com",
  "172.24.45.38:3000",
  "localhost:3000",
];

/**
 * PWA is wired manually (no next-pwa): static SW at `public/sw.js`, registered by
 * `<ServiceWorkerRegister>`, manifest from `app/manifest.ts`. next-pwa was removed
 * because it injects a webpack config incompatible with Next 16 Turbopack (build
 * fails with WorkerError) and would overwrite the hand-written public/sw.js.
 */
const nextConfig: NextConfig = {
  allowedDevOrigins: ["nallyz-dev.fe-grp.com", "172.24.45.38"],
  experimental: {
    serverActions: {
      allowedOrigins: ORIGINS,
    },
  },
};

export default nextConfig;
