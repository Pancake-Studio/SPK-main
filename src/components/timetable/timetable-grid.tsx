"use client";

import * as React from "react";
import { DAYS, PERIODS } from "@/lib/constants";
import {
  buildGrid,
  currentPeriodNo,
  dayKeyForDate,
  type TimetableSlot,
} from "@/lib/timetable";
import { cn } from "@/lib/utils";

type Variant = "teacher" | "class";

export function TimetableGrid({
  slots,
  variant = "class",
  interactive = false,
  selectedSlotId,
  onSelectSlot,
  highlightCurrent = true,
}: {
  slots: TimetableSlot[];
  variant?: Variant;
  interactive?: boolean;
  selectedSlotId?: string | null;
  onSelectSlot?: (slot: TimetableSlot) => void;
  highlightCurrent?: boolean;
}) {
  const grid = React.useMemo(() => buildGrid(slots), [slots]);

  // Live "current period" — refresh each minute.
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const today = now ? dayKeyForDate(now) : null;
  const curPeriod = now && highlightCurrent ? currentPeriodNo(now) : null;

  return (
    <div className="overflow-x-auto scrollbar-thin rounded-lg border border-border bg-card">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-20 border-b border-r border-border bg-muted/60 px-2 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              คาบ
            </th>
            {DAYS.map((d) => (
              <th
                key={d.key}
                className={cn(
                  "border-b border-border px-3 py-3 text-sm font-semibold text-foreground",
                  today === d.key && "bg-secondary/50",
                )}
              >
                <span className="block">{d.labelTh}</span>
                <span className="text-xs font-normal text-muted-foreground">{d.short}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERIODS.map((p) => (
            <tr key={p.period}>
              <th
                scope="row"
                className="sticky left-0 z-10 border-b border-r border-border bg-muted/40 px-2 py-2 text-center align-middle"
              >
                <span className="block text-sm font-semibold text-foreground">{p.period}</span>
                <span className="block text-[10px] text-muted-foreground">{p.start}</span>
                <span className="block text-[10px] text-muted-foreground">{p.end}</span>
              </th>
              {DAYS.map((d) => {
                const slot = grid[d.key]?.[p.period];
                const isCurrent = today === d.key && curPeriod === p.period;
                const isSelected = slot && selectedSlotId === slot.id;
                const clickable = interactive && Boolean(slot) && Boolean(onSelectSlot);

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
                        className={cn(
                          "flex h-full w-full flex-col rounded-md border px-2.5 py-2 text-left transition-colors",
                          "border-transparent bg-muted/40",
                          isCurrent &&
                            "border-tt-current-border bg-tt-current text-tt-current-foreground",
                          isSelected &&
                            "border-primary bg-secondary ring-2 ring-primary/40",
                          clickable && !isSelected && "hover:border-primary/40 hover:bg-secondary/60",
                          !clickable && "cursor-default",
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
                        <span className="mt-1 truncate text-xs text-muted-foreground">
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
