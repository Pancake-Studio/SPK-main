import { requireStudentProfile } from "@/lib/auth";
import {
  getClassSchedule,
  getClassBrief,
} from "@/server/services/schedule.service";
import { getSwapMarks } from "@/server/services/swap.service";
import { PageHeader } from "@/components/page-header";
import { TimetableGrid } from "@/components/timetable/timetable-grid";
import { WeekCards } from "@/components/timetable/week-cards";

export const metadata = { title: "ตารางเรียน" };

export default async function StudentSchedulePage() {
  const { student } = await requireStudentProfile();
  const [slots, klass] = await Promise.all([
    getClassSchedule(student.classId),
    getClassBrief(student.classId),
  ]);
  const swapMarks = await getSwapMarks(slots.map((s) => s.id));

  return (
    <div>
      <PageHeader
        title="ตารางเรียน"
        description={klass ? `ห้อง ${klass.className}${klass.room ? ` · ${klass.room}` : ""}` : undefined}
      />

      {/* Desktop: full grid. Mobile: card layout (per DESIGN.md §17). */}
      <div className="hidden lg:block">
        <TimetableGrid slots={slots} variant="class" swapMarks={swapMarks} />
      </div>
      <div className="lg:hidden">
        <WeekCards slots={slots} variant="class" swapMarks={swapMarks} />
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-3 rounded bg-amber-400" /> คาบที่มีการสลับครูผู้สอน
      </div>
    </div>
  );
}
