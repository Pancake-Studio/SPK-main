import { requireStudent } from "@/lib/auth";
import { NotificationsView } from "@/components/notifications/notifications-view";

export const metadata = { title: "การแจ้งเตือน" };

export default async function StudentNotificationsPage() {
  const user = await requireStudent();
  return <NotificationsView userId={user.id} />;
}
