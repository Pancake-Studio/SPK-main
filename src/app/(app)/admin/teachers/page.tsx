import { Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listTeachers, listClasses } from "@/server/services/admin.service";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AddTeacherDialog } from "@/components/admin/dialogs/add-teacher-dialog";
import { DataSyncButton } from "@/components/admin/data-sync-button";
import { TeacherTable, type TeacherRow } from "@/components/admin/teacher-table";
import type { Option } from "@/components/admin/select-field";

export const metadata = { title: "จัดการครู" };

export default async function AdminTeachersPage() {
  await requireAdmin();
  const [teachers, classes] = await Promise.all([listTeachers(), listClasses()]);
  // Advisors are assigned to the BASE-GROUP class (e.g. ม.5/3), never a dotted
  // sub-room (ม.5/3.1). The advisor then manages every sub-room automatically —
  // even ones created later (ม.5/3.4). Detect sub-rooms by a trailing ".N" (NOT a
  // plain `includes(".")` — Thai names start with "ม." which contains a dot).
  // The student count sums the base class + all its sub-rooms.
  const classOptions: Option[] = classes
    .filter((c) => !/\.\d+$/.test(c.className))
    .map((c) => {
      const total =
        c._count.students +
        classes
          .filter((o) => o.className.startsWith(`${c.className}.`))
          .reduce((n, o) => n + o._count.students, 0);
      return { value: c.id, label: total > 0 ? `${c.className} · ${total} คน` : c.className };
    });

  return (
    <div>
      <PageHeader title="จัดการครู" description={`ครูทั้งหมด ${teachers.length} คน`}>
        <DataSyncButton tab="teachers" />
        <AddTeacherDialog classes={classOptions} />
      </PageHeader>

      {teachers.length === 0 ? (
        <EmptyState icon={Users} title="ยังไม่มีครูในระบบ" description="เริ่มต้นด้วยการเพิ่มครูคนแรก" />
      ) : (
        <TeacherTable
          classes={classOptions}
          teachers={teachers.map((t): TeacherRow => ({
            id: t.id,
            teacherCode: t.teacherCode,
            name: t.user.name,
            email: t.user.email,
            department: t.department,
            title: t.title,
            phone: t.phone,
            schedulesCount: t._count.schedules,
            advisorClassId: t.advisorClassId,
            advisorClassName: t.advisorClass?.className ?? null,
          }))}
        />
      )}
    </div>
  );
}
