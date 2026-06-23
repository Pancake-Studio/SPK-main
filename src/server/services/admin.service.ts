import "server-only";

import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { SWAP_STATUS, ROLES, NOTIFICATION_TYPES } from "@/lib/constants";
import { notifyUsers } from "./notification.service";
import {
  teacherSchema,
  studentSchema,
  classSchema,
  subjectSchema,
  scheduleSchema,
} from "@/lib/validations";
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
  AdminInput,
  AdminUpdateInput,
  AnnouncementInput,
} from "@/lib/validations";

const DEFAULT_PASSWORD = "password123";

/* ---------------------------------- Admins ------------------------------ */

export function listAdmins() {
  return db.user.findMany({
    where: { role: ROLES.ADMIN },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function createAdmin(input: AdminInput) {
  const passwordHash = await hashPassword(input.password || DEFAULT_PASSWORD);
  return db.user.create({
    data: { email: input.email, passwordHash, role: ROLES.ADMIN, name: input.name },
  });
}

export async function updateAdmin(input: AdminUpdateInput) {
  const user = await db.user.findUnique({ where: { id: input.id }, select: { role: true } });
  if (!user || user.role !== ROLES.ADMIN) throw new Error("ไม่พบผู้ดูแลระบบ");
  await db.user.update({
    where: { id: input.id },
    data: {
      name: input.name,
      email: input.email,
      ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
    },
  });
}

/** Delete an admin. Refuses to remove yourself or the last remaining admin. */
export async function deleteAdmin(id: string, currentUserId: string) {
  if (id === currentUserId) throw new Error("ลบบัญชีของตัวเองไม่ได้");
  const count = await db.user.count({ where: { role: ROLES.ADMIN } });
  if (count <= 1) throw new Error("ต้องมีผู้ดูแลระบบอย่างน้อย 1 คน");
  const target = await db.user.findUnique({ where: { id }, select: { role: true } });
  if (!target || target.role !== ROLES.ADMIN) throw new Error("ไม่พบผู้ดูแลระบบ");
  await db.user.delete({ where: { id } });
}

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
    include: {
      user: true,
      advisorClass: { select: { className: true } },
      _count: { select: { schedules: true } },
    },
    orderBy: { teacherCode: "asc" },
  });
}

/** Advisors: a class may have multiple teachers. */
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
          advisorClassId: input.advisorClassId || null,
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
        advisorClassId: input.advisorClassId || null,
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

