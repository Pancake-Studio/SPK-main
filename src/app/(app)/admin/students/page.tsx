import { GraduationCap } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listStudentsPaged, listClasses } from "@/server/services/admin.service";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AddStudentDialog } from "@/components/admin/dialogs/add-student-dialog";
import { DataSyncButton } from "@/components/admin/data-sync-button";
import { StudentTable, type StudentRow } from "@/components/admin/student-table";
import { ListSearch, PaginationBar } from "@/components/admin/list-controls";

export const metadata = { title: "จัดการนักเรียน" };

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const q = sp.q ?? "";

  const [{ rows, total, page: cur, pageCount }, classes] = await Promise.all([
    listStudentsPaged({ page, pageSize: 25, q }),
    listClasses(),
  ]);
  const classOptions = classes.map((c) => ({ value: c.id, label: c.className }));

  const studentRows: StudentRow[] = rows.map((s) => ({
    id: s.id,
    studentCode: s.studentCode,
    title: s.title,
    rollNumber: s.rollNumber,
    name: s.user.name,
    email: s.user.email,
    className: s.class.className,
    classId: s.classId,
  }));

  return (
    <div>
      <PageHeader title="จัดการนักเรียน" description={`นักเรียนทั้งหมด ${total} คน`}>
        <DataSyncButton tab="students" />
        <AddStudentDialog classes={classOptions} />
      </PageHeader>

      <div className="mb-3">
        <ListSearch placeholder="ค้นหาชื่อ / รหัสนักเรียน…" />
      </div>

      {total === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={q ? "ไม่พบนักเรียนที่ค้นหา" : "ยังไม่มีนักเรียนในระบบ"}
          description={q ? "ลองคำค้นอื่น" : "เพิ่มนักเรียน หรือนำเข้าจากไฟล์"}
        />
      ) : (
        <>
          <StudentTable students={studentRows} classes={classOptions} />
          <PaginationBar page={cur} pageCount={pageCount} total={total} />
        </>
      )}
    </div>
  );
}
