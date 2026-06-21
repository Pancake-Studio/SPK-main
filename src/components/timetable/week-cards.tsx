import { DAYS } from "@/lib/constants";
import { slotsForDay, periodMeta, dayMeta, type TimetableSlot } from "@/lib/timetable";
import { Card } from "@/components/ui/card";
import type { SwapMarkClient } from "./timetable-grid";
import { cn } from "@/lib/utils";

/** Day-by-day card layout for the weekly timetable (mobile-friendly). */
export function WeekCards({
  slots,
  variant = "class",
  swapMarks,
}: {
  slots: TimetableSlot[];
  variant?: "teacher" | "class";
  swapMarks?: Record<string, SwapMarkClient>;
}) {
  return (
    <div className="space-y-4">
      {DAYS.map((d) => {
        const list = slotsForDay(slots, d.key);
        return (
          <Card key={d.key} className="p-4">
            <p className="mb-3 font-semibold text-foreground">
              {d.labelTh}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{d.label}</span>
            </p>
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่มีคาบเรียน</p>
            ) : (
              <ul className="space-y-2">
                {list.map((s) => {
                  const meta = periodMeta(s.period);
                  const mark = swapMarks?.[s.id];
                  return (
                    <li
                      key={s.id}
                      className={cn(
                        "flex items-center gap-3 rounded-md p-2.5",
                        mark
                          ? "bg-amber-50 ring-1 ring-amber-400/50 dark:bg-amber-500/10"
                          : "bg-muted/40",
                      )}
                    >
                      <div className="w-12 shrink-0 text-center">
                        <p className="text-sm font-semibold">{s.period}</p>
                        {meta && <p className="text-[10px] text-muted-foreground">{meta.start}</p>}
                      </div>
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: s.colorHex ?? "var(--color-primary)" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                          {s.subjectName}
                          {mark && (
                            <span className="inline-flex shrink-0 rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-medium text-amber-950">
                              สลับคาบ
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          <span className="font-mono">{s.subjectCode}</span> ·{" "}
                          {variant === "teacher" ? s.className : s.teacherName}
                          {s.room ? ` · ${s.room}` : ""}
                        </p>
                        {mark && (
                          <p className="truncate text-[11px] text-amber-700 dark:text-amber-400">
                            เดิม: {dayMeta(mark.originalDay)?.labelTh ?? mark.originalDay} คาบ{" "}
                            {mark.originalPeriod}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
