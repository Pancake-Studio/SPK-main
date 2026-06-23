import "server-only";

import { after } from "next/server";
import { db } from "@/lib/db";
import { publishToUser } from "@/server/realtime";
import { sendPushToUser } from "./push.service";
import type { NotificationType } from "@/lib/constants";

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string | null;
};

/** Persist a notification and push it to the user in real time. */
export async function createNotification(input: CreateNotificationInput) {
  const n = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      linkUrl: input.linkUrl ?? null,
    },
  });

  // In-page realtime (SSE) for any open tab.
  publishToUser(input.userId, {
    type: "notification",
    payload: {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      linkUrl: n.linkUrl,
      createdAt: n.createdAt.toISOString(),
    },
  });

  // OS-level push to registered devices — runs reliably after the response.
  after(async () => {
    await sendPushToUser(input.userId, {
      title: n.title,
      message: n.message,
      url: n.linkUrl ?? "/dashboard",
      tag: n.type,
    });
  });

  return n;
}

/** Fan-out the same notification to many users (e.g. a whole class/school).
 *
 *  SQLite serializes writes, so firing N individual `create()` calls in parallel
 *  (the old `Promise.all` approach) exhausts the connection pool on large
 *  fan-outs and times out (P1008 "Socket timeout"). Instead we do a SINGLE bulk
 *  insert, then publish realtime + schedule push from the returned rows. */
export async function notifyUsers(
  userIds: string[],
  payload: Omit<CreateNotificationInput, "userId">,
) {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return;

  const linkUrl = payload.linkUrl ?? null;
  const created = await db.notification.createManyAndReturn({
    data: unique.map((userId) => ({
      userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      linkUrl,
    })),
  });

  // In-page realtime (SSE) — in-memory, cheap.
  for (const n of created) {
    publishToUser(n.userId, {
      type: "notification",
      payload: {
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        linkUrl: n.linkUrl,
        createdAt: n.createdAt.toISOString(),
      },
    });
  }

  // OS-level push after the response — sequential to avoid a thundering herd.
  after(async () => {
    for (const userId of unique) {
      await sendPushToUser(userId, {
        title: payload.title,
        message: payload.message,
        url: linkUrl ?? "/dashboard",
        tag: payload.type,
      });
    }
  });
}

export async function getNotifications(
  userId: string,
  opts: { unreadOnly?: boolean; take?: number; skip?: number } = {},
) {
  return db.notification.findMany({
    where: { userId, ...(opts.unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 30,
    skip: opts.skip ?? 0,
  });
}

/** A page of notifications plus whether more remain — for infinite scroll.
 *  We over-fetch by one row to detect `hasMore` without a second count query. */
export async function getNotificationsPage(
  userId: string,
  opts: { skip: number; take: number },
) {
  const rows = await getNotifications(userId, {
    skip: opts.skip,
    take: opts.take + 1,
  });
  const hasMore = rows.length > opts.take;
  return { rows: hasMore ? rows.slice(0, opts.take) : rows, hasMore };
}

export function getUnreadCount(userId: string) {
  return db.notification.count({ where: { userId, isRead: false } });
}

export async function markRead(userId: string, id: string) {
  await db.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });
}

export async function markAllRead(userId: string) {
  await db.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
