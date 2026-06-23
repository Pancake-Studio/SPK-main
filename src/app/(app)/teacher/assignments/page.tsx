import Link from "next/link";
import { requireTeacherProfile } from "@/lib/auth";
import {
  listTeacherAssignments,
  teacherClasses,
  studentsInClass,
} from "@/server/services/assignment.service";
import { PageHeader } from "@/components/page-header";
import { AssignmentCreateDialog } from "@/components/assignments/assignment-create-dialog";
import { TeacherAssignmentsBoard } from "@/components/assignments/teacher-assignments-board";
import { cn } from "@/lib/utils";

export const metadata = { title: "มอบหมายงาน" };

export default async function TeacherAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }> | { classId?: string };
}) {
  const { teacher } = await requireTeacherProfile();
  const [assignments, classes] = await Promise.all([
    listTeacherAssignments(teacher.id),
    teacherClasses(teacher.id),
  ]);

  const params = await searchParams;
  const selectedClassId = params.classId ?? classes[0]?.id ?? "";

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
    <div className="space-y-4">
      <PageHeader
        title="มอบหมายงาน"
        description="สร้างงาน/การบ้านให้นักเรียน แนบรูป/PDF กำหนดส่ง และติดตามความคืบหน้าแยกตามห้อง"
      >
        <AssignmentCreateDialog
          classes={classes}
          studentsByClass={studentsByClass}
          defaultClassId={selectedClassId}
        />
      </PageHeader>

      {classes.length > 1 && (
        <nav className="flex flex-wrap gap-2">
          {classes.map((c) => {
            const active = c.id === selectedClassId;
            return (
              <Link
                key={c.id}
                href={`/teacher/assignments?classId=${c.id}`}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:bg-muted",
                )}
              >
                {c.className}
              </Link>
            );
          })}
        </nav>
      )}

      <TeacherAssignmentsBoard assignments={assignments} classId={selectedClassId} />
    </div>
  );
}
