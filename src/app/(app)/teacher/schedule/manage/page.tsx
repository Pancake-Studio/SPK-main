import { CalendarDays } from "lucide-react";
import { requireTeacherProfile } from "@/lib/auth";
import {
  listOwnSchedule,
  listSubjectsForTeacher,
} from "@/server/services/teacher-self.service";
import { listClasses } from "@/server/services/admin.service";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import type { Option } from "@/components/admin/select-field";
import { AddOwnScheduleDialog } from "@/components/teacher/own-schedule-dialogs";
import {
  OwnScheduleTable,
  type OwnScheduleTableRow,
} from "@/components/teacher/own-schedule-table";

export const metadata = { title: "จัดตารางสอนของฉัน" };

export default async function TeacherScheduleManagePage() {
  const { teacher } = await requireTeacherProfile();
  const [rows, classes, subjects] = await Promise.all([
    listOwnSchedule(teacher.id),
    listClasses(),
    listSubjectsForTeacher(),
  ]);

  const classOptions: Option[] = classes.map((c) => ({ value: c.id, label: c.className }));
  const subjectOptions: Option[] = subjects.map((s) => ({ value: s.id, label: `${s.subjectCode} · ${s.subjectName}` }));
  const tableRows: OwnScheduleTableRow[] = rows.map((r) => ({
    id: r.id,
    classId: r.classId,
    subjectId: r.subjectId,
    day: r.day,
    period: r.period,
    room: r.room,
    className: r.class.className,
    subjectName: r.subject.subjectName,
    subjectCode: r.subject.subjectCode,
  }));

  return (
    <div>
      <PageHeader title="จัดตารางสอนของฉัน" description="เพิ่ม/แก้ไขคาบสอนของคุณเอง (จัดได้เฉพาะคาบที่คุณเป็นผู้สอน)">
        <AddOwnScheduleDialog classes={classOptions} subjects={subjectOptions} />
      </PageHeader>

      {tableRows.length === 0 ? (
        <EmptyState icon={CalendarDays} title="ยังไม่มีคาบสอน" description="เพิ่มคาบสอนแรกของคุณ" />
      ) : (
        <OwnScheduleTable rows={tableRows} classes={classOptions} subjects={subjectOptions} />
      )}
    </div>
  );
}
