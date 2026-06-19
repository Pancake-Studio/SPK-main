import { CalendarDays } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import {
  listSchedules,
  listClasses,
  listSubjects,
  listTeachers,
} from "@/server/services/admin.service";
import { deleteScheduleAction } from "@/server/actions/admin.actions";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { AddScheduleDialog } from "@/components/admin/dialogs/add-schedule-dialog";
import { ImportScheduleDialog } from "@/components/admin/dialogs/import-schedule-dialog";
import { DeleteButton } from "@/components/admin/delete-button";
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

  return (
    <div>
      <PageHeader title="จัดการตารางสอน" description={`คาบสอนทั้งหมด ${schedules.length} คาบ`}>
        <ImportScheduleDialog />
        <AddScheduleDialog classes={classOptions} subjects={subjectOptions} teachers={teacherOptions} />
      </PageHeader>

      {schedules.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="ยังไม่มีตารางสอน"
          description="เพิ่มคาบสอนทีละคาบ หรือนำเข้าจากไฟล์ CSV/Excel"
        />
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ห้อง</TableHead>
                <TableHead>วัน</TableHead>
                <TableHead className="text-center">คาบ</TableHead>
                <TableHead>วิชา</TableHead>
                <TableHead>ครู</TableHead>
                <TableHead>ห้อง/อาคาร</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-foreground">{s.class.className}</TableCell>
                  <TableCell>{dayMeta(s.day)?.labelTh ?? s.day}</TableCell>
                  <TableCell className="text-center">{s.period}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: s.subject.colorHex ?? "var(--color-primary)" }}
                      />
                      {s.subject.subjectName}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.teacher.user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.room ?? "-"}</TableCell>
                  <TableCell>
                    <DeleteButton id={s.id} action={deleteScheduleAction} confirmText="ลบคาบสอนนี้?" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
