"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  teacherSchema,
  teacherUpdateSchema,
  studentSchema,
  studentUpdateSchema,
  classSchema,
  classUpdateSchema,
  subjectSchema,
  subjectUpdateSchema,
  scheduleSchema,
  scheduleUpdateSchema,
  announcementSchema,
} from "@/lib/validations";
import {
  createTeacher,
  updateTeacher,
  deleteTeacher,
  deleteTeachers,
  createStudent,
  updateStudent,
  deleteStudent,
  deleteStudents,
  createClass,
  updateClass,
  deleteClass,
  deleteClasses,
  createSubject,
  updateSubject,
  deleteSubject,
  deleteSubjects,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  deleteSchedules,
  bulkCreateSchedules,
  getImportLookups,
  exportTeachers,
  exportStudents,
  exportClasses,
  exportSubjects,
  exportSchedules,
  syncTeachers,
  syncStudents,
  syncClasses,
  syncSubjects,
  syncSchedules,
  type SyncResult,
} from "@/server/services/admin.service";
import { notifyUsers } from "@/server/services/notification.service";
import { NOTIFICATION_TYPES, ROLES } from "@/lib/constants";
import {
  fieldErrorsFromZod,
  fail,
  ok,
  type ActionState,
} from "./_helpers";

/** Prisma unique-constraint guard -> friendly message. */
function uniqueMessage(e: unknown, label: string): string | null {
  if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
    return `${label} นี้ถูกใช้งานแล้ว`;
  }
  return null;
}

/** Student-specific: surface the friendly "เลขที่ซ้ำ" message, plus the
 *  roll-number / email DB-unique backstops. */
function studentDupMessage(e: unknown): string | null {
  if (e instanceof Error && e.message.includes("เลขที่")) return e.message;
  if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
    const target = String((e as { meta?: { target?: unknown } }).meta?.target ?? "");
    if (target.includes("rollNumber")) return "เลขที่นี้ถูกใช้แล้วในห้องนี้";
    return "อีเมล/รหัสนักเรียน นี้ถูกใช้งานแล้ว";
  }
  return null;
}

/* -------------------------------- Teachers ------------------------------ */

export async function createTeacherAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = teacherSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  try {
    await createTeacher(parsed.data);
  } catch (e) {
    return fail(uniqueMessage(e, "อีเมล/รหัสครู") ?? "ไม่สามารถเพิ่มครูได้");
  }
  revalidatePath("/admin/teachers");
  return ok("เพิ่มครูเรียบร้อยแล้ว");
}

export async function deleteTeacherAction(id: string) {
  await requireAdmin();
  await deleteTeacher(id);
  revalidatePath("/admin/teachers");
  return { ok: true };
}

export async function updateTeacherAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = teacherUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  try {
    await updateTeacher(parsed.data);
  } catch (e) {
    return fail(uniqueMessage(e, "อีเมล/รหัสครู") ?? "ไม่สามารถแก้ไขครูได้");
  }
  revalidatePath("/admin/teachers");
  return ok("แก้ไขครูเรียบร้อยแล้ว");
}

export async function deleteTeachersAction(ids: string[]) {
  await requireAdmin();
  const count = await deleteTeachers(Array.isArray(ids) ? ids : []);
  revalidatePath("/admin/teachers");
  return { ok: true, count };
}

/* -------------------------------- Students ------------------------------ */

export async function createStudentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = studentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  try {
    await createStudent(parsed.data);
  } catch (e) {
    return fail(studentDupMessage(e) ?? "ไม่สามารถเพิ่มนักเรียนได้");
  }
  revalidatePath("/admin/students");
  return ok("เพิ่มนักเรียนเรียบร้อยแล้ว");
}

export async function deleteStudentAction(id: string) {
  await requireAdmin();
  await deleteStudent(id);
  revalidatePath("/admin/students");
  return { ok: true };
}

export async function updateStudentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = studentUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  try {
    await updateStudent(parsed.data);
  } catch (e) {
    return fail(studentDupMessage(e) ?? "ไม่สามารถแก้ไขนักเรียนได้");
  }
  revalidatePath("/admin/students");
  return ok("แก้ไขนักเรียนเรียบร้อยแล้ว");
}

export async function deleteStudentsAction(ids: string[]) {
  await requireAdmin();
  const count = await deleteStudents(Array.isArray(ids) ? ids : []);
  revalidatePath("/admin/students");
  return { ok: true, count };
}

/* --------------------------------- Classes ------------------------------ */

export async function createClassAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = classSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  try {
    await createClass(parsed.data);
  } catch (e) {
    return fail(uniqueMessage(e, "ชื่อห้อง") ?? "ไม่สามารถเพิ่มห้องเรียนได้");
  }
  revalidatePath("/admin/classes");
  return ok("เพิ่มห้องเรียนเรียบร้อยแล้ว");
}

export async function deleteClassAction(id: string) {
  await requireAdmin();
  try {
    await deleteClass(id);
  } catch {
    return { ok: false, error: "ลบไม่ได้ ห้องนี้ยังมีนักเรียนหรือตารางอยู่" };
  }
  revalidatePath("/admin/classes");
  return { ok: true };
}

