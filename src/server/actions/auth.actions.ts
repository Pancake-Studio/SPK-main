"use server";

import { db } from "@/lib/db";
import { requireUser, hashPassword, verifyPassword } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validations";
import {
  fieldErrorsFromZod,
  fail,
  type ActionState,
} from "./_helpers";

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return fail("กรุณาตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  }

  const record = await db.user.findUnique({ where: { id: user.id } });
  const valid = record?.passwordHash
    ? await verifyPassword(parsed.data.currentPassword, record.passwordHash)
    : false;
  if (!valid) return fail("รหัสผ่านปัจจุบันไม่ถูกต้อง");

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { ok: true, message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" };
}
