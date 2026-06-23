import "server-only";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { ROLES } from "@/lib/constants";
import { dayMeta } from "@/lib/timetable";
import type {
  SubjectInput,
  SubjectUpdateInput,
  OwnScheduleInput,
  OwnScheduleUpdateInput,
  StudentInput,
  StudentUpdateInput,
} from "@/lib/validations";

const DEFAULT_PASSWORD = "password123";

export class TeacherSelfError extends Error {}

/* ------------------------------------------------------------------ */
/*  Subjects — teachers manage only the subjects they own              */
/* ------------------------------------------------------------------ */

/** Teachers may now view & manage ALL subjects (per user request) — not just
 *  the ones they created. Ownership is still recorded for new subjects but no
 *  longer restricts editing. */
export function listAllSubjects() {
  return db.subject.findMany({
    include: { _count: { select: { schedules: true } } },
    orderBy: { subjectCode: "asc" },
  });
}

/** Subjects a teacher may use when building their timetable — all subjects. */
export function listSubjectsForTeacher() {
  return db.subject.findMany({ orderBy: { subjectCode: "asc" } });
}

export function createOwnSubject(teacherId: string, input: SubjectInput) {
  return db.subject.create({
    data: {
      subjectName: input.subjectName,
      subjectCode: input.subjectCode,
      colorHex: input.colorHex || null,
      ownerTeacherId: teacherId,
    },
  });
}

export async function updateOwnSubject(_teacherId: string, input: SubjectUpdateInput) {
  const subject = await db.subject.findUnique({ where: { id: input.id }, select: { id: true } });
  if (!subject) throw new TeacherSelfError("ไม่พบวิชา");
  return db.subject.update({
    where: { id: input.id },
    data: {
      subjectName: input.subjectName,
      subjectCode: input.subjectCode,
      colorHex: input.colorHex || null,
    },
  });
}

export async function deleteOwnSubject(_teacherId: string, id: string) {
  const subject = await db.subject.findUnique({ where: { id }, select: { id: true } });
  if (!subject) throw new TeacherSelfError("ไม่พบวิชา");
  const used = await db.schedule.count({ where: { subjectId: id } });
  if (used > 0) throw new TeacherSelfError("ลบไม่ได้ วิชานี้ยังถูกใช้ในตารางสอน");
  await db.subject.delete({ where: { id } });
}

/* ------------------------------------------------------------------ */
/*  Timetable — teachers manage only their OWN periods                 */
/* ------------------------------------------------------------------ */

/** The chosen subject must exist (teachers may schedule with any subject). */
async function assertSubjectAllowed(_teacherId: string, subjectId: string) {
  const subject = await db.subject.findUnique({ where: { id: subjectId }, select: { id: true } });
  if (!subject) throw new TeacherSelfError("ไม่พบวิชา");
}

/** The teacher must be free at (day, period) — they can't teach two classes at
 *  once. `exceptId` skips the slot being edited. */
