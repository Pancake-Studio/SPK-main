import { notFound } from "next/navigation";
import { requireTeacherProfile } from "@/lib/auth";
import {
  listTeacherAssignmentsByClassName,
  teacherClasses,
  studentsInClass,
} from "@/server/services/assignment.service";
import { expandClassGroupIds } from "@/server/services/admin.service";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { AssignmentCreateDialog } from "@/components/assignments/assignment-create-dialog";
import { TeacherAssignmentsBoard } from "@/components/assignments/teacher-assignments-board";

export const metadata = { title: "มอบหมายงาน" };

export default async function TeacherAssignmentsByClassPage({
  params,
}: {
  params: Promise<{ className: string }> | { className: string };
}) {
  const { teacher } = await requireTeacherProfile();
  const className = decodeURIComponent((await params).className);

  const teacherClassesList = await teacherClasses(teacher.id);
  const teacherClassNames = teacherClassesList.map((c) => c.className);
  if (!teacherClassNames.includes(className)) notFound();

  const allClasses = await db.class.findMany({ select: { id: true, className: true } });
  const selectedClass = allClasses.find((c) => c.className === className);
  if (!selectedClass) notFound();

  const groupClassIds = expandClassGroupIds(className, allClasses);

  const [assignments] = await Promise.all([
    listTeacherAssignmentsByClassName(teacher.id, className),
  ]);

  // Build a student map for every class the teacher actually teaches, plus a
  // combined entry under the selected base-group id (so assigning from M.4/3
  // expands to M.4/3.1 + M.4/3.2).
  const studentsByClass: Record<
    string,
    { id: string; name: string; title: string | null; rollNumber: number | null }[]
  > = {};
  await Promise.all(
    teacherClassesList.map(async (c) => {
      studentsByClass[c.id] = await studentsInClass(c.id);
    }),
  );
  if (groupClassIds.length > 1) {
    const combined = (
      await Promise.all(
        groupClassIds.map((id) =>
          studentsInClass(id).then((list) =>
            list.map((s) => ({
              ...s,
              label: allClasses.find((c) => c.id === id)?.className ?? "",
            })),
          ),
        ),
      )
    ).flat();
    studentsByClass[selectedClass.id] = combined;
  }

  const classOptions = teacherClassNames
    .map((name) => ({
      id: allClasses.find((c) => c.className === name)?.id ?? "",
      className: name,
    }))
    .filter((c) => c.id);

  return (
    <div className="space-y-4">
      <PageHeader
        title={`มอบหมายงาน — ${className}`}
        description="สร้างงาน/การบ้านให้นักเรียน แนบรูป/PDF กำหนดส่ง และติดตามความคืบหน้า"
      >
        <AssignmentCreateDialog
          classes={classOptions}
          studentsByClass={studentsByClass}
          defaultClassId={selectedClass.id}
        />
      </PageHeader>

      <TeacherAssignmentsBoard assignments={assignments} />
    </div>
  );
}
