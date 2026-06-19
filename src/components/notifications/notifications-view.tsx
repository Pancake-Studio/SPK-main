import { PageHeader } from "@/components/page-header";
import { NotificationFeed } from "./notification-feed";
import { getNotifications } from "@/server/services/notification.service";
import type { ClientNotification } from "@/lib/types";

/** Full-page notifications list, shared by all roles. */
export async function NotificationsView({ userId }: { userId: string }) {
  const rows = await getNotifications(userId, { take: 60 });
  const items: ClientNotification[] = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    linkUrl: n.linkUrl,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader title="การแจ้งเตือน" description="ข่าวสารและการอัปเดตทั้งหมดของคุณ" />
      <NotificationFeed items={items} />
    </div>
  );
}
