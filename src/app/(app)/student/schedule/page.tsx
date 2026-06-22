import { requireStudentProfile } from "@/lib/auth";
import {
  getClassSchedule,
  getClassBrief,
} from "@/server/services/schedule.service";
import { getSwapMarks } from "@/server/services/swap.service";
import { getDefaultSchedule } from "@/server/services/bell-schedule.service";
import { getWeekSwaps } from "@/server/services/day-swap.service";
import { buildDayRemap, toIsoDate } from "@/lib/day-swap";
import { PageHeader } from "@/components/page-header";
import { TimetableGrid } from "@/components/timetable/timetable-grid";
import { WeekCards } from "@/components/timetable/week-cards";
import { DaySwapBanner } from "@/components/timetable/day-swap-banner";

export const metadata = { title: "ตารางเรียน" };

export default async function StudentSchedulePage() {
  const { student } = await requireStudentProfile();
  const [slots, klass] = await Promise.all([
    getClassSchedule(student.classId),
    getClassBrief(student.classId),
  ]);
  const swapMarks = await getSwapMarks(slots.map((s) => s.id));
  const { slots: bellSlots } = await getDefaultSchedule();
  const weekSwaps = await getWeekSwaps(toIsoDate(new Date()));
  const dayRemap = buildDayRemap(weekSwaps);

  return (
    <div>
      <PageHeader
        title="ตารางเรียน"
        description={klass ? `ห้อง ${klass.className}${klass.room ? ` · ${klass.room}` : ""}` : undefined}
      />

      {/* Desktop: full grid. Mobile: card layout (per DESIGN.md §17). */}
      <DaySwapBanner swaps={weekSwaps} />

      <div className="hidden lg:block">
        <TimetableGrid slots={slots} variant="class" swapMarks={swapMarks} bellSlots={bellSlots} dayRemap={dayRemap} />
      </div>
      <div className="lg:hidden">
        <WeekCards slots={slots} variant="class" swapMarks={swapMarks} bellSlots={bellSlots} dayRemap={dayRemap} />
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-3 rounded bg-amber-400" /> คาบที่มีการสลับครูผู้สอน
      </div>
    </div>
  );
}