/** Paginated + searchable student list (ordered by class, then เลขที่). */
export async function listStudentsPaged(opts: {
  page?: number;
  pageSize?: number;
  q?: string;
  classId?: string;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, opts.pageSize ?? 25));
  const q = opts.q?.trim();
  const where = {
    ...(opts.classId ? { classId: opts.classId } : {}),
    ...(q
      ? { OR: [{ user: { name: { contains: q } } }, { studentCode: { contains: q } }] }
      : {}),
  };
  const [total, rows] = await Promise.all([
    db.student.count({ where }),
    db.student.findMany({
      where,
      include: { user: true, class: true },
      orderBy: [{ class: { className: "asc" } }, { rollNumber: "asc" }, { studentCode: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { rows, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Reject a roll number already used by another student in the same class. */
async function assertRollFree(classId: string, rollNumber?: number | null, excludeStudentId?: string) {
  if (rollNumber == null) return;
  const taken = await db.student.findFirst({
    where: { classId, rollNumber, ...(excludeStudentId ? { id: { not: excludeStudentId } } : {}) },
    select: { id: true },
  });
  if (taken) throw new Error(`เลขที่ ${rollNumber} มีอยู่แล้วในห้องนี้`);
}

export async function createStudent(input: StudentInput) {
  await assertRollFree(input.classId, input.rollNumber);
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

export async function deleteStudent(studentId: string) {
  const student = await db.student.findUnique({ where: { id: studentId } });
  if (!student) return;
  await db.user.delete({ where: { id: student.userId } });
}

export async function updateStudent(input: StudentUpdateInput) {
  const student = await db.student.findUnique({ where: { id: input.id }, select: { userId: true } });
  if (!student) throw new Error("ไม่พบข้อมูลนักเรียน");
  await assertRollFree(input.classId, input.rollNumber, input.id);
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
        title: input.title || null,
        rollNumber: input.rollNumber ?? null,
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

/** Create an announcement and fan out notifications to its audience. Shared by
 *  admins and teachers (any teacher may post). Returns the recipient count. */
export async function createAnnouncement(
  authorId: string,
  input: AnnouncementInput,
): Promise<number> {
  const announcement = await db.announcement.create({
    data: { ...input, authorId },
  });

  const plainBody = input.body
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const where =
    input.audience === "TEACHERS"
      ? { role: ROLES.TEACHER }
      : input.audience === "STUDENTS"
        ? { role: ROLES.STUDENT }
        : {};
  const recipients = await db.user.findMany({ where, select: { id: true } });
  await notifyUsers(
    recipients.map((u) => u.id),
    {
      type: input.isUrgent ? NOTIFICATION_TYPES.EMERGENCY : NOTIFICATION_TYPES.ANNOUNCEMENT,
      title: input.isUrgent ? `⚠ ด่วน: ${input.title}` : input.title,
      message: plainBody.slice(0, 240),
      linkUrl: `/announcements/${announcement.id}`,
    },
  );

  return recipients.length;
}

/** Lookup maps used to resolve CSV codes -> ids during import. */
export async function getImportLookups() {
  const [classes, subjects, teachers] = await Promise.all([
    db.class.findMany({ select: { id: true, className: true } }),
    db.subject.findMany({ select: { id: true, subjectCode: true } }),
    db.teacher.findMany({ select: { id: true, teacherCode: true } }),
  ]);
  return {
    classes,
    classByName: new Map(classes.map((c) => [c.className.toUpperCase(), c.id])),
    classById: new Map(classes.map((c) => [c.id, c.className])),
    subjectByCode: new Map(
      subjects.map((s) => [s.subjectCode.toUpperCase(), s.id]),
    ),
    teacherByCode: new Map(
      teachers.map((t) => [t.teacherCode.toUpperCase(), t.id]),
    ),
  };
}

/** Expand a class name into all class IDs that belong to the same group.
 *
 *  Examples:
 *    - "M.5/3.2"  -> [id of M.5/3.2]
 *    - "M.5/3"    -> [id of M.5/3, id of M.5/3.1, id of M.5/3.2, ...]
 *      (only when sub-rooms like M.5/3.x exist)
 */
export function expandClassGroupIds(
  className: string,
  classes: { id: string; className: string }[],
): string[] {
  const normalized = className.toUpperCase().trim();
  const byName = new Map(classes.map((c) => [c.className.toUpperCase(), c]));
  const exact = byName.get(normalized);

  // If the requested name already points to a dotted sub-room, keep it exact.
  if (normalized.includes(".")) {
    return exact ? [exact.id] : [];
  }

  const prefix = `${normalized}.`;
  const subRooms = classes
    .filter((c) => c.className.toUpperCase().startsWith(prefix))
    .sort((a, b) => a.className.localeCompare(b.className));

  if (subRooms.length === 0) {
    return exact ? [exact.id] : [];
  }

  // Base group + every sub-room.
  const result = subRooms.map((c) => c.id);
  if (exact) result.unshift(exact.id);
  return result;
}

/* ------------------------------- Excel Export --------------------------- */

function bookFromRows(rows: Record<string, unknown>[], columns: string[], sheetName: string): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, { header: columns });
  // Ensure every declared header is present in row 0 even if data is empty.
  for (let i = 0; i < columns.length; i++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!ws[ref]) ws[ref] = { t: "s", v: columns[i] };
  }
  // Freeze the header row and add an autofilter.
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  ws["!autofilter"] = { ref: ws["!ref"] ?? `A1:${XLSX.utils.encode_col(columns.length - 1)}1` };
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export async function exportTeachers() {
  const rows = await db.teacher.findMany({
    include: { user: true },
    orderBy: { teacherCode: "asc" },
  });
  const columns = ["teacherCode", "name", "email", "title", "department", "phone"];
  return bookFromRows(
    rows.map((t) => ({
      teacherCode: t.teacherCode,
      name: t.user.name,
      email: t.user.email,
      title: t.title ?? "",
      department: t.department ?? "",
      phone: t.phone ?? "",
    })),
    columns,
    "Teachers",
  );
}

export async function exportStudents() {
  const rows = await db.student.findMany({
    include: { user: true, class: true },
    orderBy: [{ class: { className: "asc" } }, { rollNumber: "asc" }, { studentCode: "asc" }],
  });
  const columns = ["studentCode", "rollNumber", "title", "name", "email", "className"];
  return bookFromRows(
    rows.map((s) => ({
      studentCode: s.studentCode,
      rollNumber: s.rollNumber ?? "",
      title: s.title ?? "",
      name: s.user.name,
      email: s.user.email,
      className: s.class?.className ?? "",
    })),
    columns,
    "Students",
  );
}

export async function exportClasses() {
  const rows = await db.class.findMany({ orderBy: { className: "asc" } });
  const columns = ["className", "gradeLevel", "room"];
  return bookFromRows(
    rows.map((c) => ({
      className: c.className,
      gradeLevel: c.gradeLevel,
      room: c.room ?? "",
    })),
    columns,
    "Classes",
  );
}

export async function exportSubjects() {
  const rows = await db.subject.findMany({ orderBy: { subjectCode: "asc" } });
  const columns = ["subjectCode", "subjectName", "colorHex"];
  return bookFromRows(
    rows.map((s) => ({
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      colorHex: s.colorHex ?? "",
    })),
    columns,
    "Subjects",
  );
}

export async function exportSchedules() {
  const rows = await db.schedule.findMany({
    include: {
      class: true,
      subject: true,
      teacher: { include: { user: true } },
    },
    orderBy: [{ class: { className: "asc" } }, { day: "asc" }, { period: "asc" }],
  });
  const columns = ["className", "subjectCode", "teacherCode", "day", "period", "room"];
  return bookFromRows(
    rows.map((s) => ({
      className: s.class.className,
      subjectCode: s.subject.subjectCode,
      teacherCode: s.teacher.teacherCode,
      day: s.day,
      period: s.period,
      room: s.room ?? "",
    })),
    columns,
    "Schedules",
  );
}

/* ------------------------------- Excel Sync ----------------------------- */

export type SyncResult = {
  added: number;
  updated: number;
  deleted: number;
  skipped: number;
};

type SyncRow = Record<string, unknown>;

function str(row: SyncRow, key: string): string {
  const v = row[key];
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

export async function syncTeachers(rows: SyncRow[]): Promise<SyncResult> {
  const existing = await db.teacher.findMany({ include: { user: true } });
  const byCode = new Map(existing.map((t) => [t.teacherCode.toUpperCase(), t]));
  const seen = new Set<string>();
  const result: SyncResult = { added: 0, updated: 0, deleted: 0, skipped: 0 };

  for (const row of rows) {
    const parsed = teacherSchema.safeParse({
      name: str(row, "name"),
      email: str(row, "email"),
      teacherCode: str(row, "teacherCode"),
      title: str(row, "title") || undefined,
      department: str(row, "department") || undefined,
      phone: str(row, "phone") || undefined,
      password: undefined,
    });
    if (!parsed.success) {
      result.skipped++;
      continue;
    }
    const code = parsed.data.teacherCode.toUpperCase();
    seen.add(code);
    const cur = byCode.get(code);
    try {
      if (cur) {
        await updateTeacher({ ...parsed.data, id: cur.id });
        result.updated++;
      } else {
        await createTeacher(parsed.data);
        result.added++;
      }
    } catch {
      result.skipped++;
    }
  }

  const missing = existing.filter((t) => !seen.has(t.teacherCode.toUpperCase())).map((t) => t.id);
  if (missing.length > 0) {
    try {
      await deleteTeachers(missing);
      result.deleted += missing.length;
    } catch {
      /* ignore delete failures */
    }
  }
  return result;
}

export async function syncStudents(rows: SyncRow[]): Promise<SyncResult> {
  const [existing, classes] = await Promise.all([
    db.student.findMany({ include: { user: true } }),
    db.class.findMany({ select: { id: true, className: true } }),
  ]);
  const byCode = new Map(existing.map((s) => [s.studentCode.toUpperCase(), s]));
  const classByName = new Map(classes.map((c) => [c.className.toUpperCase(), c.id]));
  const seen = new Set<string>();
  const result: SyncResult = { added: 0, updated: 0, deleted: 0, skipped: 0 };

  for (const row of rows) {
    const classId = classByName.get(str(row, "className").toUpperCase());
    const parsed = studentSchema.safeParse({
      name: str(row, "name"),
      email: str(row, "email"),
      studentCode: str(row, "studentCode"),
      title: str(row, "title") || undefined,
      rollNumber: str(row, "rollNumber") || undefined,
      classId,
      password: undefined,
    });
    if (!parsed.success) {
      result.skipped++;
      continue;
    }
    const code = parsed.data.studentCode.toUpperCase();
    seen.add(code);
    const cur = byCode.get(code);
    try {
      if (cur) {
        await updateStudent({ ...parsed.data, id: cur.id });
        result.updated++;
      } else {
        await createStudent(parsed.data);
        result.added++;
      }
    } catch {
      result.skipped++;
    }
  }

  const missing = existing.filter((s) => !seen.has(s.studentCode.toUpperCase())).map((s) => s.id);
  if (missing.length > 0) {
    try {
      await deleteStudents(missing);
      result.deleted += missing.length;
    } catch {
      /* ignore */
    }
  }
  return result;
}

export async function syncClasses(rows: SyncRow[]): Promise<SyncResult> {
  const existing = await db.class.findMany();
  const byName = new Map(existing.map((c) => [c.className.toUpperCase(), c]));
  const seen = new Set<string>();
  const result: SyncResult = { added: 0, updated: 0, deleted: 0, skipped: 0 };

  for (const row of rows) {
    const parsed = classSchema.safeParse({
      className: str(row, "className"),
      gradeLevel: str(row, "gradeLevel"),
      room: str(row, "room") || undefined,
    });
    if (!parsed.success) {
      result.skipped++;
      continue;
    }
    const name = parsed.data.className.toUpperCase();
    seen.add(name);
    const cur = byName.get(name);
    try {
      if (cur) {
        await updateClass({ ...parsed.data, id: cur.id });
        result.updated++;
      } else {
        await createClass(parsed.data);
        result.added++;
      }
    } catch {
      result.skipped++;
    }
  }

  const missing = existing.filter((c) => !seen.has(c.className.toUpperCase())).map((c) => c.id);
  if (missing.length > 0) {
    try {
      await deleteClasses(missing);
      result.deleted += missing.length;
    } catch {
      /* ignore */
    }
  }
  return result;
}

export async function syncSubjects(rows: SyncRow[]): Promise<SyncResult> {
  const existing = await db.subject.findMany();
  const byCode = new Map(existing.map((s) => [s.subjectCode.toUpperCase(), s]));
  const seen = new Set<string>();
  const result: SyncResult = { added: 0, updated: 0, deleted: 0, skipped: 0 };

  for (const row of rows) {
    const parsed = subjectSchema.safeParse({
      subjectName: str(row, "subjectName"),
      subjectCode: str(row, "subjectCode"),
      colorHex: str(row, "colorHex") || undefined,
    });
    if (!parsed.success) {
      result.skipped++;
      continue;
    }
    const code = parsed.data.subjectCode.toUpperCase();
    seen.add(code);
    const cur = byCode.get(code);
    try {
      if (cur) {
        await updateSubject({ ...parsed.data, id: cur.id });
        result.updated++;
      } else {
        await createSubject(parsed.data);
        result.added++;
      }
    } catch {
      result.skipped++;
    }
  }

  const missing = existing.filter((s) => !seen.has(s.subjectCode.toUpperCase())).map((s) => s.id);
  if (missing.length > 0) {
    try {
      await deleteSubjects(missing);
      result.deleted += missing.length;
    } catch {
      /* ignore */
    }
  }
  return result;
}

export async function syncSchedules(rows: SyncRow[]): Promise<SyncResult> {
  const [existing, { classes, classById, subjectByCode, teacherByCode }] = await Promise.all([
    db.schedule.findMany({ include: { class: true } }),
    getImportLookups(),
  ]);
  const keyToId = new Map(existing.map((s) => [`${s.class.className.toUpperCase()}|${s.day}|${s.period}`, s.id]));
  const seen = new Set<string>();
  const result: SyncResult = { added: 0, updated: 0, deleted: 0, skipped: 0 };

  for (const row of rows) {
    const className = str(row, "className").toUpperCase();
    const groupIds = expandClassGroupIds(className, classes);
    const subjectId = subjectByCode.get(str(row, "subjectCode").toUpperCase());
    const rawTeacherCode = str(row, "teacherCode").toUpperCase();
    // Excel often drops leading zeros from numeric teacher codes (101 -> "0101").
    // Fall back to a zero-padded 4-digit lookup before giving up.
    const teacherId =
      teacherByCode.get(rawTeacherCode) ??
      (/^\d+$/.test(rawTeacherCode)
        ? teacherByCode.get(rawTeacherCode.padStart(4, "0"))
        : undefined);
    const day = str(row, "day").toUpperCase().slice(0, 3);
    const period = row.period;

    if (groupIds.length === 0) {
      result.skipped++;
      continue;
    }

    // Validate once; classId is the only field that varies inside the group.
    const parsed = scheduleSchema.safeParse({
      classId: groupIds[0],
      subjectId,
      teacherId,
      day,
      period,
      room: str(row, "room") || undefined,
    });
    if (!parsed.success) {
      result.skipped++;
      continue;
    }

    for (const classId of groupIds) {
      const name = classById.get(classId)?.toUpperCase() ?? "";
      const key = `${name}|${parsed.data.day}|${parsed.data.period}`;
      seen.add(key);
      const curId = keyToId.get(key);
      try {
        if (curId) {
          await updateSchedule({ ...parsed.data, id: curId, classId });
          result.updated++;
        } else {
          const created = await createSchedule({ ...parsed.data, classId });
          keyToId.set(key, created.id);
          result.added++;
        }
      } catch {
        result.skipped++;
      }
    }
  }

  const missing = existing.filter((s) => !seen.has(`${s.class.className.toUpperCase()}|${s.day}|${s.period}`)).map((s) => s.id);
  if (missing.length > 0) {
    try {
      await deleteSchedules(missing);
      result.deleted += missing.length;
    } catch {
      /* ignore */
    }
  }
  return result;
}
