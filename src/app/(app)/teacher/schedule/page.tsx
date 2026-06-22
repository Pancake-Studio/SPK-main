import { requireTeacherProfile } from "@/lib/auth";
import {
  getTeacherSchedule,
  getTeacherScheduleWithSwaps,
  getTeachersWithSchedules,
} from "@/server/services/schedule.service";
import { getSwapMarks } from "@/server/services/swap.service";
import { getDefaultSchedule } from "@/server/services/bell-schedule.service";
import { getWeekSwaps } from "@/server/services/day-swap.service";
import { buildDayRemap, toIsoDate } from "@/lib/day-swap";
import { PageHeader } from "@/components/page-header";
import { TimetableGrid } from "@/components/timetable/timetable-grid";
import { DaySwapBanner } from "@/components/timetable/day-swap-banner";
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
  const { slots: bellSlots } = await getDefaultSchedule();
  const weekSwaps = await getWeekSwaps(toIsoDate(new Date()));
  const dayRemap = buildDayRemap(weekSwaps);

  return (
    <div>
      <PageHeader
        title="ตารางสอนของฉัน"
        description="ตารางสอนทั้งสัปดาห์ คาบปัจจุบันจะถูกไฮไลต์โดยอัตโนมัติ"
      >
        <SwapRequestDialog mySlots={ownSlots} teachers={others} bellSlots={bellSlots} />
      </PageHeader>

      <DaySwapBanner swaps={weekSwaps} />

      <TimetableGrid slots={slots} variant="teacher" swapMarks={swapMarks} bellSlots={bellSlots} dayRemap={dayRemap} />

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
