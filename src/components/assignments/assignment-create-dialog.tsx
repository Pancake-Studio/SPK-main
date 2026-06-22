"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FileUpload } from "@/components/attachments/file-upload";
import type { AttachmentMeta } from "@/lib/attachment";
import { createAssignmentAction } from "@/server/actions/assignment.actions";

type StudentOpt = { id: string; name: string; title: string | null; rollNumber: number | null };

export function AssignmentCreateDialog({
  classes,
  studentsByClass,
}: {
  classes: { id: string; className: string }[];
  studentsByClass: Record<string, StudentOpt[]>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [classId, setClassId] = React.useState(classes[0]?.id ?? "");
  const [dueAt, setDueAt] = React.useState("");
  const [mode, setMode] = React.useState<"all" | "some">("all");
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [attachments, setAttachments] = React.useState<AttachmentMeta[]>([]);

  const students = studentsByClass[classId] ?? [];

  function reset() {
    setTitle("");
    setDetails("");
    setDueAt("");
    setMode("all");
    setPicked(new Set());
    setAttachments([]);
  }

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSubmit() {
    if (!title.trim()) {
      toast.error("กรอกหัวข้องาน");
      return;
    }
    if (!classId) {
      toast.error("เลือกห้องเรียน");
      return;
    }
    const studentIds = mode === "some" ? [...picked] : undefined;
    if (mode === "some" && (!studentIds || studentIds.length === 0)) {
      toast.error("เลือกนักเรียนอย่างน้อย 1 คน");
      return;
    }
    startTransition(async () => {
      const res = await createAssignmentAction({
        title: title.trim(),
        details: details.trim() || undefined,
        classId,
        dueAt: dueAt || undefined,
        studentIds,
        attachmentIds: attachments.map((a) => a.id),
      });
      if (res.ok) {
        toast.success(res.message ?? "มอบหมายงานแล้ว");
        setOpen(false);
        reset();
        router.refresh();
      } else {
        toast.error(res.error ?? "ไม่สำเร็จ");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus />
          มอบหมายงาน
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>มอบหมายงานใหม่</DialogTitle>
          <DialogDescription>สร้างงานให้นักเรียนทั้งห้องหรือเลือกเป็นรายคน แนบรูป/PDF และกำหนดส่งได้</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="a-title">หัวข้องาน *</Label>
            <Input id="a-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น แบบฝึกหัดบทที่ 3" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="a-details">รายละเอียด</Label>
            <Textarea
              id="a-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              placeholder="คำอธิบายงาน เงื่อนไข ฯลฯ"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="a-class">ห้องเรียน *</Label>
              <select
                id="a-class"
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setPicked(new Set());
                }}
                className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.className}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-due">กำหนดส่ง</Label>
              <Input id="a-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>มอบหมายให้</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("all")}
                className={cn(
                  "flex-1 rounded-md border px-3 py-2 text-sm",
                  mode === "all" ? "border-primary bg-secondary text-primary" : "border-border text-muted-foreground",
                )}
              >
                ทั้งห้อง ({students.length} คน)
              </button>
              <button
                type="button"
                onClick={() => setMode("some")}
                className={cn(
                  "flex-1 rounded-md border px-3 py-2 text-sm",
                  mode === "some" ? "border-primary bg-secondary text-primary" : "border-border text-muted-foreground",
                )}
              >
                เลือกรายคน {mode === "some" && `(${picked.size})`}
              </button>
            </div>
            {mode === "some" && (
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {students.length === 0 ? (
                  <p className="px-1 py-2 text-sm text-muted-foreground">ไม่มีนักเรียนในห้องนี้</p>
                ) : (
                  students.map((s) => (
                    <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                      <input type="checkbox" checked={picked.has(s.id)} onChange={() => togglePick(s.id)} className="size-4" />
                      <span className="w-8 shrink-0 text-center font-semibold text-muted-foreground">
                        {s.rollNumber ?? "–"}
                      </span>
                      <span>{s.title ? `${s.title} ` : ""}{s.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>ไฟล์แนบ (รูป/PDF)</Label>
            <FileUpload attachments={attachments} onChange={setAttachments} />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">ยกเลิก</Button>
          </DialogClose>
          <Button type="button" onClick={onSubmit} loading={pending}>มอบหมายงาน</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
