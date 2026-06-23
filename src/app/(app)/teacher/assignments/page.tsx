import { redirect } from "next/navigation";
import { requireTeacherProfile } from "@/lib/auth";
import { teacherClasses } from "@/server/services/assignment.service";

export const metadata = { title: "มอบหมายงาน" };

function baseName(className: string) {
  return className.replace(/\.\d+$/, "");
}

export default async function TeacherAssignmentsIndexPage() {
  const { teacher } = await requireTeacherProfile();
  const classes = await teacherClasses(teacher.id);
  const baseGroups = Array.from(new Set(classes.map((c) => baseName(c.className)))).sort();
  const first = baseGroups[0] ?? classes[0]?.className;
  if (!first) {
    // No classes available; fall back to an empty state page.
    return (
      <div className="rounded-lg border border-border p-10 text-center text-muted-foreground">
        ยังไม่มีห้องเรียนที่สอน จึงยังไม่สามารถมอบหมายงานได้
      </div>
    );
  }
  redirect(`/teacher/assignments/${encodeURIComponent(first)}`);
}
