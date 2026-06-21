"use client";

import { useEffect } from "react";

/** Registers the service worker app-wide (enables install + push). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((reg) => {
          console.log("[sw] registered, scope:", reg.scope);
          // Force an update check immediately — useful in dev and after deploys
          reg.update().catch(() => {});
          // Listen for new versions
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "activated") {
                  console.log("[sw] updated to new version and activated");
                }
              });
            }
          });
        })
        .catch((err) => {
          console.error("[sw] registration failed:", err);
        });
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
