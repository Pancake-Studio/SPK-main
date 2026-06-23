import { Suspense } from "react";
import { NotificationBell } from "./notification-bell";
import { getNotifications, getUnreadCount } from "@/server/services/notification.service";
import type { ClientNotification } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

async function NotificationBellFetcher({ role, userId }: { role: string; userId: string }) {
  const [rows, unread] = await Promise.all([
    getNotifications(userId, { take: 10 }),
    getUnreadCount(userId),
  ]);

  const notifications: ClientNotification[] = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    linkUrl: n.linkUrl,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));

  return <NotificationBell role={role} initialItems={notifications} initialUnread={unread} />;
}

function NotificationBellSkeleton() {
  return (
    <div className="flex h-10 w-10 items-center justify-center">
      <Skeleton className="size-6 rounded-full" />
    </div>
  );
}

export function NotificationBellLoader({ role, userId }: { role: string; userId: string }) {
  return (
    <Suspense fallback={<NotificationBellSkeleton />}>
      <NotificationBellFetcher role={role} userId={userId} />
    </Suspense>
  );
}
