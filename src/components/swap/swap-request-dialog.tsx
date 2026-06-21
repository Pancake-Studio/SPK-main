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
import { Badge } from "@/components/ui/badge";
import { TimetableGrid } from "@/components/timetable/timetable-grid";
import { createSwapAction } from "@/server/actions/swap.actions";
import { initialActionState } from "@/server/actions/_helpers";
import { dayMeta, type TimetableSlot } from "@/lib/timetable";
import { cn } from "@/lib/utils";

export type SwapTeacher = { id: string; name: string; slots: TimetableSlot[] };

function slotLabel(s: TimetableSlot) {
  return `${dayMeta(s.day)?.labelTh ?? s.day} · คาบ ${s.period} · ${s.subjectCode} ${s.subjectName} (ห้อง ${s.className})`;
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
  const [source, setSource] = React.useState<TimetableSlot | null>(null);
  const [teacherId, setTeacherId] = React.useState("");
  const [target, setTarget] = React.useState<TimetableSlot | null>(null);
  const [state, formAction, pending] = useActionState(
    createSwapAction,
    initialActionState,
  );

  // Same-classroom rule (#2): a target period is only valid if it belongs to the
  // EXACT same classroom (classId) as the source period.
  const isSameClass = React.useCallback(
    (s: TimetableSlot) => Boolean(source) && s.classId === source!.classId,
    [source],
  );

  // Only offer teachers who actually teach the source's classroom.
  const eligibleTeachers = React.useMemo(
    () =>
      source
        ? teachers.filter((t) => t.slots.some((s) => s.classId === source.classId))
        : [],
    [source, teachers],
  );
  const targetTeacher = eligibleTeachers.find((t) => t.id === teacherId) ?? null;

  function reset() {
    setSource(null);
    setTeacherId("");
    setTarget(null);
  }

  React.useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "ส่งคำขอแลกคาบแล้ว");
      setOpen(false);
      reset();
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className={triggerClassName}>
          <ArrowLeftRight />
          ขอแลกคาบสอน
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[860px]">
        <DialogHeader>
          <DialogTitle>ขอแลกคาบสอน</DialogTitle>
          <DialogDescription>
            แตะเลือกคาบของคุณ เลือกครูที่ต้องการแลก แล้วแตะเลือกคาบจากตารางของครูคนนั้น
            (แลกได้เฉพาะคาบของห้องเรียนเดียวกันเท่านั้น)
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="sourceScheduleId" value={source?.id ?? ""} />
          <input type="hidden" name="targetScheduleId" value={target?.id ?? ""} />

          {/* Step 1 — pick your own period from the timetable grid */}
          <div className="space-y-2">
            <Label className="flex flex-wrap items-center gap-2">
              <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                1
              </span>
              เลือกคาบของคุณ
              {source && (
                <Badge variant="secondary" className="font-normal">
                  {slotLabel(source)}
                </Badge>
              )}
            </Label>
            <TimetableGrid
              slots={mySlots}
              variant="teacher"
              interactive
              highlightCurrent={false}
              selectedSlotId={source?.id ?? null}
              onSelectSlot={(s) => {
                setSource(s);
                setTeacherId("");
                setTarget(null);
              }}
            />
          </div>

          {/* Step 2 — choose the teacher to swap with (same classroom only) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full text-[11px] font-bold",
                  source ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                2
              </span>
              เลือกครูที่ต้องการแลก
              {source && (
                <span className="text-xs font-normal text-muted-foreground">
                  (ครูที่สอนห้อง {source.className})
                </span>
              )}
            </Label>
            <Select
              value={teacherId}
              onValueChange={(v) => {
                setTeacherId(v);
                setTarget(null);
              }}
              disabled={!source || eligibleTeachers.length === 0}
            >
              <SelectTrigger className="sm:max-w-sm">
                <SelectValue
                  placeholder={
                    !source
                      ? "เลือกคาบของคุณก่อน"
                      : eligibleTeachers.length === 0
                        ? "ไม่มีครูคนอื่นที่สอนห้องนี้"
                        : "เลือกครู"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {eligibleTeachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 3 — pick a period from that teacher's full schedule */}
          <div className="space-y-2">
            <Label className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full text-[11px] font-bold",
                  targetTeacher ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                3
              </span>
              เลือกคาบจากตารางของครู
              {targetTeacher && (
                <span className="text-xs font-normal text-muted-foreground">
                  {targetTeacher.name} · เลือกได้เฉพาะคาบของห้อง {source?.className}
                </span>
              )}
            </Label>

            {!targetTeacher ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                เลือกครูก่อน เพื่อแสดงตารางสอนทั้งสัปดาห์ของครูคนนั้น
              </p>
            ) : (
              <>
                <TimetableGrid
                  slots={targetTeacher.slots}
                  variant="teacher"
                  interactive
                  highlightCurrent={false}
                  selectedSlotId={target?.id ?? null}
                  onSelectSlot={setTarget}
                  selectableSlot={isSameClass}
                  blockedHint={`แลกไม่ได้: คนละห้อง (ต้องเป็นห้อง ${source?.className})`}
                />
                {target && (
                  <Badge variant="secondary" className="font-normal">
                    เลือกแลกกับ: {slotLabel(target)}
                  </Badge>
                )}
              </>
            )}
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

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                ยกเลิก
              </Button>
            </DialogClose>
            <Button type="submit" loading={pending} disabled={!source || !target}>
              ส่งคำขอ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
