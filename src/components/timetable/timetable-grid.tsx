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
  type SlotMark,
  type TimetableSlot,
} from "@/lib/timetable";
import { TimetableMobile } from "@/components/timetable/timetable-mobile";
import { cn } from "@/lib/utils";

type Variant = "teacher" | "class";

const BREAK_ICON: Record<string, typeof Coffee> = {
  HOMEROOM: Sunrise,
  BREAK: Coffee,
  LUNCH: UtensilsCrossed,
};

/**
 * Weekly timetable — **days as rows, periods (bell slots) as columns**.
 * Clear grid borders on every cell; empty teaching cells show "คาบว่าง"
 * (or stay blank when `emptyCell="blank"`, e.g. on the swap picker).
 */
export function TimetableGrid({
  slots,
  bellSlots = DEFAULT_BELL_SLOTS,
  variant = "class",
  interactive = false,
  selectedSlotId,
  onSelectSlot,
  highlightCurrent = true,
  marks,
  selectableSlot,
  blockedHint,
  dayRemap,
  emptyCell = "free",
}: {
  slots: TimetableSlot[];
  bellSlots?: BellSlotData[];
  variant?: Variant;
  interactive?: boolean;
  selectedSlotId?: string | null;
  onSelectSlot?: (slot: TimetableSlot) => void;
  highlightCurrent?: boolean;
  /** Per-slot badge annotations (week swap / delegation), keyed by schedule id. */
  marks?: Record<string, SlotMark>;
  selectableSlot?: (slot: TimetableSlot) => boolean;
  blockedHint?: string;
  dayRemap?: Partial<Record<DayKey, DayKey>>;
  /** How to render an empty teaching cell. "free" → "คาบว่าง"; "blank" → nothing. */
  emptyCell?: "free" | "blank";
}) {
  const grid = React.useMemo(() => buildGrid(slots), [slots]);
  const cols = React.useMemo(() => orderedSlots(bellSlots), [bellSlots]);

  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const today = now ? dayKeyForDate(now) : null;
  const curSlotId = now && highlightCurrent ? currentSlot(bellSlots, now)?.id ?? null : null;

  const cellBorder = "border border-border";

  const table = (
    <div className="overflow-x-auto scrollbar-thin rounded-lg border border-border bg-card">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead>
          <tr>
            <th
              className={cn(
                cellBorder,
                "sticky left-0 z-10 w-24 bg-muted/70 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
              )}
            >
              วัน \ คาบ
            </th>
            {cols.map((bell) => {
              const isClass = isClassKind(bell.kind);
              const Icon = BREAK_ICON[bell.kind] ?? Coffee;
              return (
                <th
                  key={bell.id}
                  className={cn(
                    cellBorder,
                    "px-2 py-2 text-center align-middle",
                    isClass ? "min-w-[120px] bg-muted/40" : "min-w-[64px] bg-muted/20",
                  )}
                >
                  {isClass ? (
                    <span className="block text-sm font-bold text-foreground">{bell.periodNumber}</span>
                  ) : (
                    <span className="mx-auto flex w-fit items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      <Icon className="size-3.5" />
                      {bell.label}
                    </span>
                  )}
                  <span className="block text-[10px] text-muted-foreground">
                    {bell.startTime}–{bell.endTime}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((d) => {
            const sourceDay = dayRemap?.[d.key] ?? d.key;
            const from = dayRemap?.[d.key];
            const fromLabel = from ? DAYS.find((x) => x.key === from)?.labelTh : null;
            const isToday = today === d.key;

            return (
              <tr key={d.key}>
                <th
                  scope="row"
                  className={cn(
                    cellBorder,
                    "sticky left-0 z-10 px-2 py-2 text-center align-middle",
                    isToday ? "bg-secondary/60" : "bg-muted/40",
                    from && "bg-amber-50 dark:bg-amber-500/10",
                  )}
                >
                  <span className="block text-sm font-semibold text-foreground">{d.labelTh}</span>
                  {from ? (
                    <span className="block text-[10px] font-medium text-amber-700 dark:text-amber-400">
                      สลับ · {fromLabel}
                    </span>
                  ) : (
                    <span className="block text-[10px] font-normal text-muted-foreground">{d.short}</span>
                  )}
                </th>

                {cols.map((bell) => {
                  // Non-teaching column (home room / break / lunch).
                  if (!isClassKind(bell.kind)) {
                    const isNow = isToday && curSlotId === bell.id;
                    return (
                      <td
                        key={bell.id}
                        className={cn(
                          cellBorder,
                          "p-0 text-center align-middle",
                          isNow ? "bg-tt-current/60" : "bg-muted/15",
                        )}
                      >
                        <span className="text-[10px] text-muted-foreground/60">·</span>
                      </td>
                    );
                  }

                  const period = bell.periodNumber!;
                  const slot = grid[sourceDay]?.[period];
                  const isCurrent = isToday && curSlotId === bell.id;
                  const isSelected = slot && selectedSlotId === slot.id;
                  const allowed = slot ? !selectableSlot || selectableSlot(slot) : false;
                  const clickable = interactive && Boolean(slot) && Boolean(onSelectSlot) && allowed;
                  const blocked = interactive && Boolean(slot) && Boolean(onSelectSlot) && !allowed;
                  const mark = slot ? marks?.[slot.id] : undefined;
                  const markSwap = mark?.tone === "swap";
                  const markDelegate = mark?.tone === "delegate";

                  return (
                    <td
                      key={bell.id}
                      className={cn(cellBorder, "h-[76px] min-w-[120px] p-1 align-top", isCurrent && "bg-tt-current/30")}
                    >
                      {slot ? (
                        <button
                          type="button"
                          disabled={!clickable}
                          onClick={clickable ? () => onSelectSlot!(slot) : undefined}
                          title={blocked ? blockedHint : mark?.tooltip}
                          className={cn(
                            "flex h-full w-full flex-col rounded-md border px-2 py-1.5 text-left transition-colors",
                            "border-transparent bg-muted/40",
                            isCurrent && "border-tt-current-border bg-tt-current text-tt-current-foreground",
                            markSwap && "border-amber-400/70 bg-amber-50 ring-1 ring-amber-400/50 dark:bg-amber-500/10",
                            markDelegate && "border-violet-400/70 bg-violet-50 ring-1 ring-violet-400/50 dark:bg-violet-500/10",
                            isSelected && "border-primary bg-secondary ring-2 ring-primary/40",
                            clickable && !isSelected && "hover:border-primary/40 hover:bg-secondary/60",
                            blocked && "cursor-not-allowed opacity-40",
                            !clickable && !blocked && "cursor-default",
                          )}
                        >
                          <span className="flex items-center gap-1">
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: slot.colorHex ?? "var(--color-primary)" }}
                            />
                            <span className="truncate text-[13px] font-semibold text-foreground">
                              {slot.subjectName}
                            </span>
                          </span>
                          <span className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {variant === "teacher" ? slot.className : slot.teacherName}
                          </span>
                          {slot.room && (
                            <span className="mt-auto truncate text-[10px] text-muted-foreground">{slot.room}</span>
                          )}
                          {mark && (
                            <span
                              className={cn(
                                "mt-0.5 inline-flex w-fit rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                                markSwap && "bg-amber-400/90 text-amber-950",
                                markDelegate && "bg-violet-400/90 text-violet-950",
                              )}
                            >
                              {mark.label}
                            </span>
                          )}
                        </button>
                      ) : emptyCell === "free" ? (
                        <div className="flex h-full items-center justify-center rounded-md bg-tt-free/50 text-[11px] text-tt-free-foreground">
                          คาบว่าง
                        </div>
                      ) : (
                        <div className="h-full" />
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

  // Picking flows (wizard) keep the wide grid. For plain display, small screens
  // get the easy-to-read stacked day view instead of a horizontally-scrolling table.
  if (interactive) return table;
  return (
    <>
      <div className="md:hidden">
        <TimetableMobile
          slots={slots}
          bellSlots={bellSlots}
          variant={variant}
          marks={marks}
          dayRemap={dayRemap}
          highlightCurrent={highlightCurrent}
        />
      </div>
      <div className="hidden md:block">{table}</div>
    </>
  );
}
