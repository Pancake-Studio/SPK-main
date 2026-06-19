"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { markRead, markAllRead } from "@/server/services/notification.service";

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
