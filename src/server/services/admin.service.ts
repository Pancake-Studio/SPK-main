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
  TeacherUpdateInput,
  StudentUpdateInput,
  ClassUpdateInput,
  SubjectUpdateInput,
  ScheduleUpdateInput,
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
  const scheduleIds = (
    await db.schedule.findMany({ where: { teacherId }, select: { id: true } })
  ).map((s) => s.id);
  // Clear swap requests tied to this teacher (as participant or via their slots)
  // and their schedules first; then removing the user cascades teacher + sessions.
  await db.$transaction([
    db.swapRequest.deleteMany({
      where: {
        OR: [
          { requesterId: teacherId },
          { targetTeacherId: teacherId },
          { sourceScheduleId: { in: scheduleIds } },
          { targetScheduleId: { in: scheduleIds } },
        ],
      },
    }),
    db.schedule.deleteMany({ where: { teacherId } }),
    db.user.delete({ where: { id: teacher.userId } }),
  ]);
}

export async function updateTeacher(input: TeacherUpdateInput) {
  const teacher = await db.teacher.findUnique({ where: { id: input.id }, select: { userId: true } });
  if (!teacher) throw new Error("ไม่พบข้อมูลครู");
  const updates: { passwordHash?: string } = {};
  if (input.password) {
    updates.passwordHash = await hashPassword(input.password);
  }
  await db.$transaction([
    db.user.update({
      where: { id: teacher.userId },
      data: {
        name: input.name,
        email: input.email,
        ...(input.password ? updates : {}),
      },
    }),
    db.teacher.update({
      where: { id: input.id },
      data: {
        teacherCode: input.teacherCode,
        title: input.title || null,
        department: input.department || null,
        phone: input.phone || null,
      },
    }),
  ]);
}

export async function deleteTeachers(ids: string[]) {
  if (ids.length === 0) return 0;
  const teachers = await db.teacher.findMany({ where: { id: { in: ids } }, select: { id: true, userId: true } });
  if (teachers.length === 0) return 0;
  const userIds = teachers.map((t) => t.userId);
  const scheduleIds = (
    await db.schedule.findMany({ where: { teacherId: { in: ids } }, select: { id: true } })
  ).map((s) => s.id);
  await db.$transaction([
    db.swapRequest.deleteMany({
      where: {
        OR: [
          { requesterId: { in: ids } },
          { targetTeacherId: { in: ids } },
          { sourceScheduleId: { in: scheduleIds } },
          { targetScheduleId: { in: scheduleIds } },
        ],
      },
    }),
    db.schedule.deleteMany({ where: { teacherId: { in: ids } } }),
    db.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);
  return teachers.length;
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

export async function updateStudent(input: StudentUpdateInput) {
  const student = await db.student.findUnique({ where: { id: input.id }, select: { userId: true } });
  if (!student) throw new Error("ไม่พบข้อมูลนักเรียน");
  const updates: { passwordHash?: string } = {};
  if (input.password) {
    updates.passwordHash = await hashPassword(input.password);
  }
  await db.$transaction([
    db.user.update({
      where: { id: student.userId },
      data: {
        name: input.name,
        email: input.email,
        ...(input.password ? updates : {}),
      },
    }),
    db.student.update({
      where: { id: input.id },
      data: {
        studentCode: input.studentCode,
        classId: input.classId,
      },
    }),
  ]);
}

export async function deleteStudents(ids: string[]) {
  if (ids.length === 0) return 0;
  const students = await db.student.findMany({ where: { id: { in: ids } }, select: { userId: true } });
  if (students.length === 0) return 0;
  const userIds = students.map((s) => s.userId);
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  return students.length;
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

export async function updateClass(input: ClassUpdateInput) {
  return db.class.update({
    where: { id: input.id },
    data: {
      className: input.className,
      gradeLevel: input.gradeLevel,
      room: input.room || null,
    },
  });
}

export async function deleteClass(id: string) {
  const scheduleIds = (
    await db.schedule.findMany({ where: { classId: id }, select: { id: true } })
  ).map((s) => s.id);
  // Remove swap requests on this class's slots first; Class→Schedule cascades.
  await db.$transaction([
    db.swapRequest.deleteMany({
      where: {
        OR: [
          { sourceScheduleId: { in: scheduleIds } },
          { targetScheduleId: { in: scheduleIds } },
        ],
      },
    }),
    db.class.delete({ where: { id } }),
  ]);
}

export async function deleteClasses(ids: string[]) {
  if (ids.length === 0) return 0;
  const scheduleIds = (
    await db.schedule.findMany({ where: { classId: { in: ids } }, select: { id: true } })
  ).map((s) => s.id);
  await db.$transaction([
    db.swapRequest.deleteMany({
      where: {
        OR: [
          { sourceScheduleId: { in: scheduleIds } },
          { targetScheduleId: { in: scheduleIds } },
        ],
      },
    }),
    db.class.deleteMany({ where: { id: { in: ids } } }),
  ]);
  return ids.length;
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

export async function updateSubject(input: SubjectUpdateInput) {
  return db.subject.update({
    where: { id: input.id },
    data: {
      subjectName: input.subjectName,
      subjectCode: input.subjectCode,
      colorHex: input.colorHex || null,
    },
  });
}

export async function deleteSubject(id: string) {
  const scheduleIds = (
    await db.schedule.findMany({ where: { subjectId: id }, select: { id: true } })
  ).map((s) => s.id);
  // Remove swap requests on this subject's slots, then the slots, then the subject.
  await db.$transaction([
    db.swapRequest.deleteMany({
      where: {
        OR: [
          { sourceScheduleId: { in: scheduleIds } },
          { targetScheduleId: { in: scheduleIds } },
        ],
      },
    }),
    db.schedule.deleteMany({ where: { subjectId: id } }),
    db.subject.delete({ where: { id } }),
  ]);
}

export async function deleteSubjects(ids: string[]) {
  if (ids.length === 0) return 0;
  const scheduleIds = (
    await db.schedule.findMany({ where: { subjectId: { in: ids } }, select: { id: true } })
  ).map((s) => s.id);
  await db.$transaction([
    db.swapRequest.deleteMany({
      where: {
        OR: [
          { sourceScheduleId: { in: scheduleIds } },
          { targetScheduleId: { in: scheduleIds } },
        ],
      },
    }),
    db.schedule.deleteMany({ where: { subjectId: { in: ids } } }),
    db.subject.deleteMany({ where: { id: { in: ids } } }),
  ]);
  return ids.length;
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

export async function updateSchedule(input: ScheduleUpdateInput) {
  return db.schedule.update({
    where: { id: input.id },
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

export async function deleteSchedule(id: string) {
  // A schedule may be referenced by swap requests (source/target). Remove those
  // first (their swap logs cascade) so the FK constraint doesn't block deletion.
  await db.$transaction([
    db.swapRequest.deleteMany({
      where: { OR: [{ sourceScheduleId: id }, { targetScheduleId: id }] },
    }),
    db.schedule.delete({ where: { id } }),
  ]);
}

/** Bulk-delete several schedules at once (admin multi-select). */
export async function deleteSchedules(ids: string[]) {
  if (ids.length === 0) return 0;
  await db.$transaction([
    db.swapRequest.deleteMany({
      where: {
        OR: [{ sourceScheduleId: { in: ids } }, { targetScheduleId: { in: ids } }],
      },
    }),
    db.schedule.deleteMany({ where: { id: { in: ids } } }),
  ]);
  return ids.length;
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
