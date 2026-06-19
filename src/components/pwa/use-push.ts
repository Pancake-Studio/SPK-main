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

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(VAPID_PUBLIC);

  React.useEffect(() => {
    if (typeof window !== "undefined") setSecure(window.isSecureContext);
    if (!supported) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, [supported]);

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
    setPermission,
    subscribe,
    ensureSubscribed,
    sendTest,
  };
}
