import { ArrowLeftRight } from "lucide-react";
import { buildDayRemap, dayLabelTh, type DaySwapData } from "@/lib/day-swap";
import type { DayKey } from "@/lib/constants";

/** Notice shown on schedule views when the current week has whole-day swaps.
 *  If `today` is given and is swapped, it leads with today's effect. */
export function DaySwapBanner({
  swaps,
  today,
}: {
  swaps: DaySwapData[];
  today?: DayKey | null;
}) {
  if (swaps.length === 0) return null;
  const remap = buildDayRemap(swaps);
  const todaySource = today ? remap[today] : undefined;

  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-400/50 bg-amber-50 px-4 py-3 text-sm dark:bg-amber-500/10">
      <ArrowLeftRight className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="space-y-0.5">
        {todaySource && (
          <p className="font-medium text-amber-800 dark:text-amber-300">
            วันนี้เรียนตามตารางวัน{dayLabelTh(todaySource)} (สลับชั่วคราวเฉพาะสัปดาห์นี้)
          </p>
        )}
        <p className="text-amber-700 dark:text-amber-400">
          สัปดาห์นี้สลับคาบทั้งวัน:{" "}
          {swaps.map((s, i) => (
            <span key={s.id}>
              {i > 0 ? " · " : ""}
              {dayLabelTh(s.dayA)} ↔ {dayLabelTh(s.dayB)}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
