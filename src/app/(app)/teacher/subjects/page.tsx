import { BookOpen } from "lucide-react";
import { requireTeacherProfile } from "@/lib/auth";
import { listAllSubjects } from "@/server/services/teacher-self.service";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AddOwnSubjectDialog, type OwnSubjectRow } from "@/components/teacher/own-subject-dialogs";
import { TeacherSubjectTable } from "@/components/teacher/teacher-subject-table";

export const metadata = { title: "จัดการวิชา" };

export default async function TeacherSubjectsPage() {
  await requireTeacherProfile();
  const subjects = await listAllSubjects();
  const rows: OwnSubjectRow[] = subjects.map((s) => ({
    id: s.id,
    subjectName: s.subjectName,
    subjectCode: s.subjectCode,
    colorHex: s.colorHex,
    schedulesCount: s._count.schedules,
    hideTeacher: s.hideTeacherForStudents,
  }));

  return (
    <div>
      <PageHeader title="จัดการวิชา" description="เพิ่ม/แก้ไขวิชาทั้งหมดในระบบ">
        <AddOwnSubjectDialog />
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState icon={BookOpen} title="ยังไม่มีวิชา" description="เพิ่มวิชาแรกเพื่อใช้จัดตารางสอน" />
      ) : (
        <TeacherSubjectTable subjects={rows} />
      )}
    </div>
  );
}
