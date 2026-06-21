/* SPK Platform service worker — install + Web Push + click handling. */
/* sw-version: 2 (PNG notification icon/badge — cross-platform render) */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Minimal pass-through fetch handler (required for installability criteria).
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "SPK Platform", message: event.data ? event.data.text() : "" };
  }

  const title = data.title || "SPK Platform";
  const options = {
    body: data.message || "",
    icon: data.icon || "/icon-192.png",
    badge: "/badge.png",
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: data.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/dashboard";

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
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      }),
  );
});
