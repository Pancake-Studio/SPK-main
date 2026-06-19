import { requireTeacher } from "@/lib/auth";
import { NotificationsView } from "@/components/notifications/notifications-view";

export const metadata = { title: "การแจ้งเตือน" };

export default async function TeacherNotificationsPage() {
  const user = await requireTeacher();
  return <NotificationsView userId={user.id} />;
}
