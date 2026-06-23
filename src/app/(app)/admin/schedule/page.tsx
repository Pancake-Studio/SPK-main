import { CalendarDays, UserSearch } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import {
  listTeachers,
  listClasses,
  listSubjects,
  listTeacherSlots,
  classOccupancyMap,
} from "@/server/services/admin.service";
import {
  saveScheduleSlotAction,
  deleteScheduleAction,
} from "@/server/actions/admin.actions";
import { getDefaultSchedule } from "@/server/services/bell-schedule.service";
import { activitySlotMap } from "@/server/services/activity.service";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { DataSyncButton } from "@/components/admin/data-sync-button";
import { ImportScheduleDialog } from "@/components/admin/dialogs/import-schedule-dialog";
import { TeacherPicker } from "@/components/schedule/teacher-picker";
import { ScheduleEditor, type EditorSlot } from "@/components/schedule/schedule-editor";
import type { DayKey } from "@/lib/constants";

export const metadata = { title: "จัดการตารางสอน" };

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ teacher?: string }>;
}) {
  await requireAdmin();
  const { teacher: teacherId } = await searchParams;

  const [teachers, classes, subjects, bell] = await Promise.all([
    listTeachers(),
    listClasses(),
    listSubjects(),
    getDefaultSchedule(),
  ]);

  const teacherOptions = teachers.map((t) => ({ value: t.id, label: t.user.name }));
  const classOptions = classes.map((c) => ({ value: c.id, label: c.className }));
  const subjectOptions = subjects.map((s) => ({
    value: s.id,
    label: `${s.subjectName}`,
    hint: s.subjectCode,
  }));

  const selected = teacherId ? teachers.find((t) => t.id === teacherId) : undefined;
  const [rows, occupancy, activities] = selected
    ? await Promise.all([listTeacherSlots(teacherId!), classOccupancyMap(), activitySlotMap()])
    : [[], {}, {} as Record<string, string>];

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
      <PageHeader title="จัดการตารางสอน" description="เลือกครู แล้วคลิกคาบว่างเพื่อเพิ่ม หรือคลิกคาบที่มีเพื่อแก้ไข/ลบ">
        <DataSyncButton tab="schedules" />
        <ImportScheduleDialog />
      </PageHeader>

      <div className="mb-4">
        <TeacherPicker teachers={teacherOptions} value={teacherId ?? ""} />
      </div>

      {!selected ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-16 text-center text-muted-foreground">
          <UserSearch className="size-10 text-muted-foreground/50" />
          <p className="font-medium text-foreground">เลือกครูเพื่อเริ่มจัดตารางสอน</p>
          <p className="text-sm">ค้นหาและเลือกครูจากช่องด้านบน จะแสดงตารางสอนของครูคนนั้นให้แก้ไข</p>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            ตารางสอนของ <span className="font-semibold text-foreground">{selected.user.name}</span> · {slots.length} คาบ
          </div>
          <ScheduleEditor
            teacherId={teacherId!}
            slots={slots}
            classes={classOptions}
            subjects={subjectOptions}
            occupancy={occupancy}
            activities={activities}
            bellSlots={bell.slots}
            onSave={saveScheduleSlotAction}
            onDelete={deleteScheduleAction}
          />
        </div>
      )}
    </div>
  );
}
