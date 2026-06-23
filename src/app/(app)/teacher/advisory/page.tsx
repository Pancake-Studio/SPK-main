import { GraduationCap, UserCog } from "lucide-react";
import { requireTeacherProfile } from "@/lib/auth";
import {
  getAdvisorClass,
  listAdvisoryStudents,
} from "@/server/services/teacher-self.service";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  AddAdvisoryStudentDialog,
  type AdvisoryStudentRow,
} from "@/components/teacher/advisory-student-dialogs";
import { AdvisoryStudentTable } from "@/components/teacher/advisory-student-table";

export const metadata = { title: "นักเรียนในที่ปรึกษา" };

export default async function TeacherAdvisoryPage() {
  const { teacher } = await requireTeacherProfile();
  const klass = await getAdvisorClass(teacher.id);

  if (!klass) {
    return (
      <div>
        <PageHeader title="นักเรียนในที่ปรึกษา" />
        <EmptyState
          icon={UserCog}
          title="คุณยังไม่ได้เป็นครูที่ปรึกษา"
          description="เมื่อผู้ดูแลระบบกำหนดห้องที่ปรึกษาให้คุณ จะสามารถจัดการข้อมูลนักเรียนในห้องนั้นได้ที่นี่"
        />
      </div>
    );
  }

  const students = await listAdvisoryStudents(klass.id);

  return (
    <div>
      <PageHeader
        title="นักเรียนในที่ปรึกษา"
        description={`ห้อง ${klass.className} · นักเรียน ${students.length} คน — เพิ่ม/แก้ไขได้เฉพาะห้องนี้`}
      >
        <AddAdvisoryStudentDialog className={klass.className} />
      </PageHeader>

      {students.length === 0 ? (
        <EmptyState icon={GraduationCap} title="ยังไม่มีนักเรียนในห้องนี้" description="เพิ่มนักเรียนคนแรก" />
      ) : (
        <AdvisoryStudentTable
          students={students.map((s): AdvisoryStudentRow => ({
            id: s.id,
            title: s.title,
            name: s.user.name,
            email: s.user.email,
            studentCode: s.studentCode,
            rollNumber: s.rollNumber,
          }))}
        />
      )}
    </div>
  );
}
