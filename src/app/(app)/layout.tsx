import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { PushManager } from "@/components/pwa/push-manager";
import { NotificationBellLoader } from "@/components/notifications/notification-bell-loader";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <AppShell
      role={user.role}
      user={{ name: user.name, email: user.email, avatarUrl: user.image }}
      bell={<NotificationBellLoader role={user.role} userId={user.id} />}
    >
      <PushManager />
      {children}
    </AppShell>
  );
}
