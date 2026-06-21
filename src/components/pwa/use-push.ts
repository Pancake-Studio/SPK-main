"use client";

import * as React from "react";
import {
  subscribePushAction,
  sendTestPushAction,
} from "@/server/actions/push.actions";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export type SubscribeResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "insecure" | "denied" | "default" | "error"; error?: string };

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
  }, [rawSupported]);

  const ensureSubscribed = React.useCallback(async () => {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC!),
      });
    }
    const json = sub.toJSON() as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
      await subscribePushAction({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
    }
  }, []);

  const subscribe = React.useCallback(async (): Promise<SubscribeResult> => {
    if (!supported) return { ok: false, reason: "unsupported" };
    if (!secure) return { ok: false, reason: "insecure" };
    try {
      let p = Notification.permission;
      if (p !== "granted") {
        p = await Notification.requestPermission();
        setPermission(p);
      }
      if (p !== "granted") {
        return { ok: false, reason: p === "denied" ? "denied" : "default" };
      }
      await ensureSubscribed();
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        reason: "error",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [supported, secure, ensureSubscribed]);

  const sendTest = React.useCallback(() => sendTestPushAction(), []);

  return {
    permission,
    supported,
    secure,
    iosNeedsInstall,
    setPermission,
    subscribe,
    ensureSubscribed,
    sendTest,
  };
}
