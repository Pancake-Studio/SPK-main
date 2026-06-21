"use client";

import * as React from "react";
import {
  subscribePushAction,
  sendTestPushAction,
} from "@/server/actions/push.actions";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  if (!base64String) throw new Error("VAPID public key is missing");
  try {
    const normalized = base64String.trim().replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    const base64 = normalized + padding;
    console.log("[push] VAPID key conversion: input length", base64String.length, "normalized", normalized.length, "with padding", base64.length);
    const raw = atob(base64);
    console.log("[push] after atob: raw length", raw.length);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    console.log("[push] Uint8Array length:", out.byteLength, "first 4 bytes:", Array.from(out.slice(0, 4)));
    if (out.byteLength !== 65) {
      throw new Error(`VAPID public key must decode to 65 bytes for P-256, got ${out.byteLength}`);
    }
    return out;
  } catch (e) {
    console.error("[push] VAPID key conversion error:", e instanceof Error ? e.message : String(e));
    throw e;
  }
}

/** True if an existing PushSubscription was created with `appKey` (same VAPID key). */
function subscriptionMatchesKey(
  sub: PushSubscription,
  appKey: Uint8Array,
): boolean {
  const existing = sub.options?.applicationServerKey;
  // Older browsers don't expose options.applicationServerKey — assume a match
  // rather than churn the subscription on every load.
  if (!existing) return true;
  const a = new Uint8Array(existing);
  if (a.byteLength !== appKey.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== appKey[i]) return false;
  }
  return true;
}

export type SubscribeResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unsupported" | "insecure" | "denied" | "default" | "invalid-key" | "push-service-error" | "error";
      error?: string;
    };

