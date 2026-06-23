import { requireStudentProfile } from "@/lib/auth";
import { getClassBrief } from "@/server/services/schedule.service";
import { getClassEffective } from "@/server/services/effective-schedule.service";
import { getDefaultSchedule } from "@/server/services/bell-schedule.service";
import { getWeekSwaps } from "@/server/services/day-swap.service";
import { buildDayRemap, toIsoDate } from "@/lib/day-swap";
import { PageHeader } from "@/components/page-header";
import { TimetableGrid } from "@/components/timetable/timetable-grid";
import { DaySwapBanner } from "@/components/timetable/day-swap-banner";

export const metadata = { title: "ตารางเรียน" };

export default async function StudentSchedulePage() {
  const { student } = await requireStudentProfile();
  const todayIso = toIsoDate(new Date());
  const [{ slots, marks }, klass] = await Promise.all([
    getClassEffective(student.classId, todayIso),
    getClassBrief(student.classId),
  ]);
  const { slots: bellSlots } = await getDefaultSchedule();
  const weekSwaps = await getWeekSwaps(todayIso);
  const dayRemap = buildDayRemap(weekSwaps);

  return (
    <div>
      <PageHeader
        title="ตารางเรียน"
        description={klass ? `ห้อง ${klass.className}${klass.room ? ` · ${klass.room}` : ""}` : undefined}
      />

      <DaySwapBanner swaps={weekSwaps} />

      {/* Days = rows, periods = columns. Scrolls horizontally on mobile. */}
      <TimetableGrid slots={slots} variant="class" marks={marks} bellSlots={bellSlots} dayRemap={dayRemap} />

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-amber-400" /> คาบที่สลับ (เฉพาะสัปดาห์นี้)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-violet-400" /> คาบที่ฝากครูคุมแทน
        </span>
      </div>
    </div>
  );
}
