"use client";

import * as React from "react";
import { Coffee, UtensilsCrossed, Sunrise } from "lucide-react";
import { DAYS, type DayKey } from "@/lib/constants";
import {
  DEFAULT_BELL_SLOTS,
  currentSlot,
  isClassKind,
  orderedSlots,
  type BellSlotData,
} from "@/lib/bell-schedule";
import {
  buildGrid,
  dayKeyForDate,
  dayMeta,
  type TimetableSlot,
} from "@/lib/timetable";
import { cn } from "@/lib/utils";

type Variant = "teacher" | "class";

/** Marks a slot as recently swapped (mirrors the server `SwapMark` shape;
 *  redeclared here to avoid importing the server-only swap service). */
export type SwapMarkClient = {
  originalDay: string;
  originalPeriod: number;
  swappedAt: string;
};

export function swapTooltip(m: SwapMarkClient) {
  const d = new Date(m.swappedAt);
  const date = isNaN(d.getTime())
    ? ""
    : ` · เมื่อ ${d.toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`;
  const from = dayMeta(m.originalDay)?.labelTh ?? m.originalDay;
  return `สลับคาบ: เดิมอยู่ ${from} คาบ ${m.originalPeriod}${date}`;
}

const BREAK_ICON: Record<string, typeof Coffee> = {
  HOMEROOM: Sunrise,
  BREAK: Coffee,
  LUNCH: UtensilsCrossed,
};

