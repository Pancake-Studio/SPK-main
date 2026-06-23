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

  // The dotted sub-rooms are the real classes that contain students.
  const groupClassIds = expandClassGroupIds(className, allClasses, { includeBase: false });

  const [assignments] = await Promise.all([
    listTeacherAssignmentsByClassName(teacher.id, className),
  ]);

  const studentsByClass: Record<
    string,
    { id: string; name: string; title: string | null; rollNumber: number | null }[]
  > = {};

  // Build options for the class dropdown: base groups + their dotted sub-rooms.
  // This lets the teacher assign to the whole group (default) or to a specific sub-room.
  const classOptionsMap = new Map<string, { id: string; className: string }>();
  for (const baseName of teacherClassNames) {
    const ids = expandClassGroupIds(baseName, allClasses, { includeBase: true });
    for (const id of ids) {
      const cls = allClasses.find((c) => c.id === id);
      if (cls && !classOptionsMap.has(id)) classOptionsMap.set(id, cls);
    }
  }
  const classOptions = Array.from(classOptionsMap.values()).sort((a, b) =>
    a.className.localeCompare(b.className),
  );

  // Load students for every class option (base groups won't have students, sub-rooms will).
  await Promise.all(
    classOptions.map(async (c) => {
      studentsByClass[c.id] = await studentsInClass(c.id);
    }),
  );

  // For the base-group default selection, show a combined student list from all sub-rooms.
  if (groupClassIds.length > 0) {
    const combined = groupClassIds
      .flatMap((id) =>
        (studentsByClass[id] ?? []).map((s) => ({
          ...s,
          label: allClasses.find((c) => c.id === id)?.className ?? "",
        })),
      )
      .sort((a, b) => {
        if (a.label !== b.label) return a.label.localeCompare(b.label);
        return (a.rollNumber ?? Infinity) - (b.rollNumber ?? Infinity);
      });
    studentsByClass[selectedClass.id] = combined;
  }

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
