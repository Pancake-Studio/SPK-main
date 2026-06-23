import "server-only";

import { db } from "@/lib/db";
import type { TimetableSlot } from "@/lib/timetable";
import { type DayKey } from "@/lib/constants";

export const scheduleInclude = {
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

