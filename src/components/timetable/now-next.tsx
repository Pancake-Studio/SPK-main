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
import { PERIODS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Variant = "teacher" | "class";

function SlotCard({
  heading,
  slot,
  variant,
  tone,
}: {
  heading: string;
  slot: TimetableSlot | null;
  variant: Variant;
  tone: "current" | "next";
}) {
  const meta = slot ? periodMeta(slot.period) : null;
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
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="size-3.5" />
            {variant === "teacher" ? slot.className : slot.teacherName}
          </p>
          {slot.room && (
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
}: {
  slots: TimetableSlot[];
  variant?: Variant;
}) {
  const grid = React.useMemo(() => buildGrid(slots), [slots]);
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const today = now ? dayKeyForDate(now) : null;
  const curP = now ? currentPeriodNo(now) : null;

  const currentSlot = today && curP ? (grid[today]?.[curP] ?? null) : null;

  // Next slot today: first period starting after `now` that has a class.
  let nextSlot: TimetableSlot | null = null;
  if (now && today) {
    const mins = now.getHours() * 60 + now.getMinutes();
    for (const p of PERIODS) {
      const [h, m] = p.start.split(":").map(Number);
      const startMins = (h ?? 0) * 60 + (m ?? 0);
      if (startMins > mins && grid[today]?.[p.period]) {
        nextSlot = grid[today]![p.period]!;
        break;
      }
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SlotCard heading="คาบปัจจุบัน" slot={currentSlot} variant={variant} tone="current" />
      <SlotCard heading="คาบถัดไป" slot={nextSlot} variant={variant} tone="next" />
    </div>
  );
}
