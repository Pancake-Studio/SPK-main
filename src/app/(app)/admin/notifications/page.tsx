import { requireAdmin } from "@/lib/auth";
import { NotificationsView } from "@/components/notifications/notifications-view";

export const metadata = { title: "การแจ้งเตือน" };

export default async function AdminNotificationsPage() {
  const user = await requireAdmin();
  return <NotificationsView userId={user.id} />;
}
