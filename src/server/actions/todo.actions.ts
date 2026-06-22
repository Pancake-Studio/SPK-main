"use server";

import { revalidatePath } from "next/cache";
import { requireStudentProfile } from "@/lib/auth";
import { personalTodoSchema, type PersonalTodoInput } from "@/lib/validations";
import {
  setSubmissionDone,
  submitSubmissionFiles,
  removeSubmissionFile,
  createPersonalTodo,
  updatePersonalTodo,
  setPersonalTodoDone,
  deletePersonalTodo,
} from "@/server/services/todo.service";
import { fieldErrorsFromZod } from "./_helpers";

function revalidate() {
  revalidatePath("/student/todos");
  revalidatePath("/student");
}

/* ----------------------------- assigned -------------------------------- */

export async function toggleSubmissionAction(submissionId: string, done: boolean) {
  const { student } = await requireStudentProfile();
  await setSubmissionDone(submissionId, student.id, done);
  revalidate();
  return { ok: true as const };
}

export async function submitFilesAction(submissionId: string, attachmentIds: string[]) {
  const { user, student } = await requireStudentProfile();
  try {
    await submitSubmissionFiles(submissionId, student.id, user.id, attachmentIds ?? []);
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "ส่งงานไม่สำเร็จ" };
  }
  revalidate();
  return { ok: true as const, message: "ส่งงานเรียบร้อยแล้ว" };
}

export async function removeSubmissionFileAction(attachmentId: string) {
  const { user } = await requireStudentProfile();
  await removeSubmissionFile(attachmentId, user.id);
  revalidate();
  return { ok: true as const };
}

/* ----------------------------- personal -------------------------------- */

export async function createPersonalTodoAction(input: PersonalTodoInput) {
  const { student } = await requireStudentProfile();
  const parsed = personalTodoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "ตรวจสอบข้อมูล", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  await createPersonalTodo(student.id, parsed.data);
  revalidate();
  return { ok: true as const, message: "เพิ่มงานแล้ว" };
}

export async function updatePersonalTodoAction(id: string, input: PersonalTodoInput) {
  const { student } = await requireStudentProfile();
  const parsed = personalTodoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "ตรวจสอบข้อมูล", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  await updatePersonalTodo(id, student.id, parsed.data);
  revalidate();
  return { ok: true as const, message: "บันทึกแล้ว" };
}

export async function togglePersonalTodoAction(id: string, done: boolean) {
  const { student } = await requireStudentProfile();
  await setPersonalTodoDone(id, student.id, done);
  revalidate();
  return { ok: true as const };
}

export async function deletePersonalTodoAction(id: string) {
  const { student } = await requireStudentProfile();
  await deletePersonalTodo(id, student.id);
  revalidate();
  return { ok: true as const };
}
