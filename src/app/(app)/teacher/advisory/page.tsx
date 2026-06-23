import { GraduationCap, UserCog } from "lucide-react";
import { requireTeacherProfile } from "@/lib/auth";
import {
  getAdvisorContext,
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
  const { klass, rooms } = await getAdvisorContext(teacher.id);

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
  const roomOptions = rooms.map((r) => ({ value: r.id, label: r.className }));
  const multiRoom = rooms.length > 1;

  return (
    <div>
      <PageHeader
        title="นักเรียนในที่ปรึกษา"
        description={
          `ห้อง ${klass.className} · นักเรียน ${students.length} คน` +
          (multiRoom ? ` (รวมห้องย่อย ${rooms.map((r) => r.className).join(", ")})` : "")
        }
      >
        <AddAdvisoryStudentDialog className={klass.className} rooms={roomOptions} />
      </PageHeader>

      {students.length === 0 ? (
        <EmptyState icon={GraduationCap} title="ยังไม่มีนักเรียนในห้องนี้" description="เพิ่มนักเรียนคนแรก" />
      ) : (
        <AdvisoryStudentTable
          rooms={roomOptions}
          students={students.map((s): AdvisoryStudentRow => ({
            id: s.id,
            title: s.title,
            name: s.user.name,
            email: s.user.email,
            studentCode: s.studentCode,
            rollNumber: s.rollNumber,
            classId: s.classId,
            className: s.class.className,
          }))}
        />
      )}
    </div>
  );
}
