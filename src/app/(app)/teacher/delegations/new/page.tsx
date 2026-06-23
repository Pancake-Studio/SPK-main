import { requireTeacherProfile } from "@/lib/auth";
import {
  getTeacherSchedule,
  getTeachersWithSchedules,
} from "@/server/services/schedule.service";
import { getDefaultSchedule } from "@/server/services/bell-schedule.service";
import { PageHeader } from "@/components/page-header";
import { SwapWizard } from "@/components/swap/swap-wizard";

export const metadata = { title: "ฝากคาบสอน" };

export default async function NewDelegationPage() {
  const { teacher } = await requireTeacherProfile();
  const [slots, others, bell] = await Promise.all([
    getTeacherSchedule(teacher.id),
    getTeachersWithSchedules(teacher.id),
    getDefaultSchedule(),
  ]);

  return (
    <div>
      <PageHeader
        title="ฝากคาบสอน"
        description="ทำทีละขั้นตอน — เลือกสัปดาห์ → เลือกคาบของคุณ → เลือกครูที่ว่างมาคุมแทน → ยืนยัน"
      />
      <SwapWizard mode="delegate" mySlots={slots} teachers={others} bellSlots={bell.slots} />
    </div>
  );
}
