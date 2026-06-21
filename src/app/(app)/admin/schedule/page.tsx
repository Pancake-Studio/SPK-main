import { CalendarDays } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import {
  listSchedules,
  listClasses,
  listSubjects,
  listTeachers,
} from "@/server/services/admin.service";
import {
  deleteScheduleAction,
  deleteSchedulesAction,
} from "@/server/actions/admin.actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AddScheduleDialog } from "@/components/admin/dialogs/add-schedule-dialog";
import { DataSyncButton } from "@/components/admin/data-sync-button";
import { ImportScheduleDialog } from "@/components/admin/dialogs/import-schedule-dialog";
import { SchedulesTable, type ScheduleRow } from "@/components/admin/schedules-table";
import { dayMeta } from "@/lib/timetable";

export const metadata = { title: "จัดการตารางสอน" };

export default async function AdminSchedulePage() {
  await requireAdmin();
  const [schedules, classes, subjects, teachers] = await Promise.all([
    listSchedules(),
    listClasses(),
    listSubjects(),
    listTeachers(),
  ]);

  const classOptions = classes.map((c) => ({ value: c.id, label: c.className }));
  const subjectOptions = subjects.map((s) => ({ value: s.id, label: `${s.subjectName} (${s.subjectCode})` }));
  const teacherOptions = teachers.map((t) => ({ value: t.id, label: t.user.name }));

  // Which periods each class already uses per day → the dialog disables them.
  const occupied: Record<string, number[]> = {};
  for (const s of schedules) {
    const key = `${s.classId}__${s.day}`;
    (occupied[key] ??= []).push(s.period);
  }

  const rows: ScheduleRow[] = schedules.map((s) => ({
    id: s.id,
    classId: s.classId,
    subjectId: s.subjectId,
    teacherId: s.teacherId,
    className: s.class.className,
    day: s.day,
    dayLabel: dayMeta(s.day)?.labelTh ?? s.day,
    period: s.period,
    subjectName: s.subject.subjectName,
    colorHex: s.subject.colorHex,
    teacherName: s.teacher.user.name,
    room: s.room,
  }));

  return (
    <div>
      <PageHeader title="จัดการตารางสอน" description={`คาบสอนทั้งหมด ${schedules.length} คาบ`}>
        <DataSyncButton tab="schedules" />
        <ImportScheduleDialog />
        <AddScheduleDialog
          classes={classOptions}
          subjects={subjectOptions}
          teachers={teacherOptions}
          occupied={occupied}
        />
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="ยังไม่มีตารางสอน"
          description="เพิ่มคาบสอนทีละคาบ หรือนำเข้าจากไฟล์ CSV/Excel"
        />
      ) : (
        <SchedulesTable
          rows={rows}
          classes={classOptions}
          subjects={subjectOptions}
          teachers={teacherOptions}
          occupied={occupied}
          deleteOne={deleteScheduleAction}
          deleteMany={deleteSchedulesAction}
        />
      )}
    </div>
  );
}
