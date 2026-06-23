"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, User, Send, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { TimetableGrid } from "@/components/timetable/timetable-grid";
import { createSwapAction } from "@/server/actions/swap.actions";
import { createDelegationAction } from "@/server/actions/delegation.actions";
import { initialActionState } from "@/server/actions/_helpers";
import { dayMeta, type TimetableSlot } from "@/lib/timetable";
import { DEFAULT_BELL_SLOTS, type BellSlotData } from "@/lib/bell-schedule";
import { toIsoDate, weekStartOf, weekRangeLabel } from "@/lib/day-swap";
import { cn } from "@/lib/utils";

export type SwapTeacher = { id: string; name: string; slots: TimetableSlot[] };
type Mode = "swap" | "delegate";

function slotLabel(s: TimetableSlot) {
  return `${dayMeta(s.day)?.labelTh ?? s.day} · คาบ ${s.period} · ${s.subjectName} (ห้อง ${s.className})`;
}

const STEP_LABELS: Record<Mode, readonly string[]> = {
  swap: ["เลือกสัปดาห์", "เลือกคาบของคุณ", "เลือกครู", "เลือกคาบของครู", "ยืนยัน"],
  delegate: ["เลือกสัปดาห์", "เลือกคาบของคุณ", "เลือกครูที่ว่าง", "ยืนยัน"],
};

function Stepper({ steps, step }: { steps: readonly string[]; step: number }) {
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <li key={label} className="flex items-center gap-1">
            <span
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap",
                active && "bg-primary text-primary-foreground",
                done && "bg-secondary text-primary",
                !active && !done && "bg-muted text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full text-[11px] font-bold",
                  active ? "bg-primary-foreground text-primary" : done ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : n}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </span>
            {n < steps.length && <span className="h-px w-4 shrink-0 bg-border sm:w-8" />}
          </li>
        );
      })}
    </ol>
  );
}

