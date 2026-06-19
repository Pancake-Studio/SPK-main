import "server-only";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { SWAP_STATUS, ROLES } from "@/lib/constants";
import type {
  TeacherInput,
  StudentInput,
  ClassInput,
  SubjectInput,
  ScheduleInput,
} from "@/lib/validations";

const DEFAULT_PASSWORD = "password123";

/* --------------------------------- Stats -------------------------------- */

export async function getAdminStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    teachers,
    students,
    classes,
    subjects,
    schedules,
    pendingSwaps,
    todaySwaps,
    todayNotifications,
  ] = await Promise.all([
    db.teacher.count(),
    db.student.count(),
    db.class.count(),
    db.subject.count(),
    db.schedule.count(),
    db.swapRequest.count({ where: { status: SWAP_STATUS.PENDING } }),
    db.swapRequest.count({ where: { createdAt: { gte: startOfToday } } }),
    db.notification.count({ where: { createdAt: { gte: startOfToday } } }),
  ]);

  return {
    teachers,
    students,
    classes,
    subjects,
    schedules,
    pendingSwaps,
    todaySwaps,
    todayActivity: todaySwaps + todayNotifications,
  };
}

/** Swap counts grouped by status — for the admin analytics chart. */
export async function getSwapStatusBreakdown() {
  const grouped = await db.swapRequest.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const map: Record<string, number> = {};
  for (const g of grouped) map[g.status] = g._count._all;
  return map;
}

/* -------------------------------- Teachers ------------------------------ */

export function listTeachers() {
  return db.teacher.findMany({
    include: { user: true, _count: { select: { schedules: true } } },
    orderBy: { teacherCode: "asc" },
  });
}

export async function createTeacher(input: TeacherInput) {
  const passwordHash = await hashPassword(input.password || DEFAULT_PASSWORD);
  return db.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: ROLES.TEACHER,
      name: input.name,
      teacher: {
        create: {
          teacherCode: input.teacherCode,
          title: input.title || null,
          department: input.department || null,
          phone: input.phone || null,
        },
      },
    },
  });
}

export async function deleteTeacher(teacherId: string) {
  const teacher = await db.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) return;
  // Removing the user cascades to the teacher profile + sessions.
  await db.user.delete({ where: { id: teacher.userId } });
}

/* -------------------------------- Students ------------------------------ */

export function listStudents() {
  return db.student.findMany({
    include: { user: true, class: true },
    orderBy: { studentCode: "asc" },
  });
}

export async function createStudent(input: StudentInput) {
  const passwordHash = await hashPassword(input.password || DEFAULT_PASSWORD);
  return db.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: ROLES.STUDENT,
      name: input.name,
      student: {
        create: { studentCode: input.studentCode, classId: input.classId },
      },
    },
  });
}

export async function deleteStudent(studentId: string) {
  const student = await db.student.findUnique({ where: { id: studentId } });
  if (!student) return;
  await db.user.delete({ where: { id: student.userId } });
}

/* --------------------------------- Classes ------------------------------ */

export function listClasses() {
  return db.class.findMany({
    include: { _count: { select: { students: true, schedules: true } } },
    orderBy: { className: "asc" },
  });
}

export function createClass(input: ClassInput) {
  return db.class.create({
    data: {
      className: input.className,
      gradeLevel: input.gradeLevel,
      room: input.room || null,
    },
  });
}

export function deleteClass(id: string) {
  return db.class.delete({ where: { id } });
}

/* -------------------------------- Subjects ------------------------------ */

export function listSubjects() {
  return db.subject.findMany({
    include: { _count: { select: { schedules: true } } },
    orderBy: { subjectCode: "asc" },
  });
}

export function createSubject(input: SubjectInput) {
  return db.subject.create({
    data: {
      subjectName: input.subjectName,
      subjectCode: input.subjectCode,
      colorHex: input.colorHex || null,
    },
  });
}

export function deleteSubject(id: string) {
  return db.subject.delete({ where: { id } });
}

/* -------------------------------- Schedules ----------------------------- */

export function listSchedules() {
  return db.schedule.findMany({
    include: {
      subject: true,
      class: true,
      teacher: { include: { user: true } },
    },
    orderBy: [{ class: { className: "asc" } }, { day: "asc" }, { period: "asc" }],
  });
}

export function createSchedule(input: ScheduleInput) {
  return db.schedule.create({
    data: {
      classId: input.classId,
      subjectId: input.subjectId,
      teacherId: input.teacherId,
      day: input.day,
      period: input.period,
      room: input.room || null,
    },
  });
}

export function deleteSchedule(id: string) {
  return db.schedule.delete({ where: { id } });
}

/** Bulk insert from CSV/Excel import; returns count inserted. */
export async function bulkCreateSchedules(rows: ScheduleInput[]) {
  let inserted = 0;
  for (const row of rows) {
    try {
      await createSchedule(row);
      inserted++;
    } catch {
      // Skip rows that violate the unique (class, day, period) constraint.
    }
  }
  return inserted;
}

/* ------------------------------ Announcements --------------------------- */

export function listAnnouncements() {
  return db.announcement.findMany({
    include: { author: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

/** Lookup maps used to resolve CSV codes -> ids during import. */
export async function getImportLookups() {
  const [classes, subjects, teachers] = await Promise.all([
    db.class.findMany({ select: { id: true, className: true } }),
    db.subject.findMany({ select: { id: true, subjectCode: true } }),
    db.teacher.findMany({ select: { id: true, teacherCode: true } }),
  ]);
  return {
    classByName: new Map(classes.map((c) => [c.className.toUpperCase(), c.id])),
    subjectByCode: new Map(
      subjects.map((s) => [s.subjectCode.toUpperCase(), s.id]),
    ),
    teacherByCode: new Map(
      teachers.map((t) => [t.teacherCode.toUpperCase(), t.id]),
    ),
  };
}
