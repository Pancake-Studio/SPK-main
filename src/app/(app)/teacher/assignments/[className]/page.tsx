import Link from "next/link";
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
import { cn } from "@/lib/utils";

function baseName(className: string) {
  return className.replace(/\.\d+$/, "");
}

export const metadata = { title: "มอบหมายงาน" };

export default async function TeacherAssignmentsByClassPage({
  params,
}: {
  params: Promise<{ className: string }> | { className: string };
}) {
  const { teacher } = await requireTeacherProfile();
  const raw = (await params).className;
  const className = decodeURIComponent(raw);

  const classes = await teacherClasses(teacher.id);
  const baseGroups = Array.from(new Set(classes.map((c) => baseName(c.className)))).sort();
  if (!baseGroups.includes(className)) notFound();

  const allClasses = await db.class.findMany({ select: { id: true, className: true } });
  const groupClassIds = expandClassGroupIds(className, allClasses);
  const groupClassNames = new Set(
    allClasses.filter((c) => groupClassIds.includes(c.id)).map((c) => c.className),
  );

  const [assignments] = await Promise.all([
    listTeacherAssignmentsByClassName(teacher.id, className),
  ]);

  // Combine students from every sub-room under the base group key for the dialog.
  const studentsByClass: Record<
    string,
    { id: string; name: string; title: string | null; rollNumber: number | null }[]
  > = {};
  const baseClass = allClasses.find((c) => c.className === className);
  if (baseClass) {
    const students = (
      await Promise.all(
        groupClassIds.map(async (id) =>
          studentsInClass(id).then((list) =>
            list.map((s) => ({ ...s, className: allClasses.find((c) => c.id === id)?.className ?? "" })),
          ),
        ),
      )
    ).flat();
    // Show rollNumber + class label so teachers can tell sub-rooms apart.
    studentsByClass[baseClass.id] = students.map((s) => ({
      id: s.id,
      name: s.name,
      title: s.title,
      rollNumber: s.rollNumber,
    }));
  }

  const classOptions = baseGroups.map((name) => ({
    id: allClasses.find((c) => c.className === name)?.id ?? "",
    className: name,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title={`มอบหมายงาน — ${className}`}
        description="สร้างงาน/การบ้านให้นักเรียน แนบรูป/PDF กำหนดส่ง และติดตามความคืบหน้า"
      >
        {baseClass && (
          <AssignmentCreateDialog
            classes={classOptions}
            studentsByClass={studentsByClass}
            defaultClassId={baseClass.id}
          />
        )}
      </PageHeader>

      <nav className="flex flex-wrap gap-2">
        {baseGroups.map((name) => {
          const active = name === className;
          return (
            <Link
              key={name}
              href={`/teacher/assignments/${encodeURIComponent(name)}`}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {name}
            </Link>
          );
        })}
      </nav>

      <TeacherAssignmentsBoard assignments={assignments} />
    </div>
  );
}