async function assertTeacherFree(teacherId: string, day: string, period: number, exceptId?: string) {
  const clash = await db.schedule.findFirst({
    where: { teacherId, day, period, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (clash) {
    throw new TeacherSelfError(`คุณมีคาบสอนอยู่แล้วใน ${dayMeta(day)?.labelTh ?? day} คาบ ${period}`);
  }
}

/** The teacher's own timetable rows (with ids) for the manage table. */
export function listOwnSchedule(teacherId: string) {
  return db.schedule.findMany({
    where: { teacherId },
    include: { subject: true, class: true },
    orderBy: [{ day: "asc" }, { period: "asc" }],
  });
}

export async function createOwnSchedule(teacherId: string, input: OwnScheduleInput) {
  await assertSubjectAllowed(teacherId, input.subjectId);
  await assertTeacherFree(teacherId, input.day, input.period);
  return db.schedule.create({
    data: {
      classId: input.classId,
      subjectId: input.subjectId,
      teacherId,
      day: input.day,
      period: input.period,
      room: input.room || null,
    },
  });
}

export async function updateOwnSchedule(teacherId: string, input: OwnScheduleUpdateInput) {
  const slot = await db.schedule.findUnique({ where: { id: input.id }, select: { teacherId: true } });
  if (!slot) throw new TeacherSelfError("ไม่พบคาบสอน");
  if (slot.teacherId !== teacherId) throw new TeacherSelfError("แก้ไขได้เฉพาะคาบสอนของคุณเท่านั้น");
  await assertSubjectAllowed(teacherId, input.subjectId);
  await assertTeacherFree(teacherId, input.day, input.period, input.id);
  return db.schedule.update({
    where: { id: input.id },
    data: {
      classId: input.classId,
      subjectId: input.subjectId,
      day: input.day,
      period: input.period,
      room: input.room || null,
    },
  });
}

export async function deleteOwnSchedule(teacherId: string, id: string) {
  const slot = await db.schedule.findUnique({ where: { id }, select: { teacherId: true } });
  if (!slot) throw new TeacherSelfError("ไม่พบคาบสอน");
  if (slot.teacherId !== teacherId) throw new TeacherSelfError("ลบได้เฉพาะคาบสอนของคุณเท่านั้น");
  // Clear swap requests referencing this slot first (Delegation cascades on delete).
  await db.$transaction([
    db.swapRequest.deleteMany({
      where: { OR: [{ sourceScheduleId: id }, { targetScheduleId: id }] },
    }),
    db.schedule.delete({ where: { id } }),
  ]);
}

/* ------------------------------------------------------------------ */
/*  Advisory students — homeroom teacher manages their class only      */
/* ------------------------------------------------------------------ */

export async function getAdvisorClass(teacherId: string) {
  const t = await db.teacher.findUnique({
    where: { id: teacherId },
    select: { advisorClassId: true, advisorClass: true },
  });
  return t?.advisorClass ?? null;
}

export async function listAdvisoryStudents(classId: string) {
  return db.student.findMany({
    where: { classId },
    include: { user: true, class: true },
    orderBy: [{ rollNumber: "asc" }, { studentCode: "asc" }],
  });
}

async function assertRollFree(classId: string, rollNumber?: number | null, excludeStudentId?: string) {
  if (rollNumber == null) return;
  const taken = await db.student.findFirst({
    where: { classId, rollNumber, ...(excludeStudentId ? { id: { not: excludeStudentId } } : {}) },
    select: { id: true },
  });
  if (taken) throw new TeacherSelfError(`เลขที่ ${rollNumber} มีอยู่แล้วในห้องนี้`);
}

/** Create a student — `classId` is forced to the advisor's class. */
export async function createAdvisoryStudent(advisorClassId: string, input: StudentInput) {
  await assertRollFree(advisorClassId, input.rollNumber);
  const passwordHash = await hashPassword(input.password || DEFAULT_PASSWORD);
  return db.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: ROLES.STUDENT,
      name: input.name,
      student: {
        create: {
          studentCode: input.studentCode,
          title: input.title || null,
          rollNumber: input.rollNumber ?? null,
          classId: advisorClassId,
        },
      },
    },
  });
}

export async function deleteAdvisoryStudent(advisorClassId: string, studentId: string) {
  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { userId: true, classId: true },
  });
  if (!student) throw new TeacherSelfError("ไม่พบนักเรียน");
  if (student.classId !== advisorClassId) {
    throw new TeacherSelfError("ลบได้เฉพาะนักเรียนในห้องที่คุณเป็นที่ปรึกษาเท่านั้น");
  }
  await db.user.delete({ where: { id: student.userId } });
}

export async function updateAdvisoryStudent(advisorClassId: string, input: StudentUpdateInput) {
  const student = await db.student.findUnique({
    where: { id: input.id },
    select: { userId: true, classId: true },
  });
  if (!student) throw new TeacherSelfError("ไม่พบนักเรียน");
  if (student.classId !== advisorClassId) {
    throw new TeacherSelfError("แก้ไขได้เฉพาะนักเรียนในห้องที่คุณเป็นที่ปรึกษาเท่านั้น");
  }
  await assertRollFree(advisorClassId, input.rollNumber, input.id);
  await db.$transaction([
    db.user.update({
      where: { id: student.userId },
      data: {
        name: input.name,
        email: input.email,
        ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
      },
    }),
    db.student.update({
      where: { id: input.id },
      // classId stays pinned to the advisor's class — advisors can't move students out.
      data: {
        studentCode: input.studentCode,
        title: input.title || null,
        rollNumber: input.rollNumber ?? null,
        classId: advisorClassId,
      },
    }),
  ]);
}
