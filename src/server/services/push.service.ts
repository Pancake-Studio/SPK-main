import "server-only";

import webpush from "web-push";
import { db } from "@/lib/db";

let vapidReady = false;

function ensureVapid(): boolean {
  if (vapidReady) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@suntisuk.ac.th",
    publicKey,
    privateKey,
  );
  vapidReady = true;
  return true;
}

export function isPushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

type BrowserSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function saveSubscription(
  userId: string,
  sub: BrowserSubscription,
  userAgent?: string,
) {
  await db.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent,
    },
    update: {
      userId,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent,
    },
  });
}

export async function removeSubscription(endpoint: string) {
  await db.pushSubscription.deleteMany({ where: { endpoint } });
}

export function countUserSubscriptions(userId: string) {
  return db.pushSubscription.count({ where: { userId } });
}

export type PushPayload = {
  title: string;
  message: string;
  url?: string;
  tag?: string;
};

export type PushResult = {
  total: number;
  sent: number;
  failed: number;
  configured: boolean;
};

/** Send an OS-level push to every device the user has registered. */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<PushResult> {
  if (!ensureVapid()) {
    console.error("[push] VAPID keys not configured — skipping send");
    return { total: 0, sent: 0, failed: 0, configured: false };
  }
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return { total: 0, sent: 0, failed: 0, configured: true };

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        const e = err as { statusCode?: number; body?: string } | undefined;
        const code = e?.statusCode;
        // Subscription gone/expired — prune it.
        if (code === 404 || code === 410) {
          await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        } else {
          // Other errors (e.g. 401/403 VAPID mismatch, 400) — log so they're visible.
          console.error(
            `[push] send failed status=${code ?? "?"} user=${userId} body=${e?.body ?? ""}`,
          );
        }
      }
    }),
  );

  return { total: subs.length, sent, failed, configured: true };
}
