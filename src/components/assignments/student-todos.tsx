"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  CalendarClock,
  Trash2,
  Send,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileUpload } from "@/components/attachments/file-upload";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { PersonalTodoDialog } from "./personal-todo-dialog";
import { type AttachmentMeta } from "@/lib/attachment";
import { type StudentTask } from "@/server/services/todo.service";
import {
  toggleSubmissionAction,
  submitFilesAction,
  removeSubmissionFileAction,
  togglePersonalTodoAction,
  deletePersonalTodoAction,
} from "@/server/actions/todo.actions";

type SortKey = "newest" | "oldest" | "due";

function fmtDue(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function TaskItem({ task, onToggle }: { task: StudentTask; onToggle: (t: StudentTask) => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toSubmit, setToSubmit] = React.useState<AttachmentMeta[]>([]);

  const overdue = task.dueAt && !task.done && new Date(task.dueAt).getTime() < Date.now();

  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, okMsg?: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        if (okMsg) toast.success(okMsg);
        router.refresh();
      } else {
        toast.error(res.error ?? "ไม่สำเร็จ");
      }
    });
  }

  function submit() {
    if (toSubmit.length === 0) return;
    run(async () => {
      const r = await submitFilesAction(task.id, toSubmit.map((a) => a.id));
      if (r.ok) setToSubmit([]);
      return r;
    }, "ส่งงานแล้ว");
  }

  return (
    <Card className={cn("p-4", task.done && "opacity-70")}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggle(task)}
          className="mt-0.5 shrink-0 transition-transform active:scale-90"
          aria-label={task.done ? "ทำเครื่องหมายว่ายังไม่เสร็จ" : "ทำเครื่องหมายว่าเสร็จ"}
        >
          {task.done ? (
            <CheckCircle2 className="size-6 text-success" />
          ) : (
            <Circle className="size-6 text-muted-foreground hover:text-primary" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn("font-semibold text-foreground", task.done && "line-through")}>{task.title}</p>
            {task.kind === "assigned" ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                งานครู · {task.className}
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                ของฉัน
              </span>
            )}
          </div>

          {task.kind === "assigned" && task.teacherName && (
            <p className="mt-0.5 text-xs text-muted-foreground">โดย {task.teacherName}</p>
          )}
          {task.details && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{task.details}</p>
          )}
          {task.dueAt && (
            <p className={cn("mt-1 inline-flex items-center gap-1 text-xs", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
              <CalendarClock className="size-3.5" /> กำหนดส่ง {fmtDue(task.dueAt)}{overdue ? " · เลยกำหนด" : ""}
            </p>
          )}

          {task.teacherAttachments.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">ไฟล์จากครู</p>
              <AttachmentList attachments={task.teacherAttachments} />
            </div>
          )}

          {/* Assigned: submission area */}
          {task.kind === "assigned" && (
            <div className="mt-3 rounded-md border border-dashed border-border p-2.5">
              {task.myAttachments.length > 0 && (
                <div className="mb-2">
                  <p className="mb-1 text-[11px] font-medium text-muted-foreground">ไฟล์ที่ส่งแล้ว</p>
                  <AttachmentList
                    attachments={task.myAttachments}
                    onRemove={(id) => run(() => removeSubmissionFileAction(id))}
                  />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <FileUpload attachments={toSubmit} onChange={setToSubmit} label="แนบไฟล์ส่งงาน" />
                {toSubmit.length > 0 && (
                  <Button size="sm" onClick={submit} loading={pending}>
                    <Send className="size-4" /> ส่งงาน ({toSubmit.length})
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Personal: edit + delete */}
        {task.kind === "personal" && (
          <div className="flex shrink-0 items-center">
            <PersonalTodoDialog mode="edit" todo={{ id: task.id, title: task.title, details: task.details, dueAt: task.dueAt }} />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                if (window.confirm("ลบงานนี้?")) run(() => deletePersonalTodoAction(task.id));
              }}
              className="text-muted-foreground hover:text-destructive"
              aria-label="ลบ"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

const taskKey = (t: StudentTask) => `${t.kind}-${t.id}`;

export function StudentTodos({ tasks }: { tasks: StudentTask[] }) {
  const [sort, setSort] = React.useState<SortKey>("newest");
  // Optimistic "done" overrides keyed by task — the tick flips instantly; the
  // server call runs in the background and we roll back only if it fails.
  const [overrides, setOverrides] = React.useState<Record<string, boolean>>({});

  // Apply optimistic overrides on top of the server-provided tasks.
  const view = React.useMemo(
    () => tasks.map((t) => (taskKey(t) in overrides ? { ...t, done: overrides[taskKey(t)]! } : t)),
    [tasks, overrides],
  );

  const onToggle = React.useCallback((task: StudentTask) => {
    const key = taskKey(task);
    const next = !task.done;
    setOverrides((o) => ({ ...o, [key]: next })); // instant feedback
    const call =
      task.kind === "assigned"
        ? toggleSubmissionAction(task.id, next)
        : togglePersonalTodoAction(task.id, next);
    // These actions resolve on success and throw on failure.
    call
      .then(() => {
        // Drop the override once the server has it (a later refresh reflects it).
        setOverrides((o) => {
          const { [key]: _drop, ...rest } = o;
          return rest;
        });
      })
      .catch(() => {
        setOverrides((o) => ({ ...o, [key]: !next })); // roll back
        toast.error("บันทึกไม่สำเร็จ ลองอีกครั้ง");
      });
  }, []);

  const total = view.length;
  const done = view.filter((t) => t.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const sorted = React.useMemo(() => {
    const arr = [...view];
    if (sort === "due") {
      arr.sort((a, b) => {
        if (!a.dueAt && !b.dueAt) return 0;
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return a.dueAt.localeCompare(b.dueAt);
      });
    } else if (sort === "oldest") {
      arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } else {
      arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    // Unfinished first (stable — keeps the chosen order within each group).
    arr.sort((a, b) => Number(a.done) - Number(b.done));
    return arr;
  }, [view, sort]);

  return (
    <div className="space-y-4">
      {/* Progress + controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-foreground">ความคืบหน้าโดยรวม</p>
          <p className="text-sm font-semibold text-primary">
            {done}/{total} ({pct}%)
          </p>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-success" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <PersonalTodoDialog />
          <label className="inline-flex items-center gap-2 text-sm">
            <ArrowUpDown className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">เรียงตาม</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground"
            >
              <option value="newest">ใหม่สุด (เวลาที่ได้รับ/สร้าง)</option>
              <option value="oldest">เก่าสุด</option>
              <option value="due">ใกล้กำหนดส่งก่อน</option>
            </select>
          </label>
        </div>
      </Card>

      {sorted.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          ยังไม่มีงาน — กด “เพิ่มงานของฉัน” เพื่อสร้าง To-do ของตัวเอง
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((t) => (
            <TaskItem key={`${t.kind}-${t.id}`} task={t} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
