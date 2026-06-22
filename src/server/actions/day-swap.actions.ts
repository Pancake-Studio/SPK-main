"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { daySwapSchema, type DaySwapInput } from "@/lib/validations";
import { createDaySwap, deleteDaySwap } from "@/server/services/day-swap.service";
import { fieldErrorsFromZod } from "./_helpers";

function revalidateTimetables() {
  for (const p of ["/admin/periods", "/teacher/schedule", "/student/schedule", "/teacher", "/student", "/admin"]) {
    revalidatePath(p);
  }
}

export async function createDaySwapAction(input: DaySwapInput) {
  await requireAdmin();
  const parsed = daySwapSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "ตรวจสอบข้อมูล", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  try {
    await createDaySwap(parsed.data);
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "สลับวันไม่สำเร็จ" };
  }
  revalidateTimetables();
  return { ok: true as const, message: "สลับคาบทั้งวันเรียบร้อยแล้ว" };
}

export async function deleteDaySwapAction(id: string) {
  await requireAdmin();
  await deleteDaySwap(id);
  revalidateTimetables();
  return { ok: true as const };
}
