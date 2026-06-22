// Whole-day timetable swaps for a single week (e.g. "this week, Mon ↔ Tue").
// Client-safe domain helpers (no server-only / no DB) shared by the admin UI,
// the schedule pages, and the server service.

import { DAY_KEYS, DAYS, type DayKey } from "@/lib/constants";

export type DaySwapData = {
  id: string;
  weekStart: string; // Monday "YYYY-MM-DD"
  dayA: DayKey;
  dayB: DayKey;
  note: string | null;
};

/** Local "YYYY-MM-DD" (no UTC shift) from a Date. */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse "YYYY-MM-DD" to a local Date at midnight. */
export function fromIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Monday (ISO date) of the week containing `date`. */
export function weekStartOf(date: Date | string): string {
  const d = typeof date === "string" ? fromIsoDate(date) : new Date(date);
  const dow = d.getDay(); // 0 Sun … 6 Sat
  const toMonday = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + toMonday);
  d.setHours(0, 0, 0, 0);
  return toIsoDate(d);
}

/** The DayKey (MON..FRI) for a date, or null on weekends. */
export function weekdayOf(date: Date | string): DayKey | null {
  const d = typeof date === "string" ? fromIsoDate(date) : date;
  const idx = d.getDay();
  if (idx === 0 || idx === 6) return null;
  return DAY_KEYS[idx - 1] ?? null;
}

/** The actual calendar date (ISO) of a weekday within a given week. */
export function dateOfWeekday(weekStart: string, day: DayKey): string {
  const offset = DAY_KEYS.indexOf(day); // MON=0 … FRI=4
  const d = fromIsoDate(weekStart);
  d.setDate(d.getDate() + offset);
  return toIsoDate(d);
}

/** Build a display→source weekday remap from a week's swaps. Each swap makes
 *  dayA show dayB's lessons and vice-versa. */
export function buildDayRemap(swaps: DaySwapData[]): Partial<Record<DayKey, DayKey>> {
  const remap: Partial<Record<DayKey, DayKey>> = {};
  for (const s of swaps) {
    remap[s.dayA] = s.dayB;
    remap[s.dayB] = s.dayA;
  }
  return remap;
}

/** Which template weekday's lessons apply on `date`, honouring that week's
 *  swaps. Returns null on weekends. */
export function effectiveDayFor(date: Date | string, swaps: DaySwapData[]): DayKey | null {
  const wd = weekdayOf(date);
  if (!wd) return null;
  return buildDayRemap(swaps)[wd] ?? wd;
}

/** Thai label for a weekday key. */
export function dayLabelTh(day: string): string {
  return DAYS.find((d) => d.key === day)?.labelTh ?? day;
}

/** "1 ก.ค. – 5 ก.ค." style range for a school week (Mon–Fri). */
export function weekRangeLabel(weekStart: string): string {
  const mon = fromIsoDate(weekStart);
  const fri = fromIsoDate(weekStart);
  fri.setDate(fri.getDate() + 4);
  const fmt = (d: Date) => d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  return `${fmt(mon)} – ${fmt(fri)}`;
}