export function SwapWizard({
  mode = "swap",
  mySlots,
  teachers,
  bellSlots = DEFAULT_BELL_SLOTS,
}: {
  mode?: Mode;
  mySlots: TimetableSlot[];
  teachers: SwapTeacher[];
  bellSlots?: BellSlotData[];
}) {
  const isSwap = mode === "swap";
  const router = useRouter();
  const steps = STEP_LABELS[mode];
  const lastStep = steps.length;

  const [step, setStep] = React.useState(1);
  const [weekDate, setWeekDate] = React.useState(() => toIsoDate(new Date()));
  const [source, setSource] = React.useState<TimetableSlot | null>(null);
  const [teacherId, setTeacherId] = React.useState("");
  const [target, setTarget] = React.useState<TimetableSlot | null>(null);
  const [state, formAction, pending] = useActionState(
    isSwap ? createSwapAction : createDelegationAction,
    initialActionState,
  );

  const isSameClass = React.useCallback(
    (s: TimetableSlot) => Boolean(source) && s.classId === source!.classId,
    [source],
  );
  // My own busy (day|period) set — to enforce "I must be free at the swap target".
  const myBusy = React.useMemo(
    () => new Set(mySlots.map((s) => `${s.day}|${s.period}`)),
    [mySlots],
  );

  // Eligible teachers depend on the mode:
  //  - swap: free at my period's time AND has at least ONE period in my class at a
  //    time I'm free to take (i.e. a period that can actually be swapped). Teachers
  //    whose periods all clash with my timetable are hidden.
  //  - delegate: ANY teacher who is free at my period's time.
  const eligibleTeachers = React.useMemo(() => {
    if (!source) return [];
    return teachers.filter((t) => {
      const freeAtSource = !t.slots.some((s) => s.day === source.day && s.period === source.period);
      if (!freeAtSource) return false;
      if (isSwap) {
        return t.slots.some(
          (s) => s.classId === source.classId && !myBusy.has(`${s.day}|${s.period}`),
        );
      }
      return true;
    });
  }, [source, teachers, isSwap, myBusy]);

  const targetTeacher = eligibleTeachers.find((t) => t.id === teacherId) ?? null;

  React.useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "ดำเนินการเรียบร้อยแล้ว");
      router.push(isSwap ? "/teacher/swaps" : "/teacher/delegations");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router, isSwap]);

  // Per-step "can go next" gate.
  const canNext = (() => {
    if (step === 1) return Boolean(weekDate);
    if (step === 2) return Boolean(source);
    if (isSwap) {
      if (step === 3) return Boolean(targetTeacher);
      if (step === 4) return Boolean(target);
    } else if (step === 3) {
      return Boolean(targetTeacher);
    }
    return true;
  })();

  const weekStart = weekStartOf(weekDate);
  const cancelHref = isSwap ? "/teacher/swaps" : "/teacher/delegations";

  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-5">
        <Stepper steps={steps} step={step} />
      </div>

      {/* Step 1 — pick the week */}
      {step === 1 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">เลือกสัปดาห์ที่ต้องการ{isSwap ? "แลกคาบ" : "ฝากคาบ"}</h2>
            <p className="text-sm text-muted-foreground">
              {isSwap ? "การแลกคาบ" : "การฝากคาบ"}นี้มีผล <span className="font-medium text-foreground">เฉพาะสัปดาห์ที่เลือก</span> เท่านั้น
              จากนั้นตารางจะกลับเป็นปกติ
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weekDate">วันที่ในสัปดาห์นั้น</Label>
            <input
              id="weekDate"
              type="date"
              value={weekDate}
              min={toIsoDate(new Date())}
              onChange={(e) => setWeekDate(e.target.value)}
              className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          {weekDate && (
            <p className="flex items-center gap-2 rounded-md bg-secondary/60 px-3 py-2 text-sm text-primary">
              <CalendarRange className="size-4" />
              สัปดาห์ที่เลือก: {weekRangeLabel(weekStart)}
            </p>
          )}
        </div>
      )}

      {/* Step 2 — pick your own period */}
      {step === 2 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">เลือกคาบของคุณ</h2>
            <p className="text-sm text-muted-foreground">
              แตะเลือกคาบที่ต้องการ{isSwap ? "แลก" : "ฝาก"}จากตารางสอนของคุณ
            </p>
          </div>
          <TimetableGrid
            slots={mySlots}
            variant="teacher"
            bellSlots={bellSlots}
            emptyCell="blank"
            interactive
            highlightCurrent={false}
            selectedSlotId={source?.id ?? null}
            onSelectSlot={(s) => {
              setSource(s);
              setTeacherId("");
              setTarget(null);
            }}
          />
          {source && (
            <p className="rounded-md bg-secondary/60 px-3 py-2 text-sm text-primary">
              เลือกแล้ว: {slotLabel(source)}
            </p>
          )}
        </div>
      )}

      {/* Step 3 — pick a teacher */}
      {step === 3 && source && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isSwap ? "เลือกครูที่ต้องการแลก" : "เลือกครูที่จะมาคุมแทน"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSwap
                ? `แสดงเฉพาะครูที่สอนห้อง ${source.className} และว่างใน${dayMeta(source.day)?.labelTh} คาบ ${source.period}`
                : `แสดงเฉพาะครูที่ว่างใน${dayMeta(source.day)?.labelTh} คาบ ${source.period}`}
            </p>
          </div>
          {eligibleTeachers.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              {isSwap ? "ไม่มีครูที่สามารถแลกคาบนี้ได้" : "ไม่มีครูที่ว่างในคาบนี้"}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {eligibleTeachers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTeacherId(t.id);
                    setTarget(null);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                    teacherId === t.id ? "border-primary bg-secondary ring-2 ring-primary/30" : "border-border hover:border-primary/40 hover:bg-muted/50",
                  )}
                >
                  <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                    <User className="size-5" />
                  </span>
                  <span className="font-medium text-foreground">{t.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 4 (swap only) — pick the teacher's period */}
      {isSwap && step === 4 && source && targetTeacher && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">เลือกคาบจากตารางของ {targetTeacher.name}</h2>
            <p className="text-sm text-muted-foreground">
              เลือกได้เฉพาะคาบของห้อง {source.className} ที่คุณว่างในเวลานั้น
            </p>
          </div>
          <TimetableGrid
            slots={targetTeacher.slots}
            variant="teacher"
            bellSlots={bellSlots}
            emptyCell="blank"
            interactive
            highlightCurrent={false}
            selectedSlotId={target?.id ?? null}
            onSelectSlot={setTarget}
            selectableSlot={(s) => isSameClass(s) && !myBusy.has(`${s.day}|${s.period}`)}
            blockedHint={`เลือกได้เฉพาะคาบห้อง ${source.className} ที่คุณว่าง`}
          />
          {target && (
            <p className="rounded-md bg-secondary/60 px-3 py-2 text-sm text-primary">
              เลือกแลกกับ: {slotLabel(target)}
            </p>
          )}
        </div>
      )}

      {/* Final step — confirm + reason + submit */}
      {step === lastStep && source && targetTeacher && (!isSwap || target) && (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="weekDate" value={weekDate} />
          {isSwap ? (
            <>
              <input type="hidden" name="sourceScheduleId" value={source.id} />
              <input type="hidden" name="targetScheduleId" value={target!.id} />
            </>
          ) : (
            <>
              <input type="hidden" name="scheduleId" value={source.id} />
              <input type="hidden" name="toTeacherId" value={targetTeacher.id} />
            </>
          )}

          <h2 className="text-lg font-semibold text-foreground">
            {isSwap ? "ยืนยันการแลกคาบ" : "ยืนยันการฝากคาบ"}
          </h2>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarRange className="size-4" /> เฉพาะสัปดาห์ {weekRangeLabel(weekStart)}
          </p>

          {isSwap ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">คาบของคุณ</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">{slotLabel(source)}</p>
              </div>
              <ArrowRight className="mx-auto hidden size-5 text-muted-foreground sm:block" />
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">แลกกับ ({targetTeacher.name})</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">{slotLabel(target!)}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">ฝากคาบ</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{slotLabel(source)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                ให้ <span className="font-medium text-foreground">{targetTeacher.name}</span> มาคุมแทน
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reason">เหตุผล (ไม่บังคับ)</Label>
            <Textarea id="reason" name="reason" placeholder="เช่น ติดประชุม / ลากิจ ฯลฯ" maxLength={500} />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="size-4" /> ย้อนกลับ
            </Button>
            <Button type="submit" loading={pending}>
              <Send className="size-4" /> {isSwap ? "ส่งคำขอ" : "ยืนยันฝากคาบ"}
            </Button>
          </div>
        </form>
      )}

      {/* Footer nav (all but the final step) */}
      {step < lastStep && (
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          {step === 1 ? (
            <Button asChild variant="outline">
              <Link href={cancelHref}>
                <ArrowLeft className="size-4" /> ยกเลิก
              </Link>
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="size-4" /> ย้อนกลับ
            </Button>
          )}
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            ถัดไป <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </Card>
  );
}
