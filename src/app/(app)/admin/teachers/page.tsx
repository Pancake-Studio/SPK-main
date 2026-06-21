import { Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listTeachers } from "@/server/services/admin.service";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AddTeacherDialog } from "@/components/admin/dialogs/add-teacher-dialog";
import { DataSyncButton } from "@/components/admin/data-sync-button";
import { TeacherTable, type TeacherRow } from "@/components/admin/teacher-table";

export const metadata = { title: "จัดการครู" };

export default async function AdminTeachersPage() {
  await requireAdmin();
  const teachers = await listTeachers();

  return (
    <div>
      <PageHeader title="จัดการครู" description={`ครูทั้งหมด ${teachers.length} คน`}>
        <DataSyncButton tab="teachers" />
        <AddTeacherDialog />
      </PageHeader>

      {teachers.length === 0 ? (
        <EmptyState icon={Users} title="ยังไม่มีครูในระบบ" description="เริ่มต้นด้วยการเพิ่มครูคนแรก" />
      ) : (
        <TeacherTable
          teachers={teachers.map((t): TeacherRow => ({
            id: t.id,
            teacherCode: t.teacherCode,
            name: t.user.name,
            email: t.user.email,
            department: t.department,
            title: t.title,
            phone: t.phone,
            schedulesCount: t._count.schedules,
          }))}
        />
      )}
    </div>
  );
}
