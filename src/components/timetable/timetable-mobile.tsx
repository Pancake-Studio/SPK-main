"use client";

import * as React from "react";
import { MapPin, User } from "lucide-react";
import { DAYS, type DayKey } from "@/lib/constants";
import {
  DEFAULT_BELL_SLOTS,
  classSlots,
  currentSlot,
  type BellSlotData,
} from "@/lib/bell-schedule";
import { buildGrid, dayKeyForDate, type SlotMark, type TimetableSlot } from "@/lib/timetable";
import { cn } from "@/lib/utils";

/**
 * Mobile-friendly timetable: each day is a stacked card with its lessons listed
 * top-to-bottom (no horizontal scrolling). Today's card is opened/expanded and
 * the current period is highlighted. Used on small screens; the wide grid takes
 * over from `md` up.
 */
export function TimetableMobile({
  slots,
  bellSlots = DEFAULT_BELL_SLOTS,
  variant = "class",
  marks,
  dayRemap,
  highlightCurrent = true,
}: {
  slots: TimetableSlot[];
  bellSlots?: BellSlotData[];
  variant?: "teacher" | "class";
  marks?: Record<string, SlotMark>;
  dayRemap?: Partial<Record<DayKey, DayKey>>;
  highlightCurrent?: boolean;
}) {
  const grid = React.useMemo(() => buildGrid(slots), [slots]);
  const periods = React.useMemo(() => classSlots(bellSlots), [bellSlots]);

  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const today = now ? dayKeyForDate(now) : null;
  const curSlotId = now && highlightCurrent ? currentSlot(bellSlots, now)?.id ?? null : null;

  const [open, setOpen] = React.useState<DayKey | null>(null);
  // Default the open day to today (once we know it), but let the user override.
  const effectiveOpen = open ?? today ?? "MON";

  return (
    <div className="space-y-2.5">
      {DAYS.map((d) => {
        const sourceDay = dayRemap?.[d.key] ?? d.key;
        const from = dayRemap?.[d.key];
        const fromLabel = from ? DAYS.find((x) => x.key === from)?.labelTh : null;
        const isToday = today === d.key;
        const isOpen = effectiveOpen === d.key;

        const lessons = periods
          .map((bell) => ({ bell, slot: grid[sourceDay]?.[bell.periodNumber!] }))
          .filter((x) => x.slot);

        return (
          <div
            key={d.key}
            className={cn(
              "overflow-hidden rounded-xl border bg-card",
              isToday ? "border-primary/40" : "border-border",
            )}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? ("__none__" as DayKey) : d.key)}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-4 py-3 text-left",
                isToday && "bg-secondary/50",
              )}
            >
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{d.labelTh}</span>
                {isToday && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                    วันนี้
                  </span>
                )}
                {fromLabel && (
                  <span className="rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-medium text-amber-950">
                    สลับ · {fromLabel}
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {lessons.length > 0 ? `${lessons.length} คาบ` : "ว่าง"}
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-border">
                {lessons.length === 0 ? (
                  <p className="px-4 py-4 text-center text-sm text-muted-foreground">ไม่มีคาบเรียนในวันนี้</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {lessons.map(({ bell, slot }) => {
                      const mark = slot ? marks?.[slot.id] : undefined;
                      const isNow = isToday && curSlotId === bell.id;
                      return (
                        <li
                          key={bell.id}
                          className={cn("flex items-stretch gap-3 px-3 py-2.5", isNow && "bg-tt-current/30")}
                        >
                          <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-md bg-muted/50 py-1">
                            <span className="text-[10px] text-muted-foreground">คาบ</span>
                            <span className="text-base font-bold leading-none text-foreground">{bell.periodNumber}</span>
                            <span className="mt-0.5 text-[9px] text-muted-foreground">{bell.startTime}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: slot!.colorHex ?? "var(--color-primary)" }}
                              />
                              <span className="truncate font-semibold text-foreground">{slot!.subjectName}</span>
                            </div>
                            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                              {slot!.activity ? (
                                <span className="font-medium">กิจกรรม · ทุกห้อง</span>
                              ) : (() => {
                                // Class view hides the teacher for multi-teacher subjects.
                                const who = variant === "teacher" ? slot!.className : slot!.hideTeacher ? null : slot!.teacherName;
                                return who ? (
                                  <>
                                    <User className="size-3" />
                                    {who}
                                  </>
                                ) : null;
                              })()}
                              {!slot!.activity && slot!.room && (
                                <>
                                  <MapPin className="ml-1 size-3" />
                                  {slot!.room}
                                </>
                              )}
                            </p>
                            {mark && (
                              <span
                                className={cn(
                                  "mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                  mark.tone === "swap" ? "bg-amber-400/90 text-amber-950" : "bg-violet-400/90 text-violet-950",
                                )}
                              >
                                {mark.label}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
