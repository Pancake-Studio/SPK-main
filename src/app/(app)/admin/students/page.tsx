import { GraduationCap } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listStudents, listClasses } from "@/server/services/admin.service";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AddStudentDialog } from "@/components/admin/dialogs/add-student-dialog";
import { StudentTable, type StudentRow } from "@/components/admin/student-table";

export const metadata = { title: "จัดการนักเรียน" };

export default async function AdminStudentsPage() {
  await requireAdmin();
  const [students, classes] = await Promise.all([listStudents(), listClasses()]);
  const classOptions = classes.map((c) => ({ value: c.id, label: c.className }));

  return (
    <div>
      <PageHeader title="จัดการนักเรียน" description={`นักเรียนทั้งหมด ${students.length} คน`}>
        <AddStudentDialog classes={classOptions} />
      </PageHeader>

      {students.length === 0 ? (
        <EmptyState icon={GraduationCap} title="ยังไม่มีนักเรียนในระบบ" description="เพิ่มนักเรียน หรือนำเข้าจากไฟล์" />
      ) : (
        <StudentTable
          students={students.map((s): StudentRow => ({
            id: s.id,
            studentCode: s.studentCode,
            name: s.user.name,
            email: s.user.email,
            className: s.class.className,
            classId: s.classId,
          }))}
          classes={classes.map((c) => ({ value: c.id, label: c.className }))}
        />
      )}
    </div>
  );
}
