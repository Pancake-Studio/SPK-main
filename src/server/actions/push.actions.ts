"use server";

import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import {
  saveSubscription,
  removeSubscription,
  sendPushToUser,
  countUserSubscriptions,
  isPushConfigured,
} from "@/server/services/push.service";

type BrowserSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function subscribePushAction(sub: BrowserSubscription) {
  const user = await requireUser();
  console.log("[push-action] subscribePushAction called for user:", user.id);
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    console.error("[push-action] subscription keys missing:", {
      endpoint: Boolean(sub?.endpoint),
      p256dh: Boolean(sub?.keys?.p256dh),
      auth: Boolean(sub?.keys?.auth),
    });
    return { ok: false };
  }
  try {
    const h = await headers();
    console.log("[push-action] saving subscription to db...");
    await saveSubscription(user.id, sub, h.get("user-agent")?.slice(0, 255) ?? undefined);
    console.log("[push-action] subscription saved");
    return { ok: true };
  } catch (e) {
    console.error("[push-action] error saving subscription:", e instanceof Error ? e.message : String(e));
    throw e;
  }
}

export async function unsubscribePushAction(endpoint: string) {
  await requireUser();
  if (endpoint) await removeSubscription(endpoint);
  return { ok: true };
}

/** Send a test push to the current user — deterministic device-push check. */
export async function sendTestPushAction() {
  const user = await requireUser();
  const result = await sendPushToUser(user.id, {
    title: "ทดสอบการแจ้งเตือน",
    message: "ถ้าเห็นข้อความนี้ แสดงว่าการแจ้งเตือนบนอุปกรณ์ใช้งานได้ ✅",
    url: "/dashboard",
    tag: "test",
  });
  return { ok: result.sent > 0, ...result };
}

/** Status for the Settings notifications card. */
export async function getPushStatusAction() {
  const user = await requireUser();
  return {
    configured: isPushConfigured(),
    subscriptions: await countUserSubscriptions(user.id),
  };
}
