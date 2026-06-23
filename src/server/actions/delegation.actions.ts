"use server";

import { revalidatePath } from "next/cache";
import { requireTeacherProfile, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createDelegationSchema } from "@/lib/validations";
import {
  createDelegation,
  cancelDelegation,
  declineDelegation,
  DelegationError,
} from "@/server/services/delegation.service";
import { fieldErrorsFromZod, fail, ok, type ActionState } from "./_helpers";

async function teacherIdForUser(userId: string): Promise<string | null> {
  const t = await db.teacher.findUnique({ where: { userId }, select: { id: true } });
  return t?.id ?? null;
}

export async function createDelegationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { teacher } = await requireTeacherProfile();

  const parsed = createDelegationSchema.safeParse({
    scheduleId: formData.get("scheduleId"),
    toTeacherId: formData.get("toTeacherId"),
    weekDate: formData.get("weekDate"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) {
    return fail("กรุณาตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  }

  try {
    await createDelegation({
      ownerTeacherId: teacher.id,
      scheduleId: parsed.data.scheduleId,
      toTeacherId: parsed.data.toTeacherId,
      weekDate: parsed.data.weekDate,
      reason: parsed.data.reason,
    });
  } catch (e) {
    if (e instanceof DelegationError) return fail(e.message);
    throw e;
  }

  revalidatePath("/teacher/delegations");
  revalidatePath("/teacher/schedule");
  return ok("ฝากคาบเรียบร้อยแล้ว");
}

export async function decideDelegationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const actor = { userId: user.id, role: user.role, teacherId: await teacherIdForUser(user.id) };

  const id = String(formData.get("delegationId") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!id || (action !== "CANCEL" && action !== "DECLINE")) {
    return fail("คำขอไม่ถูกต้อง");
  }

  try {
    if (action === "CANCEL") await cancelDelegation(id, actor);
    else await declineDelegation(id, actor);
  } catch (e) {
    if (e instanceof DelegationError) return fail(e.message);
    throw e;
  }

  revalidatePath("/teacher/delegations");
  revalidatePath("/teacher/schedule");
  revalidatePath("/student/schedule");
  return ok(action === "CANCEL" ? "ยกเลิกการฝากคาบแล้ว" : "ปฏิเสธการรับฝากคาบแล้ว");
}