export async function updateClassAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = classUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  try {
    await updateClass(parsed.data);
  } catch (e) {
    return fail(uniqueMessage(e, "ชื่อห้อง") ?? "ไม่สามารถแก้ไขห้องเรียนได้");
  }
  revalidatePath("/admin/classes");
  return ok("แก้ไขห้องเรียนเรียบร้อยแล้ว");
}

export async function deleteClassesAction(ids: string[]) {
  await requireAdmin();
  const count = await deleteClasses(Array.isArray(ids) ? ids : []);
  revalidatePath("/admin/classes");
  return { ok: true, count };
}

/* -------------------------------- Subjects ------------------------------ */

export async function createSubjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = subjectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  try {
    await createSubject(parsed.data);
  } catch (e) {
    return fail(uniqueMessage(e, "รหัสวิชา") ?? "ไม่สามารถเพิ่มวิชาได้");
  }
  revalidatePath("/admin/subjects");
  return ok("เพิ่มวิชาเรียบร้อยแล้ว");
}

export async function deleteSubjectAction(id: string) {
  await requireAdmin();
  try {
    await deleteSubject(id);
  } catch {
    return { ok: false, error: "ลบไม่ได้ วิชานี้ยังถูกใช้ในตารางสอน" };
  }
  revalidatePath("/admin/subjects");
  return { ok: true };
}

export async function updateSubjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = subjectUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  try {
    await updateSubject(parsed.data);
  } catch (e) {
    return fail(uniqueMessage(e, "รหัสวิชา") ?? "ไม่สามารถแก้ไขวิชาได้");
  }
  revalidatePath("/admin/subjects");
  return ok("แก้ไขวิชาเรียบร้อยแล้ว");
}

export async function deleteSubjectsAction(ids: string[]) {
  await requireAdmin();
  const count = await deleteSubjects(Array.isArray(ids) ? ids : []);
  revalidatePath("/admin/subjects");
  return { ok: true, count };
}

/* -------------------------------- Schedules ----------------------------- */

export async function createScheduleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = scheduleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  try {
    await createSchedule(parsed.data);
  } catch (e) {
    return fail(
      uniqueMessage(e, "คาบเรียนนี้ (ห้อง/วัน/คาบ)") ??
        "ไม่สามารถเพิ่มคาบเรียนได้",
    );
  }
  revalidatePath("/admin/schedule");
  return ok("เพิ่มคาบเรียนเรียบร้อยแล้ว");
}

export async function updateScheduleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = scheduleUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  try {
    await updateSchedule(parsed.data);
  } catch (e) {
    return fail(
      uniqueMessage(e, "คาบเรียนนี้ (ห้อง/วัน/คาบ)") ??
        "ไม่สามารถแก้ไขคาบเรียนได้",
    );
  }
  revalidatePath("/admin/schedule");
  return ok("แก้ไขคาบเรียนเรียบร้อยแล้ว");
}

export async function deleteScheduleAction(id: string) {
  await requireAdmin();
  await deleteSchedule(id);
  revalidatePath("/admin/schedule");
  return { ok: true };
}

export async function deleteSchedulesAction(ids: string[]) {
  await requireAdmin();
  const count = await deleteSchedules(Array.isArray(ids) ? ids : []);
  revalidatePath("/admin/schedule");
  return { ok: true, count };
}

/** Import timetable rows parsed client-side from CSV/Excel. */
export async function importSchedulesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("rows") ?? "[]"));
  } catch {
    return fail("ไฟล์ไม่ถูกต้อง");
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    return fail("ไม่พบข้อมูลในไฟล์");
  }

  const { classByName, subjectByCode, teacherByCode } = await getImportLookups();
  const resolved = [];
  let skipped = 0;

  for (const r of raw as Record<string, string>[]) {
    const classId = classByName.get(String(r.class ?? r.className ?? "").toUpperCase());
    const subjectId = subjectByCode.get(String(r.subjectCode ?? r.subject ?? "").toUpperCase());
    const teacherId = teacherByCode.get(String(r.teacherCode ?? r.teacher ?? "").toUpperCase());
    const candidate = scheduleSchema.safeParse({
      classId,
      subjectId,
      teacherId,
      day: String(r.day ?? "").toUpperCase().slice(0, 3),
      period: r.period,
      room: r.room,
    });
    if (candidate.success) resolved.push(candidate.data);
    else skipped++;
  }

  const inserted = await bulkCreateSchedules(resolved);
  revalidatePath("/admin/schedule");
  return ok(`นำเข้าสำเร็จ ${inserted} คาบ${skipped ? ` (ข้าม ${skipped} แถวที่ไม่ถูกต้อง)` : ""}`);
}

/* ------------------------------ Excel Export ---------------------------- */

type ExportResult =
  | { ok: true; base64: string; filename: string }
  | { ok: false; error: string };

function bufferToBase64(buf: Buffer): string {
  return Buffer.from(buf).toString("base64");
}

