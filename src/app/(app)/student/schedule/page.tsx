import { requireStudentProfile } from "@/lib/auth";
import {
  getClassSchedule,
  getClassBrief,
} from "@/server/services/schedule.service";
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

  return (
    <div>
      <PageHeader
        title="ตารางเรียน"
        description={klass ? `ห้อง ${klass.className}${klass.room ? ` · ${klass.room}` : ""}` : undefined}
      />

      {/* Desktop: full grid. Mobile: card layout (per DESIGN.md §17). */}
      <div className="hidden lg:block">
        <TimetableGrid slots={slots} variant="class" />
      </div>
      <div className="lg:hidden">
        <WeekCards slots={slots} variant="class" />
      </div>
    </div>
  );
}
