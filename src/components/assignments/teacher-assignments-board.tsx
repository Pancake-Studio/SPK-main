"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronDown, Trash2, Users, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { type TeacherAssignmentView } from "@/server/services/assignment.service";
import { deleteAssignmentAction } from "@/server/actions/assignment.actions";

function fmt(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-xs font-medium text-muted-foreground">
        {done}/{total} ({pct}%)
      </span>
    </div>
  );
}

function AssignmentCard({ a }: { a: TeacherAssignmentView }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!window.confirm(`ลบงาน "${a.title}"? นักเรียนจะไม่เห็นงานนี้อีก`)) return;
    startTransition(async () => {
      const res = await deleteAssignmentAction(a.id);
      if (res.ok) {
        toast.success("ลบงานแล้ว");
        router.refresh();
      } else toast.error("ลบไม่สำเร็จ");
    });
  }

  const due = fmt(a.dueAt);

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{a.title}</p>
          {a.details && <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">{a.details}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {due && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-3.5" /> กำหนดส่ง {due}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" /> {a.total} คน
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          loading={pending}
          className="text-muted-foreground hover:text-destructive"
          aria-label="ลบงาน"
        >
          {!pending && <Trash2 className="size-4" />}
        </Button>
      </div>

      {a.attachments.length > 0 && (
        <div className="mt-3">
          <AttachmentList attachments={a.attachments} />
        </div>
      )}

      <div className="mt-3">
        <ProgressBar done={a.doneCount} total={a.total} />
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        {open ? "ซ่อนรายชื่อ" : "ดูรายชื่อนักเรียน"}
      </button>

      {open && (
        <ul className="mt-2 divide-y divide-border rounded-md border border-border">
          {a.students.map((s) => (
            <li key={s.submissionId} className="flex flex-wrap items-center gap-2 px-3 py-2">
              {s.done ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="w-7 shrink-0 text-center text-xs font-semibold text-muted-foreground">
                {s.rollNumber ?? "–"}
              </span>
              <span className="text-sm text-foreground">
                {s.title ? `${s.title} ` : ""}
                {s.studentName}
              </span>
              <span className={cn("text-xs", s.done ? "text-success" : "text-muted-foreground")}>
                {s.done ? "เสร็จแล้ว" : "ยังไม่เสร็จ"}
              </span>
              {s.attachments.length > 0 && (
                <div className="w-full pl-6">
                  <AttachmentList attachments={s.attachments} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function TeacherAssignmentsBoard({ assignments }: { assignments: TeacherAssignmentView[] }) {
  // Group by class for an orderly, per-classroom layout.
  const groups = React.useMemo(() => {
    const map = new Map<string, TeacherAssignmentView[]>();
    for (const a of assignments) {
      const list = map.get(a.className) ?? [];
      list.push(a);
      map.set(a.className, list);
    }
    return [...map.entries()].sort((x, y) => x[0].localeCompare(y[0]));
  }, [assignments]);

  if (assignments.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        ยังไม่มีงานที่มอบหมาย — กด “มอบหมายงาน” เพื่อเริ่ม
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(([className, list]) => (
        <section key={className}>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary">{className}</span>
            <span className="text-xs font-normal text-muted-foreground">{list.length} งาน</span>
          </h2>
          <div className="space-y-3">
            {list.map((a) => (
              <AssignmentCard key={a.id} a={a} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