export async function exportTeachersAction(): Promise<ExportResult> {
  await requireAdmin();
  try {
    const buf = await exportTeachers();
    return { ok: true, base64: bufferToBase64(buf), filename: "teachers.xlsx" };
  } catch {
    return { ok: false, error: "สร้างไฟล์ครูไม่สำเร็จ" };
  }
}

export async function exportStudentsAction(): Promise<ExportResult> {
  await requireAdmin();
  try {
    const buf = await exportStudents();
    return { ok: true, base64: bufferToBase64(buf), filename: "students.xlsx" };
  } catch {
    return { ok: false, error: "สร้างไฟล์นักเรียนไม่สำเร็จ" };
  }
}

export async function exportClassesAction(): Promise<ExportResult> {
  await requireAdmin();
  try {
    const buf = await exportClasses();
    return { ok: true, base64: bufferToBase64(buf), filename: "classes.xlsx" };
  } catch {
    return { ok: false, error: "สร้างไฟล์ห้องเรียนไม่สำเร็จ" };
  }
}

export async function exportSubjectsAction(): Promise<ExportResult> {
  await requireAdmin();
  try {
    const buf = await exportSubjects();
    return { ok: true, base64: bufferToBase64(buf), filename: "subjects.xlsx" };
  } catch {
    return { ok: false, error: "สร้างไฟล์วิชาไม่สำเร็จ" };
  }
}

export async function exportSchedulesAction(): Promise<ExportResult> {
  await requireAdmin();
  try {
    const buf = await exportSchedules();
    return { ok: true, base64: bufferToBase64(buf), filename: "schedules.xlsx" };
  } catch {
    return { ok: false, error: "สร้างไฟล์ตารางสอนไม่สำเร็จ" };
  }
}

/* ------------------------------- Excel Sync ----------------------------- */

function syncMessage(label: string, r: SyncResult): string {
  return `Sync ${label}: เพิ่ม ${r.added} แก้ไข ${r.updated} ลบ ${r.deleted}${r.skipped ? ` ข้าม ${r.skipped}` : ""}`;
}

export async function syncTeachersAction(rows: unknown[]): Promise<ActionState> {
  await requireAdmin();
  if (!Array.isArray(rows)) return fail("ข้อมูลไม่ถูกต้อง");
  const res = await syncTeachers(rows as Record<string, unknown>[]);
  revalidatePath("/admin/teachers");
  return ok(syncMessage("ครู", res));
}

export async function syncStudentsAction(rows: unknown[]): Promise<ActionState> {
  await requireAdmin();
  if (!Array.isArray(rows)) return fail("ข้อมูลไม่ถูกต้อง");
  const res = await syncStudents(rows as Record<string, unknown>[]);
  revalidatePath("/admin/students");
  return ok(syncMessage("นักเรียน", res));
}

export async function syncClassesAction(rows: unknown[]): Promise<ActionState> {
  await requireAdmin();
  if (!Array.isArray(rows)) return fail("ข้อมูลไม่ถูกต้อง");
  const res = await syncClasses(rows as Record<string, unknown>[]);
  revalidatePath("/admin/classes");
  return ok(syncMessage("ห้องเรียน", res));
}

export async function syncSubjectsAction(rows: unknown[]): Promise<ActionState> {
  await requireAdmin();
  if (!Array.isArray(rows)) return fail("ข้อมูลไม่ถูกต้อง");
  const res = await syncSubjects(rows as Record<string, unknown>[]);
  revalidatePath("/admin/subjects");
  return ok(syncMessage("วิชา", res));
}

export async function syncSchedulesAction(rows: unknown[]): Promise<ActionState> {
  await requireAdmin();
  if (!Array.isArray(rows)) return fail("ข้อมูลไม่ถูกต้อง");
  const res = await syncSchedules(rows as Record<string, unknown>[]);
  revalidatePath("/admin/schedule");
  return ok(syncMessage("ตารางสอน", res));
}

/* ------------------------------ Announcements --------------------------- */

export async function createAnnouncementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    audience: formData.get("audience") || "ALL",
    isUrgent: formData.get("isUrgent") === "on" || formData.get("isUrgent") === "true",
  });
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));

  const announcement = await db.announcement.create({
    data: { ...parsed.data, authorId: admin.id },
  });

  const plainBody = parsed.data.body
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const where =
    parsed.data.audience === "TEACHERS"
      ? { role: ROLES.TEACHER }
      : parsed.data.audience === "STUDENTS"
        ? { role: ROLES.STUDENT }
        : {};
  const recipients = await db.user.findMany({ where, select: { id: true } });
  await notifyUsers(
    recipients.map((u) => u.id),
    {
      type: parsed.data.isUrgent
        ? NOTIFICATION_TYPES.EMERGENCY
        : NOTIFICATION_TYPES.ANNOUNCEMENT,
      title: parsed.data.isUrgent ? `⚠ ด่วน: ${parsed.data.title}` : parsed.data.title,
      message: plainBody.slice(0, 240),
      linkUrl: `/announcements/${announcement.id}`,
    },
  );

  revalidatePath("/admin/announcements");
  return ok(`ประกาศแล้ว แจ้งเตือน ${recipients.length} คน`);
}
