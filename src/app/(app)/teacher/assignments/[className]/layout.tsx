import Link from "next/link";
import { requireTeacherProfile } from "@/lib/auth";
import { teacherClasses } from "@/server/services/assignment.service";
import { cn } from "@/lib/utils";

export default async function TeacherAssignmentsClassLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ className: string }> | { className: string };
}) {
  const { teacher } = await requireTeacherProfile();
  const className = decodeURIComponent((await params).className);
  const classes = await teacherClasses(teacher.id);
  const classNames = classes.map((c) => c.className).sort();

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2">
        {classNames.map((name) => {
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
      {children}
    </div>
  );
}