/** Shared Web Push logic: permission state + subscribe + self-test. */
export function usePush() {
  const [permission, setPermission] = React.useState<
    NotificationPermission | "unsupported"
  >("default");
  const [secure, setSecure] = React.useState(true);
  // iOS exposes Web Push ONLY inside an installed (home-screen) PWA. In a Safari
  // tab the Notification/PushManager APIs don't exist, so we can never prompt —
  // detect that case to tell the user to "Add to Home Screen" first.
  const [iosNeedsInstall, setIosNeedsInstall] = React.useState(false);
  const [isBrave, setIsBrave] = React.useState(false);
  // Gate all capability checks behind mount: the real values depend on `window`,
  // so computing them during render would differ between SSR and the first client
  // render → hydration mismatch (e.g. button `disabled`). Stay neutral until mounted.
  const [mounted, setMounted] = React.useState(false);

  const rawSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(VAPID_PUBLIC);

  const supported = mounted && rawSupported;

  React.useEffect(() => {
    setMounted(true);
    setSecure(window.isSecureContext);
    const ua = navigator.userAgent;
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) ||
      // iPadOS 13+ reports as desktop Safari but is touch-capable.
      (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIosNeedsInstall(isIOS && !standalone && !rawSupported);
    setPermission(rawSupported ? Notification.permission : "unsupported");

    // Brave reports itself via navigator.brave; fallback to UA sniff.
    const brave = (navigator as Navigator & { brave?: { isBrave?: () => Promise<boolean> } }).brave;
    if (brave?.isBrave) {
      brave.isBrave().then((v) => setIsBrave(Boolean(v)));
    } else {
      setIsBrave(/Brave/i.test(ua));
    }
  }, [rawSupported]);

  const ensureSubscribed = React.useCallback(async () => {
    if (!VAPID_PUBLIC) {
      console.error("[push] VAPID_PUBLIC not set");
      throw new Error("VAPID public key is not configured");
    }
    console.log("[push] ensuring subscribed, VAPID key length:", VAPID_PUBLIC.length);
    
    // Check if service worker is available
    if (!navigator.serviceWorker.controller) {
      console.warn("[push] no service worker controller yet, waiting...");
    }
    
    const reg = await navigator.serviceWorker.ready;
    console.log("[push] service worker ready, registration:", reg.scope);
    console.log("[push] SW active:", reg.active ? "YES" : "NO");
    console.log("[push] SW installing:", reg.installing ? "YES" : "NO");
    console.log("[push] SW waiting:", reg.waiting ? "YES" : "NO");
    
    const appKey = urlBase64ToUint8Array(VAPID_PUBLIC);

    let sub = await reg.pushManager.getSubscription();
    console.log("[push] existing subscription:", sub ? "found" : "none");
    if (sub && !subscriptionMatchesKey(sub, appKey)) {
      // The browser is holding a subscription created with a *different* VAPID
      // key (e.g. server keys were rotated). The push service will reject sends
      // to it with 403, so unsubscribe and create a fresh one with the current key.
      console.warn("[push] existing subscription uses a stale VAPID key — re-subscribing");
      try {
        await sub.unsubscribe();
      } catch (e) {
        console.warn("[push] failed to unsubscribe stale subscription:", e);
      }
      sub = null;
    }
    if (!sub) {
      console.log("[push] creating new subscription...");
      console.log("[push] decoded app key to", appKey.byteLength, "bytes");
      try {
        console.log("[push] calling pushManager.subscribe with userVisibleOnly=true");
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appKey,
        });
        console.log("[push] subscription created", { endpoint: sub.endpoint?.slice(0, 50) });
      } catch (subscribeError) {
        console.error("[push] pushManager.subscribe failed:", subscribeError instanceof Error ? subscribeError.message : String(subscribeError));
        console.error("[push] error details:", subscribeError);
        // Additional debugging
        if (reg.active) {
          console.error("[push] service worker IS active but subscribe failed - likely a push service backend issue");
        } else {
          console.error("[push] service worker NOT active - this is the problem!");
        }
        throw subscribeError;
      }
    }
    const json = sub.toJSON() as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    console.log("[push] subscription JSON keys:", Object.keys(json));
    if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
      console.log("[push] calling subscribePushAction...");
      await subscribePushAction({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      console.log("[push] server subscribe completed");
    } else {
      console.error("[push] subscription keys missing:", {
        endpoint: Boolean(json.endpoint),
        p256dh: Boolean(json.keys?.p256dh),
        auth: Boolean(json.keys?.auth),
      });
      throw new Error("Subscription keys missing from PushManager");
    }
  }, []);

  const subscribe = React.useCallback(async (): Promise<SubscribeResult> => {
    if (!supported) {
      console.log("[push] not supported");
      return { ok: false, reason: "unsupported" };
    }
    if (!secure) {
      console.log("[push] not secure context");
      return { ok: false, reason: "insecure" };
    }
    try {
      let p = Notification.permission;
      console.log("[push] current permission:", p);
      if (p !== "granted") {
        console.log("[push] requesting permission...");
        p = await Notification.requestPermission();
        console.log("[push] permission result:", p);
        setPermission(p);
      }
      if (p !== "granted") {
        console.log("[push] permission not granted, reason:", p);
        return { ok: false, reason: p === "denied" ? "denied" : "default" };
      }
      console.log("[push] calling ensureSubscribed...");
      await ensureSubscribed();
      console.log("[push] subscribe success");
      return { ok: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const isPushServiceError =
        /push service error/i.test(message) ||
        (e instanceof DOMException && e.name === "AbortError" && /Registration failed/i.test(message));
      if (isPushServiceError) {
        console.warn("[push] subscribe blocked by browser/push service:", message);
      } else {
        console.error("[push] subscribe error:", message, e);
      }
      return {
        ok: false,
        reason:
          message.includes("VAPID") || message.includes("public key")
            ? "invalid-key"
            : isPushServiceError
              ? "push-service-error"
              : "error",
        error: message,
      };
    }
  }, [supported, secure, ensureSubscribed]);

  const sendTest = React.useCallback(() => sendTestPushAction(), []);

  return {
    permission,
    supported,
    secure,
    iosNeedsInstall,
    isBrave,
    setPermission,
    subscribe,
    ensureSubscribed,
    sendTest,
  };
}
