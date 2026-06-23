"use server";

import { revalidatePath } from "next/cache";
import { requireTeacherProfile } from "@/lib/auth";
import { assignmentSchema, type AssignmentInput } from "@/lib/validations";
import { createAssignment, deleteAssignment } from "@/server/services/assignment.service";
import { fieldErrorsFromZod } from "./_helpers";

export async function createAssignmentAction(input: AssignmentInput) {
  const { user, teacher } = await requireTeacherProfile();
  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "ตรวจสอบข้อมูล", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  try {
    const count = await createAssignment(teacher.id, user.id, parsed.data);
    revalidatePath("/teacher/assignments", "layout");
    revalidatePath("/student/todos");
    return { ok: true as const, message: `มอบหมายงานเรียบร้อยแล้ว (${count} ห้อง)` };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "มอบหมายงานไม่สำเร็จ" };
  }
}

export async function deleteAssignmentAction(id: string) {
  const { teacher } = await requireTeacherProfile();
  await deleteAssignment(id, teacher.id);
  revalidatePath("/teacher/assignments", "layout");
  revalidatePath("/student/todos");
  return { ok: true as const };
}
