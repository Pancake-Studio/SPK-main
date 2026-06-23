import "server-only";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { ROLES } from "@/lib/constants";
import { dayMeta } from "@/lib/timetable";
import { activityAt } from "./activity.service";
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
      hideTeacherForStudents: input.hideTeacherForStudents,
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
      hideTeacherForStudents: input.hideTeacherForStudents,
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
 *  once, EXCEPT a multi-teacher subject which may run across several classrooms
 *  at the same time. `exceptId` skips the slot being edited. */
async function assertTeacherFree(teacherId: string, day: string, period: number, subjectId: string, exceptId?: string) {
  const clashes = await db.schedule.findMany({
    where: { teacherId, day, period, ...(exceptId ? { id: { not: exceptId } } : {}) },
    include: { subject: true },
  });
  if (clashes.length === 0) return;
  const stackable = clashes.every((c) => c.subjectId === subjectId && c.subject.hideTeacherForStudents);
  if (stackable) return;
  throw new TeacherSelfError(`คุณมีคาบสอนอยู่แล้วใน${dayMeta(day)?.labelTh ?? day} คาบ ${period}`);
}

/** Block scheduling a normal lesson onto a school-wide activity slot. */
async function assertNotActivitySlot(day: string, period: number) {
  const activity = await activityAt(day, period);
  if (activity) {
    throw new TeacherSelfError(
      `${dayMeta(day)?.labelTh ?? day} คาบ ${period} เป็นคาบกิจกรรม "${activity.label}" จัดคาบสอนไม่ได้`,
    );
  }
}

/** A class holds one lesson per (day, period) — except a "multi-teacher" subject
 *  (Subject.hideTeacherForStudents) may be co-taught. Stacking is allowed only
 *  when every existing lesson there is that same multi-teacher subject. */
async function assertClassSlotFree(
  classId: string,
  day: string,
  period: number,
  subjectId: string,
  exceptId?: string,
) {
  const clashes = await db.schedule.findMany({
    where: { classId, day, period, ...(exceptId ? { id: { not: exceptId } } : {}) },
    include: { subject: true, teacher: { include: { user: true } }, class: true },
  });
  if (clashes.length === 0) return;
  const stackable = clashes.every((c) => c.subjectId === subjectId && c.subject.hideTeacherForStudents);
  if (stackable) return;
  const c = clashes[0];
  throw new TeacherSelfError(
    `ห้อง ${c.class.className} มีคาบเรียนอยู่แล้วใน${dayMeta(day)?.labelTh ?? day} คาบ ${period} ` +
      `(${c.subject.subjectName} · ${c.teacher.user.name})`,
  );
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
  await assertNotActivitySlot(input.day, input.period);
  await assertTeacherFree(teacherId, input.day, input.period, input.subjectId);
  await assertClassSlotFree(input.classId, input.day, input.period, input.subjectId);
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
  await assertNotActivitySlot(input.day, input.period);
  await assertTeacherFree(teacherId, input.day, input.period, input.subjectId, input.id);
  await assertClassSlotFree(input.classId, input.day, input.period, input.subjectId, input.id);
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

/** The advisor's class PLUS any dotted sub-rooms of it (auto-detected by name).
 *  So an advisor of ม.5/3 manages ม.5/3.1, ม.5/3.2, and any future ม.5/3.x. A
 *  normal class (no sub-rooms) just returns itself. */
export async function advisorRooms(advisorClassId: string) {
  const base = await db.class.findUnique({
    where: { id: advisorClassId },
    select: { id: true, className: true },
  });
  if (!base) return [];
  return db.class.findMany({
    where: { OR: [{ id: base.id }, { className: { startsWith: `${base.className}.` } }] },
    orderBy: { className: "asc" },
    select: { id: true, className: true },
  });
}

/** Resolve a teacher's advisor class + the rooms they manage, for the page. */
export async function getAdvisorContext(teacherId: string) {
  const klass = await getAdvisorClass(teacherId);
  if (!klass) return { klass: null, rooms: [] as { id: string; className: string }[] };
  return { klass, rooms: await advisorRooms(klass.id) };
}

async function assertRoomInAdvisory(advisorClassId: string, classId: string) {
  const rooms = await advisorRooms(advisorClassId);
  if (!rooms.some((r) => r.id === classId)) {
    throw new TeacherSelfError("เลือกได้เฉพาะห้องที่อยู่ในความดูแลของคุณเท่านั้น");
  }
}

export async function listAdvisoryStudents(advisorClassId: string) {
  const rooms = await advisorRooms(advisorClassId);
  const ids = rooms.map((r) => r.id);
  return db.student.findMany({
    where: { classId: { in: ids } },
    include: { user: true, class: true },
    orderBy: [{ class: { className: "asc" } }, { rollNumber: "asc" }, { studentCode: "asc" }],
  });
}

/** Create a student in one of the advisor's rooms (the class or a sub-room). */
export async function createAdvisoryStudent(advisorClassId: string, input: StudentInput) {
  await assertRoomInAdvisory(advisorClassId, input.classId);
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
          classId: input.classId,
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
  await assertRoomInAdvisory(advisorClassId, student.classId);
  await db.user.delete({ where: { id: student.userId } });
}

export async function updateAdvisoryStudent(advisorClassId: string, input: StudentUpdateInput) {
  const student = await db.student.findUnique({
    where: { id: input.id },
    select: { userId: true, classId: true },
  });
  if (!student) throw new TeacherSelfError("ไม่พบนักเรียน");
  // Both the student's current room and the target room must be in the advisory
  // (the advisor may move a student between their own sub-rooms).
  await assertRoomInAdvisory(advisorClassId, student.classId);
  await assertRoomInAdvisory(advisorClassId, input.classId);
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
      data: {
        studentCode: input.studentCode,
        title: input.title || null,
        rollNumber: input.rollNumber ?? null,
        classId: input.classId,
      },
    }),
  ]);
}
