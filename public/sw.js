/* School Productivity Kits service worker — install + Web Push + click handling */
/* sw-version: 5 — no clients.claim(), explicit RSC pass-through */

self.addEventListener("install", (event) => {
  // Activate this SW as soon as it installs, so updates land on the next load.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // IMPORTANT: do NOT call self.clients.claim() here.
  // Claiming takes control of pages that were ALREADY open and uncontrolled.
  // Doing that mid-session — while Next.js's App Router is still hydrating and
  // booting — changes the page's SW controller in-flight, which intermittently
  // left the very first page load non-interactive (clicks/links dead) until a
  // manual refresh, and produced "Failed to fetch RSC payload / Load failed".
  // Web Push does NOT need the SW to control open pages (it's tied to the
  // registration + subscription), so we simply let the SW control each page
  // from its *next* load onward. No mid-session takeover = no first-load lockup.
});

// Pass-through fetch handler — we deliberately do NOT cache or intercept
// anything. It exists only so the app stays PWA-installable; every request
// falls through to the network (we never call event.respondWith()).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Never touch page navigations or Next.js RSC/build chunks — let the browser
  // and Next.js router handle them untouched (avoids navigation/hydration bugs).
  if (req.mode === "navigate") return;
  const url = new URL(req.url);
  if (url.pathname.startsWith("/_next") || url.pathname === "/__webpack_hmr") {
    return;
  }
  // Also skip React Server Component fetches explicitly; Next.js uses headers
  // like `RSC: 1` and `Accept: text/x-component` for soft navigations.
  const isRSC =
    req.headers.get("RSC") === "1" ||
    req.headers.get("Accept")?.includes("text/x-component") === true;
  if (isRSC) return;
  // Everything else also falls through to the network automatically.
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
      title: "School Productivity Kits",
      message: event.data ? event.data.text() : "New notification",
    };
  }

  const title = payload.title || "School Productivity Kits";
  const options = {
    body: payload.message || "",
    icon: payload.icon || "/icon-192-ro.png",
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
        return self.registration.showNotification("School Productivity Kits", {
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
