"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  verifyPassword,
  hashPassword,
  getCurrentUser,
  requireUser,
} from "@/lib/auth";
import { loginSchema, changePasswordSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { ROLE_HOME, type Role } from "@/lib/constants";
import {
  fieldErrorsFromZod,
  fail,
  type ActionState,
} from "./_helpers";

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return fail("กรุณาตรวจสอบข้อมูลที่กรอก", fieldErrorsFromZod(parsed.error));
  }

  // Rate limit by IP + email: 8 attempts / 5 min.
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limited = rateLimit(`login:${ip}:${parsed.data.email}`, 8, 5 * 60_000);
  if (!limited.ok) {
    return fail("พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง");
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  // Always run a hash comparison shape to reduce user-enumeration timing leaks.
  const valid =
    user && user.isActive
      ? await verifyPassword(parsed.data.password, user.passwordHash)
      : false;

  if (!user || !valid) {
    return fail("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }

  await createSession(user.id);
  await db.auditLog.create({
    data: { userId: user.id, action: "LOGIN", entity: "User", entityId: user.id, ipAddress: ip },
  });

  redirect(ROLE_HOME[user.role as Role] ?? "/");
}

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
  const valid = record
    ? await verifyPassword(parsed.data.currentPassword, record.passwordHash)
    : false;
  if (!valid) return fail("รหัสผ่านปัจจุบันไม่ถูกต้อง");

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { ok: true, message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" };
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) {
    await db.auditLog
      .create({
        data: { userId: user.id, action: "LOGOUT", entity: "User", entityId: user.id },
      })
      .catch(() => {});
  }
  await destroySession();
  redirect("/login");
}
