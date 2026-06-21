/* SPK Platform service worker — install + Web Push + click handling */
/* sw-version: 3 — robust push handler + dev-safe fetch passthrough + Android fixes */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch handler. We deliberately do NOT cache anything;
// this SW only exists for Web Push + PWA installability.
// In Next.js dev mode the `_next` chunks must reach the dev server
// unimpeded, so we bail out early for those.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Never intercept Next.js dev/build chunks or the dev-server HMR socket
  if (url.pathname.startsWith("/_next") || url.pathname === "/__webpack_hmr") {
    return;
  }
  // Everything else falls through to the network automatically
  // because we do not call event.respondWith().
});

self.addEventListener("push", (event) => {
  console.log("[sw] push event received");
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
    console.log("[sw] push payload:", payload);
  } catch (parseErr) {
    console.error("[sw] push payload parse error:", parseErr);
    payload = {
      title: "SPK Platform",
      message: event.data ? event.data.text() : "New notification",
    };
  }

  const title = payload.title || "SPK Platform";
  const options = {
    body: payload.message || "",
    icon: payload.icon || "/icon-192.png",
    badge: "/badge.png",
    tag: payload.tag || undefined,
    renotify: Boolean(payload.tag),
    data: { url: payload.url || "/dashboard" },
  };

  console.log("[sw] showing notification:", title, options);

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .catch((err) => {
        console.error("[sw] showNotification failed:", err);
        // Fallback: try with minimal options (no badge/icon that might be invalid)
        return self.registration.showNotification("SPK Platform", {
          body: payload.message || "You have a new notification",
        });
      }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";
  console.log("[sw] notification click, target:", targetUrl);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl).catch(() => {});
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
      .catch((err) => {
        console.error("[sw] notificationclick error:", err);
      }),
  );
});
