import "server-only";

import { db } from "@/lib/db";
import { SWAP_STATUS, type DayKey } from "@/lib/constants";
import { weekStartOf } from "@/lib/day-swap";
import {
  applyDelegations,
  applySwaps,
  type DelegationOverlay,
  type SwapOverlay,
} from "@/lib/weekly-overlay";
import type { SlotMark, TimetableSlot } from "@/lib/timetable";
import { getClassSchedule, getTeacherSchedule, scheduleInclude, toSlot } from "./schedule.service";

/** A swap is "in effect" while APPROVED (or while a cancellation is pending). */
const ACTIVE_SWAP = [SWAP_STATUS.APPROVED, SWAP_STATUS.CANCEL_REQUESTED];
const DELEGATION_ACTIVE = "ACTIVE";

export type EffectiveSchedule = {
  slots: TimetableSlot[];
  marks: Record<string, SlotMark>;
};

type SwapRow = Awaited<ReturnType<typeof activeSwaps>>[number];
type DelegationRow = Awaited<ReturnType<typeof activeDelegations>>[number];

function activeSwaps(weekStart: string) {
  return db.swapRequest.findMany({
    where: { weekStart, status: { in: ACTIVE_SWAP } },
    include: {
      sourceSchedule: { include: scheduleInclude },
      targetSchedule: { include: scheduleInclude },
    },
  });
}

function activeDelegations(weekStart: string) {
  return db.delegation.findMany({
    where: { weekStart, status: DELEGATION_ACTIVE },
    include: {
      schedule: { include: scheduleInclude },
      fromTeacher: { include: { user: true } },
      toTeacher: { include: { user: true } },
    },
  });
}

function toSwapOverlay(s: SwapRow): SwapOverlay {
  return {
    swapId: s.id,
    aId: s.sourceScheduleId,
    aDay: s.sourceSchedule.day as DayKey,
    aPeriod: s.sourceSchedule.period,
    bId: s.targetScheduleId,
    bDay: s.targetSchedule.day as DayKey,
    bPeriod: s.targetSchedule.period,
    at: (s.respondedAt ?? s.createdAt).toISOString(),
  };
}

function toDelegationOverlay(d: DelegationRow): DelegationOverlay {
  return {
    id: d.id,
    scheduleId: d.scheduleId,
    fromTeacherId: d.fromTeacherId,
    fromTeacherName: d.fromTeacher.user.name,
    toTeacherId: d.toTeacherId,
    toTeacherName: d.toTeacher.user.name,
  };
}

/** A class's effective weekly timetable for the week containing `dateIso`,
 *  with this week's period-swaps + delegations applied (non-destructively). */
export async function getClassEffective(
  classId: string,
  dateIso: string,
): Promise<EffectiveSchedule> {
  const weekStart = weekStartOf(dateIso);
  const [base, swaps, dels] = await Promise.all([
    getClassSchedule(classId),
    activeSwaps(weekStart),
    activeDelegations(weekStart),
  ]);

  const swapOv = swaps
    .filter((s) => s.sourceSchedule.classId === classId)
    .map(toSwapOverlay);
  const { slots, marks } = applySwaps(base, swapOv);

  const delOv = dels.filter((d) => d.schedule.classId === classId).map(toDelegationOverlay);
  const delMarks = applyDelegations(slots, delOv); // class view → show covering teacher
  return { slots, marks: { ...marks, ...delMarks } };
}

/** A teacher's effective weekly timetable for the week containing `dateIso`.
 *  Merges in the swapped-in counterpart periods + any periods this teacher is
 *  covering, then applies this week's swaps + delegations. */
export async function getTeacherEffective(
  teacherId: string,
  dateIso: string,
): Promise<EffectiveSchedule> {
  const weekStart = weekStartOf(dateIso);
  const [base, swaps, dels] = await Promise.all([
    getTeacherSchedule(teacherId),
    activeSwaps(weekStart),
    activeDelegations(weekStart),
  ]);

  const ext: TimetableSlot[] = [...base];
  const have = new Set(base.map((s) => s.id));

  // Swaps this teacher is part of — inject the partner period (the side they do
  // not teach) so both ends move together and both can be shown.
  const mySwaps = swaps.filter(
    (s) => s.requesterId === teacherId || s.targetTeacherId === teacherId,
  );
  for (const s of mySwaps) {
    for (const sch of [s.sourceSchedule, s.targetSchedule]) {
      if (sch.teacherId !== teacherId && !have.has(sch.id)) {
        have.add(sch.id);
        ext.push(toSlot(sch));
      }
    }
  }

  // Periods this teacher is covering for someone — inject so they appear.
  const myDels = dels.filter(
    (d) => d.fromTeacherId === teacherId || d.toTeacherId === teacherId,
  );
  for (const d of myDels) {
    if (d.toTeacherId === teacherId && !have.has(d.scheduleId)) {
      have.add(d.scheduleId);
      ext.push(toSlot(d.schedule));
    }
  }

  const { slots, marks } = applySwaps(ext, mySwaps.map(toSwapOverlay));
  const delMarks = applyDelegations(slots, myDels.map(toDelegationOverlay), teacherId);
  return { slots, marks: { ...marks, ...delMarks } };
}
