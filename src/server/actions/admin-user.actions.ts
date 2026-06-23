"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { adminSchema, adminUpdateSchema } from "@/lib/validations";
import { createAdmin, updateAdmin, deleteAdmin } from "@/server/services/admin.service";
import { fieldErrorsFromZod, fail, ok, type ActionState } from "./_helpers";

function uniqueEmailMessage(e: unknown): string | null {
  if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
    return "อีเมลนี้ถูกใช้งานแล้ว";
  }
  return null;
}

export async function createAdminAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = adminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  try {
    await createAdmin(parsed.data);
  } catch (e) {
    return fail(uniqueEmailMessage(e) ?? "ไม่สามารถเพิ่มผู้ดูแลระบบได้");
  }
  revalidatePath("/admin/admins");
  return ok("เพิ่มผู้ดูแลระบบเรียบร้อยแล้ว");
}

export async function updateAdminAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = adminUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("ตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  try {
    await updateAdmin(parsed.data);
  } catch (e) {
    if (e instanceof Error && !uniqueEmailMessage(e)) return fail(e.message);
    return fail(uniqueEmailMessage(e) ?? "ไม่สามารถแก้ไขผู้ดูแลระบบได้");
  }
  revalidatePath("/admin/admins");
  return ok("แก้ไขผู้ดูแลระบบเรียบร้อยแล้ว");
}

export async function deleteAdminAction(id: string) {
  const me = await requireAdmin();
  try {
    await deleteAdmin(id, me.id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ลบไม่สำเร็จ" };
  }
  revalidatePath("/admin/admins");
  return { ok: true };
}
