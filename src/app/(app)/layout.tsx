import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { PushManager } from "@/components/pwa/push-manager";
import {
  getNotifications,
  getUnreadCount,
} from "@/server/services/notification.service";
import type { ClientNotification } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [rows, unread] = await Promise.all([
    getNotifications(user.id, { take: 20 }),
    getUnreadCount(user.id),
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

  return (
    <AppShell
      role={user.role}
      user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl }}
      notifications={notifications}
      unread={unread}
    >
      <PushManager />
      {children}
    </AppShell>
  );
}
