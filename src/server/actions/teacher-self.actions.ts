"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher, requireTeacherProfile } from "@/lib/auth";
import {
  subjectSchema,
  subjectUpdateSchema,
  ownScheduleSchema,
  studentSchema,
  studentUpdateSchema,
  announcementSchema,
} from "@/lib/validations";
import { createAnnouncement } from "@/server/services/admin.service";
import {
  createOwnSubject,
  updateOwnSubject,
  deleteOwnSubject,
  createOwnSchedule,
  updateOwnSchedule,
  deleteOwnSchedule,
  getAdvisorClass,
  createAdvisoryStudent,
  updateAdvisoryStudent,
  deleteAdvisoryStudent,
  TeacherSelfError,
} from "@/server/services/teacher-self.service";
import { fieldErrorsFromZod, fail, ok, type ActionState } from "./_helpers";

function errMessage(e: unknown, fallback: string): string {
  if (e instanceof TeacherSelfError) return e.message;
  if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
    return "ข้อมูลซ้ำกับที่มีอยู่แล้ว (รหัส/อีเมล/คาบ)";
  }
  return fallback;
}

/* -------------------------------- Subjects ------------------------------ */

export async function createOwnSubjectAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  const { teacher } = await requireTeacherProfile();
  const parsed = subjectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  try {
    await createOwnSubject(teacher.id, parsed.data);
  } catch (e) {
    return fail(errMessage(e, "ไม่สามารถเพิ่มวิชาได้"));
  }
  revalidatePath("/teacher/subjects");
  return ok("เพิ่มวิชาเรียบร้อยแล้ว");
}

export async function updateOwnSubjectAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  const { teacher } = await requireTeacherProfile();
  const parsed = subjectUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  try {
    await updateOwnSubject(teacher.id, parsed.data);
  } catch (e) {
    return fail(errMessage(e, "ไม่สามารถแก้ไขวิชาได้"));
  }
  revalidatePath("/teacher/subjects");
  return ok("แก้ไขวิชาเรียบร้อยแล้ว");
}

export async function deleteOwnSubjectAction(id: string) {
  const { teacher } = await requireTeacherProfile();
  try {
    await deleteOwnSubject(teacher.id, id);
  } catch (e) {
    return { ok: false, error: errMessage(e, "ลบไม่สำเร็จ") };
  }
  revalidatePath("/teacher/subjects");
  return { ok: true };
}

/* -------------------------------- Schedule ------------------------------ */

export async function deleteOwnScheduleAction(id: string) {
  const { teacher } = await requireTeacherProfile();
  try {
    await deleteOwnSchedule(teacher.id, id);
  } catch (e) {
    return { ok: false, error: errMessage(e, "ลบไม่สำเร็จ") };
  }
  revalidatePath("/teacher/schedule/manage");
  revalidatePath("/teacher/schedule");
  return { ok: true };
}

export type OwnSlotInput = {
  id?: string;
  classId: string;
  subjectId: string;
  // teacherId is accepted for a uniform editor signature but IGNORED — the
  // signed-in teacher is always forced server-side.
  teacherId?: string;
  day: string;
  period: number;
  room?: string;
};

/** Grid-editor save (create or update one of the teacher's own slots). */
export async function saveOwnScheduleSlotAction(
  input: OwnSlotInput,
): Promise<{ ok: boolean; error?: string }> {
  const { teacher } = await requireTeacherProfile();
  const parsed = ownScheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  try {
    if (input.id) await updateOwnSchedule(teacher.id, { ...parsed.data, id: input.id });
    else await createOwnSchedule(teacher.id, parsed.data);
  } catch (e) {
    return { ok: false, error: errMessage(e, "บันทึกไม่สำเร็จ") };
  }
  revalidatePath("/teacher/schedule/manage");
  revalidatePath("/teacher/schedule");
  return { ok: true };
}

/* --------------------------- Advisory students -------------------------- */

async function requireAdvisorClass() {
  const { teacher } = await requireTeacherProfile();
  const klass = await getAdvisorClass(teacher.id);
  return { teacher, klass };
}

export async function createAdvisoryStudentAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  const { klass } = await requireAdvisorClass();
  if (!klass) return fail("คุณไม่ได้เป็นครูที่ปรึกษาของห้องใด");
  // classId comes from the form (the chosen room); the service checks it belongs
  // to the advisor's class or one of its sub-rooms.
  const parsed = studentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  try {
    await createAdvisoryStudent(klass.id, parsed.data);
  } catch (e) {
    return fail(errMessage(e, "ไม่สามารถเพิ่มนักเรียนได้"));
  }
  revalidatePath("/teacher/advisory");
  return ok("เพิ่มนักเรียนเรียบร้อยแล้ว");
}

export async function updateAdvisoryStudentAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  const { klass } = await requireAdvisorClass();
  if (!klass) return fail("คุณไม่ได้เป็นครูที่ปรึกษาของห้องใด");
  const parsed = studentUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  try {
    await updateAdvisoryStudent(klass.id, parsed.data);
  } catch (e) {
    return fail(errMessage(e, "ไม่สามารถแก้ไขนักเรียนได้"));
  }
  revalidatePath("/teacher/advisory");
  return ok("แก้ไขนักเรียนเรียบร้อยแล้ว");
}

export async function deleteAdvisoryStudentAction(id: string) {
  const { klass } = await requireAdvisorClass();
  if (!klass) return { ok: false, error: "คุณไม่ได้เป็นครูที่ปรึกษาของห้องใด" };
  try {
    await deleteAdvisoryStudent(klass.id, id);
  } catch (e) {
    return { ok: false, error: errMessage(e, "ลบไม่สำเร็จ") };
  }
  revalidatePath("/teacher/advisory");
  return { ok: true };
}

/* ----------------------------- Announcements ---------------------------- */

/** Any teacher may post an announcement. */
export async function createTeacherAnnouncementAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireTeacher();
  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    audience: formData.get("audience") || "ALL",
    isUrgent: formData.get("isUrgent") === "on" || formData.get("isUrgent") === "true",
  });
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));

  const count = await createAnnouncement(user.id, parsed.data);
  revalidatePath("/teacher/announcements");
  return ok(`ประกาศแล้ว แจ้งเตือน ${count} คน`);
}
