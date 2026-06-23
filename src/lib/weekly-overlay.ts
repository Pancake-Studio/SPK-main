// Week-scoped, non-destructive timetable overlays (client-safe domain).
//
// The base `Schedule` is never mutated. A period SWAP (one week) exchanges the
// (day, period) of two same-class lessons; a DELEGATION ("ฝากคาบ", one week)
// hands a single period to a covering teacher. Both apply only to the week they
// were created for, then naturally stop applying. These pure helpers take
// overlay descriptors already resolved (with names/positions) by the server and
// fold them into a flat slot list, producing the marks the grid renders.

import { dayMeta, type SlotMark, type TimetableSlot } from "@/lib/timetable";
import type { DayKey } from "@/lib/constants";

/** A week-scoped period swap with both ends' BASE positions resolved. */
export type SwapOverlay = {
  swapId: string;
  aId: string;
  aDay: DayKey;
  aPeriod: number;
  bId: string;
  bDay: DayKey;
  bPeriod: number;
  at: string; // ISO timestamp (for the tooltip date)
};

/** A week-scoped delegation, resolved to teacher names. */
export type DelegationOverlay = {
  id: string;
  scheduleId: string;
  fromTeacherId: string;
  fromTeacherName: string;
  toTeacherId: string;
  toTeacherName: string;
};

function whenLabel(at: string): string {
  const d = new Date(at);
  return isNaN(d.getTime())
    ? ""
    : ` · เมื่อ ${d.toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`;
}

/** Apply week swaps to a flat slot list. Each end that is present in the list is
 *  moved to its partner's (day, period); both moved ends get a "สลับคาบ" mark.
 *  Returns fresh slot copies (the input is not mutated) plus a `id → mark` map. */
export function applySwaps(
  slots: TimetableSlot[],
  overlays: SwapOverlay[],
): { slots: TimetableSlot[]; marks: Record<string, SlotMark> } {
  const out = slots.map((s) => ({ ...s }));
  const byId = new Map(out.map((s) => [s.id, s]));
  const marks: Record<string, SlotMark> = {};

  for (const o of overlays) {
    const a = byId.get(o.aId);
    const b = byId.get(o.bId);
    if (a) {
      a.day = o.bDay;
      a.period = o.bPeriod;
      marks[a.id] = {
        tone: "swap",
        label: "สลับคาบ",
        tooltip: `สลับคาบสัปดาห์นี้: เดิม ${dayMeta(o.aDay)?.labelTh ?? o.aDay} คาบ ${o.aPeriod}${whenLabel(o.at)}`,
      };
    }
    if (b) {
      b.day = o.aDay;
      b.period = o.aPeriod;
      marks[b.id] = {
        tone: "swap",
        label: "สลับคาบ",
        tooltip: `สลับคาบสัปดาห์นี้: เดิม ${dayMeta(o.bDay)?.labelTh ?? o.bDay} คาบ ${o.bPeriod}${whenLabel(o.at)}`,
      };
    }
  }
  return { slots: out, marks };
}

/** Apply week delegations to a flat slot list. View-dependent:
 *   - class view (`viewerTeacherId` omitted): the cell shows the COVERING teacher
 *     and is marked "ฝากคาบ".
 *   - owner view: the owner's own lesson is marked "ฝากออก" (handed to someone).
 *   - cover view: the covered lesson (injected into the list by the caller) is
 *     marked "รับฝากคาบ".
 *  Mutates the given slots' `teacherName` where appropriate and returns marks. */
export function applyDelegations(
  slots: TimetableSlot[],
  overlays: DelegationOverlay[],
  viewerTeacherId?: string,
): Record<string, SlotMark> {
  const byId = new Map(slots.map((s) => [s.id, s]));
  const marks: Record<string, SlotMark> = {};

  for (const o of overlays) {
    const slot = byId.get(o.scheduleId);
    if (!slot) continue;

    if (viewerTeacherId === undefined) {
      // Class timetable: surface the covering teacher.
      slot.teacherName = o.toTeacherName;
      marks[slot.id] = {
        tone: "delegate",
        label: "ฝากคาบ",
        tooltip: `ครู ${o.fromTeacherName} ฝากให้ ครู ${o.toTeacherName} คุมแทนสัปดาห์นี้`,
      };
    } else if (o.fromTeacherId === viewerTeacherId) {
      marks[slot.id] = {
        tone: "delegate",
        label: "ฝากออก",
        tooltip: `ฝากให้ ครู ${o.toTeacherName} คุมแทนสัปดาห์นี้`,
      };
    } else if (o.toTeacherId === viewerTeacherId) {
      marks[slot.id] = {
        tone: "delegate",
        label: "รับฝากคาบ",
        tooltip: `รับฝากจาก ครู ${o.fromTeacherName} (เฉพาะสัปดาห์นี้)`,
      };
    }
  }
  return marks;
}
