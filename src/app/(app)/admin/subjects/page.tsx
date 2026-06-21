import { BookOpen } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listSubjects } from "@/server/services/admin.service";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AddSubjectDialog } from "@/components/admin/dialogs/add-subject-dialog";
import { SubjectTable, type SubjectRow } from "@/components/admin/subject-table";

export const metadata = { title: "จัดการวิชา" };

export default async function AdminSubjectsPage() {
  await requireAdmin();
  const subjects = await listSubjects();

  return (
    <div>
      <PageHeader title="จัดการวิชา" description={`วิชาทั้งหมด ${subjects.length} วิชา`}>
        <AddSubjectDialog />
      </PageHeader>

      {subjects.length === 0 ? (
        <EmptyState icon={BookOpen} title="ยังไม่มีวิชา" description="เพิ่มวิชาแรกของคุณ" />
      ) : (
        <SubjectTable
          subjects={subjects.map((s): SubjectRow => ({
            id: s.id,
            subjectName: s.subjectName,
            subjectCode: s.subjectCode,
            colorHex: s.colorHex,
            schedulesCount: s._count.schedules,
          }))}
        />
      )}
    </div>
  );
}