export function TimetableGrid({
  slots,
  bellSlots = DEFAULT_BELL_SLOTS,
  variant = "class",
  interactive = false,
  selectedSlotId,
  onSelectSlot,
  highlightCurrent = true,
  swapMarks,
  selectableSlot,
  blockedHint,
  dayRemap,
}: {
  slots: TimetableSlot[];
  /** Effective bell schedule (period times + breaks). Defaults to standard. */
  bellSlots?: BellSlotData[];
  variant?: Variant;
  interactive?: boolean;
  selectedSlotId?: string | null;
  onSelectSlot?: (slot: TimetableSlot) => void;
  highlightCurrent?: boolean;
  swapMarks?: Record<string, SwapMarkClient>;
  /** When interactive, only slots for which this returns true are clickable;
   *  others stay visible (full schedule shown) but dimmed/disabled. */
  selectableSlot?: (slot: TimetableSlot) => boolean;
  /** Tooltip shown on a non-selectable slot (e.g. why it can't be swapped). */
  blockedHint?: string;
  /** Whole-day swap for the current week: maps a display weekday → the template
   *  weekday whose lessons should show under it. */
  dayRemap?: Partial<Record<DayKey, DayKey>>;
}) {
  const grid = React.useMemo(() => buildGrid(slots), [slots]);
  const rows = React.useMemo(() => orderedSlots(bellSlots), [bellSlots]);

  // Live "current period" — refresh each minute.
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const today = now ? dayKeyForDate(now) : null;
  const curSlotId =
    now && highlightCurrent ? currentSlot(bellSlots, now)?.id ?? null : null;

  return (
    <div className="overflow-x-auto scrollbar-thin rounded-lg border border-border bg-card">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-20 border-b border-r border-border bg-muted/60 px-2 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              คาบ
            </th>
            {DAYS.map((d) => {
              const from = dayRemap?.[d.key];
              const fromLabel = from ? DAYS.find((x) => x.key === from)?.labelTh : null;
              return (
                <th
                  key={d.key}
                  className={cn(
                    "border-b border-border px-3 py-3 text-sm font-semibold text-foreground",
                    today === d.key && "bg-secondary/50",
                    from && "bg-amber-50 dark:bg-amber-500/10",
                  )}
                >
                  <span className="block">{d.labelTh}</span>
                  {from ? (
                    <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
                      สลับ · ใช้ตาราง{fromLabel}
                    </span>
                  ) : (
                    <span className="text-xs font-normal text-muted-foreground">{d.short}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((bell) => {
            const timeCell = (
              <th
                scope="row"
                className="sticky left-0 z-10 border-b border-r border-border bg-muted/40 px-2 py-2 text-center align-middle"
              >
                {isClassKind(bell.kind) && (
                  <span className="block text-sm font-semibold text-foreground">
                    {bell.periodNumber}
                  </span>
                )}
                <span className="block text-[10px] text-muted-foreground">{bell.startTime}</span>
                <span className="block text-[10px] text-muted-foreground">{bell.endTime}</span>
              </th>
            );

            // Non-teaching rows (home room / break / lunch): one full-width band.
            if (!isClassKind(bell.kind)) {
              const Icon = BREAK_ICON[bell.kind] ?? Coffee;
              const isNow = Boolean(today) && curSlotId === bell.id;
              return (
                <tr key={bell.id}>
                  {timeCell}
                  <td colSpan={DAYS.length} className="border-b border-l border-border p-1.5">
                    <div
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/30 py-2 text-xs font-medium text-muted-foreground",
                        isNow && "border-tt-current-border bg-tt-current text-tt-current-foreground",
                      )}
                    >
                      <Icon className="size-3.5" />
                      <span>{bell.label}</span>
                      <span className="text-[11px] opacity-70">
                        {bell.startTime}–{bell.endTime}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            }

            const period = bell.periodNumber!;
            return (
              <tr key={bell.id}>
                {timeCell}
                {DAYS.map((d) => {
                  const sourceDay = dayRemap?.[d.key] ?? d.key;
                  const slot = grid[sourceDay]?.[period];
                  const isCurrent = today === d.key && curSlotId === bell.id;
                  const isSelected = slot && selectedSlotId === slot.id;
                  const allowed = slot ? !selectableSlot || selectableSlot(slot) : false;
                  const clickable =
                    interactive && Boolean(slot) && Boolean(onSelectSlot) && allowed;
                  const blocked =
                    interactive && Boolean(slot) && Boolean(onSelectSlot) && !allowed;
                  const mark = slot ? swapMarks?.[slot.id] : undefined;

                  return (
                    <td
                      key={d.key}
                      className={cn(
                        "border-b border-l border-border p-1.5 align-top",
                        "h-[84px] min-w-[130px]",
                      )}
                    >
                      {slot ? (
                        <button
                          type="button"
                          disabled={!clickable}
                          onClick={clickable ? () => onSelectSlot!(slot) : undefined}
                          title={blocked ? blockedHint : mark ? swapTooltip(mark) : undefined}
                          className={cn(
                            "flex h-full w-full flex-col rounded-md border px-2.5 py-2 text-left transition-colors",
                            "border-transparent bg-muted/40",
                            isCurrent &&
                              "border-tt-current-border bg-tt-current text-tt-current-foreground",
                            mark &&
                              "border-amber-400/70 bg-amber-50 ring-1 ring-amber-400/50 dark:bg-amber-500/10",
                            isSelected &&
                              "border-primary bg-secondary ring-2 ring-primary/40",
                            clickable && !isSelected && "hover:border-primary/40 hover:bg-secondary/60",
                            blocked && "cursor-not-allowed opacity-40",
                            !clickable && !blocked && "cursor-default",
                          )}
                        >
                          <span className="flex items-center gap-1.5">
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: slot.colorHex ?? "var(--color-primary)" }}
                            />
                            <span className="truncate text-sm font-semibold text-foreground">
                              {slot.subjectName}
                            </span>
                          </span>
                          <span className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                            {slot.subjectCode}
                          </span>
                          <span className="mt-0.5 truncate text-xs text-muted-foreground">
                            {variant === "teacher" ? slot.className : slot.teacherName}
                          </span>
                          {slot.room && (
                            <span className="mt-auto truncate text-[11px] text-muted-foreground">
                              {slot.room}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="mt-1 inline-flex w-fit rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                              ตอนนี้
                            </span>
                          )}
                          {mark && (
                            <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-medium text-amber-950">
                              สลับคาบ
                            </span>
                          )}
                        </button>
                      ) : (
                        <div className="flex h-full items-center justify-center rounded-md bg-tt-free/60 text-xs text-tt-free-foreground">
                          ว่าง
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
