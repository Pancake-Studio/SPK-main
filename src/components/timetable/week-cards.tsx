import { DAYS } from "@/lib/constants";
import { slotsForDay, periodMeta, type TimetableSlot } from "@/lib/timetable";
import { Card } from "@/components/ui/card";

/** Day-by-day card layout for the weekly timetable (mobile-friendly). */
export function WeekCards({
  slots,
  variant = "class",
}: {
  slots: TimetableSlot[];
  variant?: "teacher" | "class";
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
                  return (
                    <li key={s.id} className="flex items-center gap-3 rounded-md bg-muted/40 p-2.5">
                      <div className="w-12 shrink-0 text-center">
                        <p className="text-sm font-semibold">{s.period}</p>
                        {meta && <p className="text-[10px] text-muted-foreground">{meta.start}</p>}
                      </div>
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: s.colorHex ?? "var(--color-primary)" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{s.subjectName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {variant === "teacher" ? s.className : s.teacherName}
                          {s.room ? ` · ${s.room}` : ""}
                        </p>
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
