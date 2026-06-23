"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { NOTIFICATIONS_PAGE_SIZE } from "@/lib/constants";
import {
  markRead,
  markAllRead,
  getNotificationsPage,
} from "@/server/services/notification.service";
import type { ClientNotification } from "@/lib/types";

/** Load one page of notifications for infinite scroll. */
export async function loadNotificationsAction(
  skip: number,
): Promise<{ items: ClientNotification[]; hasMore: boolean }> {
  const user = await requireUser();
  const { rows, hasMore } = await getNotificationsPage(user.id, {
    skip,
    take: NOTIFICATIONS_PAGE_SIZE,
  });
  return {
    items: rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      linkUrl: n.linkUrl,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
    hasMore,
  };
}

export async function markNotificationReadAction(id: string) {
  const user = await requireUser();
  await markRead(user.id, id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await markAllRead(user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}
