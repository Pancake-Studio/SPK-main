import { requireTeacherProfile } from "@/lib/auth";
import {
  getTeacherSchedule,
  getTeacherScheduleWithSwaps,
  getTeachersWithSchedules,
} from "@/server/services/schedule.service";
import { getSwapMarks } from "@/server/services/swap.service";
import { PageHeader } from "@/components/page-header";
import { TimetableGrid } from "@/components/timetable/timetable-grid";
import { SwapRequestDialog } from "@/components/swap/swap-request-dialog";

export const metadata = { title: "ตารางสอนของฉัน" };

export default async function TeacherSchedulePage() {
  const { teacher } = await requireTeacherProfile();
  // `slots` = own + swapped-in counterpart periods (for display);
  // `ownSlots` = only periods this teacher owns (for the swap picker).
  const [slots, ownSlots, others] = await Promise.all([
    getTeacherScheduleWithSwaps(teacher.id),
    getTeacherSchedule(teacher.id),
    getTeachersWithSchedules(teacher.id),
  ]);
  const swapMarks = await getSwapMarks(slots.map((s) => s.id));

  return (
    <div>
      <PageHeader
        title="ตารางสอนของฉัน"
        description="ตารางสอนทั้งสัปดาห์ คาบปัจจุบันจะถูกไฮไลต์โดยอัตโนมัติ"
      >
        <SwapRequestDialog mySlots={ownSlots} teachers={others} />
      </PageHeader>

      <TimetableGrid slots={slots} variant="teacher" swapMarks={swapMarks} />

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-tt-current" /> คาบปัจจุบัน
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-tt-free" /> คาบว่าง
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-amber-400" /> คาบที่สลับ
        </span>
      </div>
    </div>
  );
}
