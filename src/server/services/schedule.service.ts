import "server-only";

import { db } from "@/lib/db";
import type { TimetableSlot } from "@/lib/timetable";
import { SWAP_STATUS, type DayKey } from "@/lib/constants";

const scheduleInclude = {
  subject: true,
  class: true,
  teacher: { include: { user: true } },
} as const;

type ScheduleWithRelations = {
  id: string;
  day: string;
  period: number;
  room: string | null;
  subject: { subjectName: string; subjectCode: string; colorHex: string | null };
  class: { id: string; className: string; gradeLevel: string };
  teacher: { id: string; user: { name: string } };
};

export function toSlot(s: ScheduleWithRelations): TimetableSlot {
  return {
    id: s.id,
    day: s.day as DayKey,
    period: s.period,
    room: s.room,
    subjectName: s.subject.subjectName,
    subjectCode: s.subject.subjectCode,
    colorHex: s.subject.colorHex,
    teacherId: s.teacher.id,
    teacherName: s.teacher.user.name,
    classId: s.class.id,
    className: s.class.className,
    gradeLevel: s.class.gradeLevel,
  };
}

/** All timetable slots taught by a teacher. */
export async function getTeacherSchedule(
  teacherId: string,
): Promise<TimetableSlot[]> {
  const rows = await db.schedule.findMany({
    where: { teacherId },
    include: scheduleInclude,
    orderBy: [{ day: "asc" }, { period: "asc" }],
  });
  return rows.map(toSlot);
}

/** A teacher's weekly timetable INCLUDING the swapped-in counterpart periods.
 *  After a swap, teacher A still teaches their own (moved) period, but they also
 *  want to SEE the partner period — now taught by teacher B at A's old slot —
 *  highlighted. So we merge in, for each active swap A is part of, the partner
 *  schedule (the side A does not teach). Both ends get highlighted via swapMarks. */
export async function getTeacherScheduleWithSwaps(
  teacherId: string,
): Promise<TimetableSlot[]> {
  const own = await getTeacherSchedule(teacherId);
  const ownIds = new Set(own.map((s) => s.id));

  const swaps = await db.swapRequest.findMany({
    where: {
      status: { in: [SWAP_STATUS.APPROVED, SWAP_STATUS.CANCEL_REQUESTED] },
      OR: [{ requesterId: teacherId }, { targetTeacherId: teacherId }],
    },
    include: {
      sourceSchedule: { include: scheduleInclude },
      targetSchedule: { include: scheduleInclude },
    },
  });

  const extras: TimetableSlot[] = [];
  const seen = new Set<string>();
  for (const sw of swaps) {
    for (const sch of [sw.sourceSchedule, sw.targetSchedule]) {
      // The counterpart is the side this teacher does NOT currently teach.
      if (sch.teacherId !== teacherId && !ownIds.has(sch.id) && !seen.has(sch.id)) {
        seen.add(sch.id);
        extras.push(toSlot(sch));
      }
    }
  }
  return [...own, ...extras];
}

/** All timetable slots for a class (what a student sees). */
export async function getClassSchedule(
  classId: string,
): Promise<TimetableSlot[]> {
  const rows = await db.schedule.findMany({
    where: { classId },
    include: scheduleInclude,
    orderBy: [{ day: "asc" }, { period: "asc" }],
  });
  return rows.map(toSlot);
}

export async function getClassBrief(classId: string) {
  return db.class.findUnique({
    where: { id: classId },
    include: { _count: { select: { students: true } } },
  });
}

export async function getScheduleSlot(id: string) {
  const row = await db.schedule.findUnique({
    where: { id },
    include: scheduleInclude,
  });
  return row ? toSlot(row) : null;
}

/** Teachers (optionally excluding one) with their full slot lists — for the
 *  swap-target picker. */
export async function getTeachersWithSchedules(excludeTeacherId?: string) {
  const teachers = await db.teacher.findMany({
    where: excludeTeacherId ? { id: { not: excludeTeacherId } } : undefined,
    include: { user: true, schedules: { include: scheduleInclude } },
    orderBy: { user: { name: "asc" } },
  });
  return teachers.map((t) => ({
    id: t.id,
    name: t.user.name,
    slots: t.schedules.map(toSlot),
  }));
}

/** A teacher's slots for a single weekday (used for swap targeting). */
export async function getTeacherDaySlots(teacherId: string, day: DayKey) {
  const rows = await db.schedule.findMany({
    where: { teacherId, day },
    include: scheduleInclude,
    orderBy: { period: "asc" },
  });
  return rows.map(toSlot);
}
