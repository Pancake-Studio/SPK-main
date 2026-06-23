import { DAYS, DAY_KEYS, type DayKey } from "@/lib/constants";
import { bangkokDate } from "@/lib/timezone";
import {
  DEFAULT_BELL_SLOTS,
  classSlots,
  currentSlot,
  type BellSlotData,
} from "@/lib/bell-schedule";

/** A timetable slot flattened for rendering (server- or client-side). */
export type TimetableSlot = {
  id: string;
  day: DayKey;
  period: number;
  room: string | null;
  subjectName: string;
  subjectCode: string;
  colorHex: string | null;
  /** วิชาสอนหลายคน → ซ่อนชื่อครูในมุมมองนักเรียน (variant "class"). */
  hideTeacher?: boolean;
  /** คาบกิจกรรมส่วนกลาง (ชุมนุม/อบรม) — ไม่มีครู/ห้อง, แสดงป้ายอย่างเดียว. */
  activity?: boolean;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  gradeLevel: string;
};

export type TimetableGrid = Record<string, Record<number, TimetableSlot | undefined>>;

/** A per-slot annotation rendered as a small badge + tooltip in the grid.
 *  `tone` selects the colour (amber for a week swap, violet for a delegation). */
export type SlotMark = {
  tone: "swap" | "delegate";
  label: string;
  tooltip?: string;
};

/** Map a JS Date to our Bangkok day key, or null on weekends. */
export function dayKeyForDate(date = new Date()): DayKey | null {
  const idx = bangkokDate(date).getDay(); // 0 Sun … 6 Sat
  if (idx === 0 || idx === 6) return null;
  return DAY_KEYS[idx - 1] ?? null;
}

/** The Bangkok class-period number active *right now*, or null if outside class hours.
 *  Pass the effective bell slots for the day; defaults to the standard schedule. */
export function currentPeriodNo(
  date = new Date(),
  bellSlots: BellSlotData[] = DEFAULT_BELL_SLOTS,
): number | null {
  if (!dayKeyForDate(date)) return null;
  const s = currentSlot(bellSlots, date);
  return s && s.periodNumber != null ? s.periodNumber : null;
}

/** Time metadata ({ period, start, end }) for a class-period number. */
export function periodMeta(
  period: number,
  bellSlots: BellSlotData[] = DEFAULT_BELL_SLOTS,
) {
  const s = classSlots(bellSlots).find((x) => x.periodNumber === period);
  return s ? { period, start: s.startTime, end: s.endTime } : null;
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
