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

    // If a service worker takes control of this page mid-session (e.g. an old
    // SW with clients.claim() activating), reload once so the new controller
    // boots cleanly from the start of navigation. Guarded with sessionStorage to
    // avoid reload loops.
    const onControllerChange = () => {
      if (sessionStorage.getItem("spk-sw-reloaded")) return;
      sessionStorage.setItem("spk-sw-reloaded", "1");
      console.log("[sw] controller changed — reloading once to migrate");
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      window.removeEventListener("load", onLoad);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
