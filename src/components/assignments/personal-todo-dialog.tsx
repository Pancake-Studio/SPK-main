"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  createPersonalTodoAction,
  updatePersonalTodoAction,
} from "@/server/actions/todo.actions";

/** ISO → "YYYY-MM-DDTHH:mm" in local time for a datetime-local input. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function PersonalTodoDialog({
  mode = "create",
  todo,
}: {
  mode?: "create" | "edit";
  todo?: { id: string; title: string; details: string | null; dueAt: string | null };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(todo?.title ?? "");
  const [details, setDetails] = React.useState(todo?.details ?? "");
  const [dueAt, setDueAt] = React.useState(toLocalInput(todo?.dueAt ?? null));

  function onSubmit() {
    if (!title.trim()) {
      toast.error("กรอกชื่องาน");
      return;
    }
    const input = { title: title.trim(), details: details.trim() || undefined, dueAt: dueAt || undefined };
    startTransition(async () => {
      const res =
        mode === "edit" && todo
          ? await updatePersonalTodoAction(todo.id, input)
          : await createPersonalTodoAction(input);
      if (res.ok) {
        toast.success(res.message ?? "บันทึกแล้ว");
        setOpen(false);
        if (mode === "create") {
          setTitle("");
          setDetails("");
          setDueAt("");
        }
        router.refresh();
      } else {
        toast.error(res.error ?? "ไม่สำเร็จ");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "edit" ? (
          <Button variant="ghost" size="icon-sm" aria-label="แก้ไข">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button variant="secondary">
            <Plus />
            เพิ่มงานของฉัน
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "แก้ไขงานของฉัน" : "เพิ่มงานของฉัน"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-title">ชื่องาน *</Label>
            <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น อ่านหนังสือสอบ" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-details">รายละเอียด</Label>
            <Textarea id="t-details" value={details} onChange={(e) => setDetails(e.target.value)} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-due">กำหนดเสร็จ</Label>
            <Input id="t-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">ยกเลิก</Button>
          </DialogClose>
          <Button type="button" onClick={onSubmit} loading={pending}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
