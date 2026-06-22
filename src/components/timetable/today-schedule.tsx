import { CalendarOff } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { slotsForDay, periodMeta, type TimetableSlot } from "@/lib/timetable";
import { DEFAULT_BELL_SLOTS, type BellSlotData } from "@/lib/bell-schedule";
import type { DayKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Simple vertical list of a single day's lessons (server-renderable). */
export function TodaySchedule({
  slots,
  day,
  variant = "class",
  currentPeriod,
  bellSlots = DEFAULT_BELL_SLOTS,
}: {
  slots: TimetableSlot[];
  day: DayKey | null;
  variant?: "teacher" | "class";
  currentPeriod?: number | null;
  bellSlots?: BellSlotData[];
}) {
  if (!day) {
    return (
      <EmptyState
        icon={CalendarOff}
        title="วันนี้เป็นวันหยุด"
        description="ไม่มีคาบเรียนในวันเสาร์-อาทิตย์"
      />
    );
  }

  const list = slotsForDay(slots, day);
  if (list.length === 0) {
    return (
      <EmptyState
        icon={CalendarOff}
        title="ไม่มีคาบเรียนวันนี้"
        description="ตารางของวันนี้ว่าง"
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {list.map((s) => {
        const meta = periodMeta(s.period, bellSlots);
        const isNow = currentPeriod === s.period;
        return (
          <li
            key={s.id}
            className={cn(
              "flex items-center gap-4 py-3",
              isNow && "-mx-3 rounded-md bg-tt-current/40 px-3",
            )}
          >
            <div className="w-14 shrink-0 text-center">
              <p className="text-sm font-semibold text-foreground">คาบ {s.period}</p>
              {meta && <p className="text-[11px] text-muted-foreground">{meta.start}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.colorHex ?? "var(--color-primary)" }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{s.subjectName}</p>
              <p className="truncate text-sm text-muted-foreground">
                {variant === "teacher" ? s.className : s.teacherName}
                {s.room ? ` · ${s.room}` : ""}
              </p>
            </div>
            {isNow && (
              <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                ตอนนี้
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
