// Bell-schedule domain model: the ordered list of daily time slots (home room,
// class periods, breaks, lunch) shared by every classroom. Client-safe — no
// `server-only`, no DB — so both server services and client components import
// from here. The DB (BellSchedule/BellSlot) is the source of truth at runtime;
// DEFAULT_BELL_SLOTS is the seed + the fallback used before anything is saved.

/** Slot kinds. CLASS rows carry a `periodNumber` (what `Schedule.period`
 *  references); the rest are non-teaching rows shown full-width in the grid. */
export const SLOT_KINDS = {
  HOMEROOM: "HOMEROOM",
  CLASS: "CLASS",
  BREAK: "BREAK",
  LUNCH: "LUNCH",
} as const;
export type SlotKind = (typeof SLOT_KINDS)[keyof typeof SLOT_KINDS];

/** True for rows that hold lessons (a per-day grid cell). */
export function isClassKind(kind: string): boolean {
  return kind === SLOT_KINDS.CLASS;
}

export type BellSlotData = {
  id: string;
  order: number;
  kind: SlotKind;
  label: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  periodNumber: number | null;
};

export type BellScheduleData = {
  id: string;
  name: string;
  isDefault: boolean;
  slots: BellSlotData[];
};

/* --------------------------------- time ---------------------------------- */

/** "HH:MM" → minutes since midnight. */
export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** minutes since midnight → "HH:MM" (zero-padded, wraps within a day). */
export function hhmmOf(min: number): string {
  const total = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Duration of a slot in minutes (handles the explicit start/end pair). */
export function slotDuration(slot: { startTime: string; endTime: string }): number {
  return Math.max(0, minutesOf(slot.endTime) - minutesOf(slot.startTime));
}

/**
 * Re-chain a reordered list of slots into a contiguous timeline: keep each
 * slot's own duration, but recompute start/end so each begins where the
 * previous ends, anchored at the first slot's start (or `startAnchor`).
 * This is what makes "swap two periods" move the lessons with their time
 * block — and keeps breaks of any length contiguous when moved.
 */
export function rechainSlots<T extends { startTime: string; endTime: string }>(
  slots: T[],
  startAnchor?: string,
): T[] {
  let cursor = startAnchor != null ? minutesOf(startAnchor) : slots[0] ? minutesOf(slots[0].startTime) : 0;
  return slots.map((s) => {
    const dur = slotDuration(s);
    const start = cursor;
    cursor += dur;
    return { ...s, startTime: hhmmOf(start), endTime: hhmmOf(cursor) };
  });
}

/** Slots in display order. */
export function orderedSlots(slots: BellSlotData[]): BellSlotData[] {
  return [...slots].sort((a, b) => a.order - b.order);
}

/** Only the teaching periods, ordered (used by pickers / validation). */
export function classSlots(slots: BellSlotData[]): BellSlotData[] {
  return orderedSlots(slots).filter((s) => isClassKind(s.kind) && s.periodNumber != null);
}

/** Map `periodNumber` → its slot, for time lookups when rendering lessons. */
export function classSlotByPeriod(slots: BellSlotData[]): Map<number, BellSlotData> {
  const m = new Map<number, BellSlotData>();
  for (const s of classSlots(slots)) m.set(s.periodNumber!, s);
  return m;
}

/** The slot active at `date`'s wall-clock time, or null outside school hours. */
export function currentSlot(slots: BellSlotData[], date: Date): BellSlotData | null {
  const now = date.getHours() * 60 + date.getMinutes();
  for (const s of orderedSlots(slots)) {
    if (now >= minutesOf(s.startTime) && now < minutesOf(s.endTime)) return s;
  }
  return null;
}

/** The next CLASS slot starting strictly after `date`, or null. */
export function nextClassSlot(slots: BellSlotData[], date: Date): BellSlotData | null {
  const now = date.getHours() * 60 + date.getMinutes();
  for (const s of classSlots(slots)) {
    if (minutesOf(s.startTime) > now) return s;
  }
  return null;
}

/** Default Thai-format label for a class period number. */
export function classLabel(periodNumber: number): string {
  return `คาบ ${periodNumber}`;
}

/* ------------------------------- default --------------------------------- */

/** The standard SPK daily schedule (seed + pre-save fallback). Times are
 *  contiguous from 08:10 to 16:10. Ids are stable sentinels (`def-*`) so the
 *  fallback renders deterministically before a DB row exists. */
export const DEFAULT_BELL_SLOTS: BellSlotData[] = [
  { kind: "HOMEROOM", label: "Home Room", start: "08:10", end: "08:20", period: null },
  { kind: "CLASS", label: "คาบ 1", start: "08:20", end: "09:10", period: 1 },
  { kind: "CLASS", label: "คาบ 2", start: "09:10", end: "10:00", period: 2 },
  { kind: "BREAK", label: "พัก", start: "10:00", end: "10:10", period: null },
  { kind: "CLASS", label: "คาบ 3", start: "10:10", end: "11:00", period: 3 },
  { kind: "CLASS", label: "คาบ 4", start: "11:00", end: "11:50", period: 4 },
  { kind: "LUNCH", label: "พักเที่ยง", start: "11:50", end: "12:50", period: null },
  { kind: "CLASS", label: "คาบ 5", start: "12:50", end: "13:40", period: 5 },
  { kind: "CLASS", label: "คาบ 6", start: "13:40", end: "14:30", period: 6 },
  { kind: "CLASS", label: "คาบ 7", start: "14:30", end: "15:20", period: 7 },
  { kind: "CLASS", label: "คาบ 8", start: "15:20", end: "16:10", period: 8 },
].map((s, i) => ({
  id: `def-${i}`,
  order: i,
  kind: s.kind as SlotKind,
  label: s.label,
  startTime: s.start,
  endTime: s.end,
  periodNumber: s.period,
}));

/** Class period numbers in the default schedule ([1..8]). */
export const DEFAULT_PERIOD_NUMBERS: number[] = classSlots(DEFAULT_BELL_SLOTS).map(
  (s) => s.periodNumber!,
);
