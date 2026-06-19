import { DAYS, DAY_KEYS, PERIODS, type DayKey } from "@/lib/constants";

/** A timetable slot flattened for rendering (server- or client-side). */
export type TimetableSlot = {
  id: string;
  day: DayKey;
  period: number;
  room: string | null;
  subjectName: string;
  subjectCode: string;
  colorHex: string | null;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
};

export type TimetableGrid = Record<string, Record<number, TimetableSlot | undefined>>;

/** Map a JS Date to our day key, or null on weekends. */
export function dayKeyForDate(date = new Date()): DayKey | null {
  const idx = date.getDay(); // 0 Sun … 6 Sat
  if (idx === 0 || idx === 6) return null;
  return DAY_KEYS[idx - 1] ?? null;
}

function minutesOf(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** The period number active *right now*, or null if outside class hours. */
export function currentPeriodNo(date = new Date()): number | null {
  if (!dayKeyForDate(date)) return null;
  const now = date.getHours() * 60 + date.getMinutes();
  for (const p of PERIODS) {
    if (now >= minutesOf(p.start) && now < minutesOf(p.end)) return p.period;
  }
  return null;
}

/** The next upcoming period today (after `now`), or null. */
export function nextPeriodNo(date = new Date()): number | null {
  if (!dayKeyForDate(date)) return null;
  const now = date.getHours() * 60 + date.getMinutes();
  for (const p of PERIODS) {
    if (minutesOf(p.start) > now) return p.period;
  }
  return null;
}

export function periodMeta(period: number) {
  return PERIODS.find((p) => p.period === period) ?? null;
}

export function dayMeta(key: string) {
  return DAYS.find((d) => d.key === key) ?? null;
}

/** Build a `grid[day][period]` lookup from a flat list of slots. */
export function buildGrid(slots: TimetableSlot[]): TimetableGrid {
  const grid: TimetableGrid = {};
  for (const day of DAY_KEYS) grid[day] = {};
  for (const slot of slots) {
    (grid[slot.day] ??= {})[slot.period] = slot;
  }
  return grid;
}

/** Slots for a single day, sorted by period. */
export function slotsForDay(slots: TimetableSlot[], day: DayKey) {
  return slots
    .filter((s) => s.day === day)
    .sort((a, b) => a.period - b.period);
}
