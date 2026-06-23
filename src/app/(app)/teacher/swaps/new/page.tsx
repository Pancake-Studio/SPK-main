import { requireTeacherProfile } from "@/lib/auth";
import {
  getTeacherSchedule,
  getTeachersWithSchedules,
} from "@/server/services/schedule.service";
import { getDefaultSchedule } from "@/server/services/bell-schedule.service";
import { PageHeader } from "@/components/page-header";
import { SwapWizard } from "@/components/swap/swap-wizard";

export const metadata = { title: "ขอแลกคาบสอน" };

export default async function NewSwapPage() {
  const { teacher } = await requireTeacherProfile();
  const [slots, others, bell] = await Promise.all([
    getTeacherSchedule(teacher.id),
    getTeachersWithSchedules(teacher.id),
    getDefaultSchedule(),
  ]);

  return (
    <div>
      <PageHeader
        title="ขอแลกคาบสอน"
        description="ทำทีละขั้นตอน — เลือกคาบของคุณ → เลือกครู → เลือกคาบของครู → ยืนยัน"
      />
      <SwapWizard mySlots={slots} teachers={others} bellSlots={bell.slots} />
    </div>
  );
}
