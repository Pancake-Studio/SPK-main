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
  const classOptions: Option[] = classes.map((c) => ({ value: c.id, label: c.className }));

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
