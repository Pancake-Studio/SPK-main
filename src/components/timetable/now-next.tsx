"use client";

import * as React from "react";
import { MapPin, User, Clock, CalendarCheck, CalendarOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  buildGrid,
  currentPeriodNo,
  dayKeyForDate,
  periodMeta,
  type TimetableSlot,
} from "@/lib/timetable";
import {
  DEFAULT_BELL_SLOTS,
  nextClassSlot,
  type BellSlotData,
} from "@/lib/bell-schedule";
import type { DayKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Variant = "teacher" | "class";

function SlotCard({
  heading,
  slot,
  variant,
  tone,
  bellSlots,
}: {
  heading: string;
  slot: TimetableSlot | null;
  variant: Variant;
  tone: "current" | "next";
  bellSlots: BellSlotData[];
}) {
  const meta = slot ? periodMeta(slot.period, bellSlots) : null;
  return (
    <Card
      className={cn(
        "p-5",
        tone === "current" && slot && "border-tt-current-border bg-tt-current/40",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {heading}
        </p>
        {tone === "current" ? (
          <CalendarCheck className="size-4 text-primary" />
        ) : (
          <Clock className="size-4 text-muted-foreground" />
        )}
      </div>

      {slot ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: slot.colorHex ?? "var(--color-primary)" }}
            />
            <p className="text-lg font-bold text-foreground">{slot.subjectName}</p>
          </div>
          {(() => {
            // Class view hides the teacher for multi-teacher subjects / activities.
            const who = slot.activity
              ? "ทุกห้อง"
              : variant === "teacher"
                ? slot.className
                : slot.hideTeacher
                  ? null
                  : slot.teacherName;
            return who ? (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="size-3.5" />
                {who}
              </p>
            ) : null;
          })()}
          {!slot.activity && slot.room && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {slot.room}
            </p>
          )}
          {meta && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-3.5" />
              คาบ {slot.period} · {meta.start}–{meta.end}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarOff className="size-4" />
          ไม่มีคาบเรียน
        </div>
      )}
    </Card>
  );
}

export function NowNext({
  slots,
  variant = "class",
  bellSlots = DEFAULT_BELL_SLOTS,
  dayOverride,
}: {
  slots: TimetableSlot[];
  variant?: Variant;
  bellSlots?: BellSlotData[];
  /** Effective weekday for lesson lookup (e.g. after a whole-day swap).
   *  When set, its lessons are shown instead of the real weekday's. */
  dayOverride?: DayKey | null;
}) {
  const grid = React.useMemo(() => buildGrid(slots), [slots]);
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const realToday = now ? dayKeyForDate(now) : null;
  // Which day's lessons to show today (swap-aware when a dayOverride is given).
  const lessonDay = dayOverride !== undefined ? dayOverride : realToday;
  const curP = now ? currentPeriodNo(now, bellSlots) : null;

  const currentSlot = lessonDay && curP ? (grid[lessonDay]?.[curP] ?? null) : null;

  // Next slot today: first class period starting after `now` that has a lesson.
  let nextSlot: TimetableSlot | null = null;
  if (now && realToday && lessonDay) {
    let cursor = now;
    for (let guard = 0; guard < 20; guard++) {
      const cand = nextClassSlot(bellSlots, cursor);
      if (!cand || cand.periodNumber == null) break;
      const lesson = grid[lessonDay]?.[cand.periodNumber];
      if (lesson) {
        nextSlot = lesson;
        break;
      }
      // skip to just after this candidate's start and keep looking
      const [h, m] = cand.startTime.split(":").map(Number);
      cursor = new Date(now);
      cursor.setHours(h ?? 0, (m ?? 0) + 1, 0, 0);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SlotCard heading="คาบปัจจุบัน" slot={currentSlot} variant={variant} tone="current" bellSlots={bellSlots} />
      <SlotCard heading="คาบถัดไป" slot={nextSlot} variant={variant} tone="next" bellSlots={bellSlots} />
    </div>
  );
}
