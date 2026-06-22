import { requireTeacherProfile } from "@/lib/auth";
import {
  listTeacherAssignments,
  teacherClasses,
  studentsInClass,
} from "@/server/services/assignment.service";
import { PageHeader } from "@/components/page-header";
import { AssignmentCreateDialog } from "@/components/assignments/assignment-create-dialog";
import { TeacherAssignmentsBoard } from "@/components/assignments/teacher-assignments-board";

export const metadata = { title: "มอบหมายงาน" };

export default async function TeacherAssignmentsPage() {
  const { teacher } = await requireTeacherProfile();
  const [assignments, classes] = await Promise.all([
    listTeacherAssignments(teacher.id),
    teacherClasses(teacher.id),
  ]);

  const studentsByClass: Record<
    string,
    { id: string; name: string; title: string | null; rollNumber: number | null }[]
  > = {};
  await Promise.all(
    classes.map(async (c) => {
      studentsByClass[c.id] = await studentsInClass(c.id);
    }),
  );

  return (
    <div>
      <PageHeader
        title="มอบหมายงาน"
        description="สร้างงาน/การบ้านให้นักเรียน แนบรูป/PDF กำหนดส่ง และติดตามความคืบหน้าแยกตามห้อง"
      >
        <AssignmentCreateDialog classes={classes} studentsByClass={studentsByClass} />
      </PageHeader>

      <TeacherAssignmentsBoard assignments={assignments} />
    </div>
  );
}
