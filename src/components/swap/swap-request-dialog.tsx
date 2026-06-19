"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSwapAction } from "@/server/actions/swap.actions";
import { initialActionState } from "@/server/actions/_helpers";
import { dayMeta, type TimetableSlot } from "@/lib/timetable";

export type SwapTeacher = { id: string; name: string; slots: TimetableSlot[] };

function slotLabel(s: TimetableSlot) {
  return `${dayMeta(s.day)?.labelTh ?? s.day} · คาบ ${s.period} · ${s.subjectName} (${s.className})`;
}

export function SwapRequestDialog({
  mySlots,
  teachers,
  triggerClassName,
}: {
  mySlots: TimetableSlot[];
  teachers: SwapTeacher[];
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [sourceId, setSourceId] = React.useState("");
  const [teacherId, setTeacherId] = React.useState("");
  const [targetId, setTargetId] = React.useState("");
  const [state, formAction, pending] = useActionState(
    createSwapAction,
    initialActionState,
  );

  const targetTeacher = teachers.find((t) => t.id === teacherId);

  React.useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "ส่งคำขอแลกคาบแล้ว");
      setOpen(false);
      setSourceId("");
      setTeacherId("");
      setTargetId("");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={triggerClassName}>
          <ArrowLeftRight />
          ขอแลกคาบสอน
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>ขอแลกคาบสอน</DialogTitle>
          <DialogDescription>
            เลือกคาบของคุณ และคาบของครูที่ต้องการแลก ระบบจะส่งคำขอไปให้ครูอีกฝ่ายอนุมัติ
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="sourceScheduleId" value={sourceId} />
          <input type="hidden" name="targetScheduleId" value={targetId} />

          <div className="space-y-1.5">
            <Label>คาบของคุณ</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกคาบที่ต้องการแลก" />
              </SelectTrigger>
              <SelectContent>
                {mySlots.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {slotLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>ครูที่ต้องการแลก</Label>
              <Select
                value={teacherId}
                onValueChange={(v) => {
                  setTeacherId(v);
                  setTargetId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกครู" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>คาบของครูเป้าหมาย</Label>
              <Select
                value={targetId}
                onValueChange={setTargetId}
                disabled={!targetTeacher}
              >
                <SelectTrigger>
                  <SelectValue placeholder={targetTeacher ? "เลือกคาบ" : "เลือกครูก่อน"} />
                </SelectTrigger>
                <SelectContent>
                  {targetTeacher?.slots.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {slotLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">เหตุผล (ไม่บังคับ)</Label>
            <Textarea
              id="reason"
              name="reason"
              placeholder="เช่น ติดประชุม / ลากิจ ฯลฯ"
              maxLength={500}
            />
          </div>

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                ยกเลิก
              </Button>
            </DialogClose>
            <Button type="submit" loading={pending} disabled={!sourceId || !targetId}>
              ส่งคำขอ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
