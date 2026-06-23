import { requireTeacherProfile } from "@/lib/auth";
import { listOwnSchedule, listSubjectsForTeacher } from "@/server/services/teacher-self.service";
import { listClasses, classOccupancyMap } from "@/server/services/admin.service";
import { getDefaultSchedule } from "@/server/services/bell-schedule.service";
import { activitySlotMap } from "@/server/services/activity.service";
import {
  saveOwnScheduleSlotAction,
  deleteOwnScheduleAction,
} from "@/server/actions/teacher-self.actions";
import { PageHeader } from "@/components/page-header";
import { ScheduleEditor, type EditorSlot } from "@/components/schedule/schedule-editor";
import type { DayKey } from "@/lib/constants";

export const metadata = { title: "จัดตารางสอนของฉัน" };

export default async function TeacherScheduleManagePage() {
  const { teacher } = await requireTeacherProfile();
  const [rows, classes, subjects, occupancy, activities, bell] = await Promise.all([
    listOwnSchedule(teacher.id),
    listClasses(),
    listSubjectsForTeacher(),
    classOccupancyMap(),
    activitySlotMap(),
    getDefaultSchedule(),
  ]);

  const classOptions = classes.map((c) => ({ value: c.id, label: c.className }));
  const subjectOptions = subjects.map((s) => ({ value: s.id, label: s.subjectName, hint: s.subjectCode }));
  const slots: EditorSlot[] = rows.map((r) => ({
    id: r.id,
    classId: r.classId,
    subjectId: r.subjectId,
    day: r.day as DayKey,
    period: r.period,
    room: r.room,
    className: r.class.className,
    subjectName: r.subject.subjectName,
    subjectCode: r.subject.subjectCode,
    colorHex: r.subject.colorHex,
    multi: r.subject.hideTeacherForStudents,
  }));

  return (
    <div>
      <PageHeader
        title="จัดตารางสอนของฉัน"
        description="คลิกคาบว่างเพื่อเพิ่มคาบสอน หรือคลิกคาบที่มีเพื่อแก้ไข/ลบ (ห้องที่มีเรียนอยู่แล้วในเวลานั้นจะเลือกไม่ได้)"
      />
      <ScheduleEditor
        teacherId={teacher.id}
        slots={slots}
        classes={classOptions}
        subjects={subjectOptions}
        occupancy={occupancy}
        activities={activities}
        bellSlots={bell.slots}
        onSave={saveOwnScheduleSlotAction}
        onDelete={deleteOwnScheduleAction}
      />
    </div>
  );
}
