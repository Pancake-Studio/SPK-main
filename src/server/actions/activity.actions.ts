"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { activitySchema, activityUpdateSchema } from "@/lib/validations";
import {
  createActivityPeriod,
  updateActivityPeriod,
  deleteActivityPeriod,
} from "@/server/services/activity.service";
import { fieldErrorsFromZod, fail, ok, type ActionState } from "./_helpers";

function uniqueSlot(e: unknown): boolean {
  return Boolean(e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002");
}

export async function createActivityAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = activitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  try {
    await createActivityPeriod(parsed.data);
  } catch (e) {
    return fail(uniqueSlot(e) ? "วัน/คาบนี้มีกิจกรรมอยู่แล้ว" : "ไม่สามารถเพิ่มคาบกิจกรรมได้");
  }
  revalidatePath("/admin/activities");
  return ok("เพิ่มคาบกิจกรรมเรียบร้อยแล้ว");
}

export async function updateActivityAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = activityUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  try {
    await updateActivityPeriod(parsed.data);
  } catch (e) {
    return fail(uniqueSlot(e) ? "วัน/คาบนี้มีกิจกรรมอยู่แล้ว" : "ไม่สามารถแก้ไขคาบกิจกรรมได้");
  }
  revalidatePath("/admin/activities");
  return ok("แก้ไขคาบกิจกรรมเรียบร้อยแล้ว");
}

export async function deleteActivityAction(id: string) {
  await requireAdmin();
  await deleteActivityPeriod(id);
  revalidatePath("/admin/activities");
  return { ok: true };
}
