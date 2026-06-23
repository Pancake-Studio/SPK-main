import { PageHeader } from "@/components/page-header";
import { NotificationFeed } from "./notification-feed";
import { getNotificationsPage } from "@/server/services/notification.service";
import { NOTIFICATIONS_PAGE_SIZE } from "@/lib/constants";
import type { ClientNotification } from "@/lib/types";

/** Full-page notifications list, shared by all roles. Loads the first page
 *  server-side; the feed fetches further pages on scroll. */
export async function NotificationsView({ userId }: { userId: string }) {
  const { rows, hasMore } = await getNotificationsPage(userId, {
    skip: 0,
    take: NOTIFICATIONS_PAGE_SIZE,
  });
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
      <NotificationFeed initialItems={items} initialHasMore={hasMore} />
    </div>
  );
}
