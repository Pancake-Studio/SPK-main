import { requireTeacherProfile } from "@/lib/auth";
import {
  getTeacherSchedule,
  getTeachersWithSchedules,
} from "@/server/services/schedule.service";
import { PageHeader } from "@/components/page-header";
import { TimetableGrid } from "@/components/timetable/timetable-grid";
import { SwapRequestDialog } from "@/components/swap/swap-request-dialog";

export const metadata = { title: "ตารางสอนของฉัน" };

export default async function TeacherSchedulePage() {
  const { teacher } = await requireTeacherProfile();
  const [slots, others] = await Promise.all([
    getTeacherSchedule(teacher.id),
    getTeachersWithSchedules(teacher.id),
  ]);

  return (
    <div>
      <PageHeader
        title="ตารางสอนของฉัน"
        description="ตารางสอนทั้งสัปดาห์ คาบปัจจุบันจะถูกไฮไลต์โดยอัตโนมัติ"
      >
        <SwapRequestDialog mySlots={slots} teachers={others} />
      </PageHeader>

      <TimetableGrid slots={slots} variant="teacher" />

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-tt-current" /> คาบปัจจุบัน
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-tt-free" /> คาบว่าง
        </span>
      </div>
    </div>
  );
}
