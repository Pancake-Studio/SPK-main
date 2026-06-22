"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  bellScheduleSaveSchema,
  scheduleOverrideSchema,
  type BellScheduleSaveInput,
  type ScheduleOverrideInput,
} from "@/lib/validations";
import {
  saveBellScheduleSlots,
  createBellSchedule,
  setDefaultBellSchedule,
  deleteBellSchedule,
  upsertScheduleOverride,
  deleteScheduleOverride,
} from "@/server/services/bell-schedule.service";
import { fieldErrorsFromZod } from "./_helpers";

/** Pages whose rendered timetables depend on the bell schedule. */
function revalidateTimetables() {
  for (const p of [
    "/admin/schedule",
    "/admin/periods",
    "/teacher/schedule",
    "/student/schedule",
    "/teacher",
    "/student",
    "/admin",
  ]) {
    revalidatePath(p);
  }
}

export async function saveBellScheduleAction(input: BellScheduleSaveInput) {
  await requireAdmin();
  const parsed = bellScheduleSaveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "ตรวจสอบข้อมูลตาราง", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  try {
    await saveBellScheduleSlots(parsed.data);
  } catch {
    return { ok: false as const, error: "บันทึกตารางไม่สำเร็จ" };
  }
  revalidateTimetables();
  return { ok: true as const, message: "บันทึกเวลาเรียบร้อยแล้ว" };
}

export async function createBellScheduleAction(name: string, cloneFromId?: string) {
  await requireAdmin();
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { ok: false as const, error: "กรอกชื่อตาราง" };
  try {
    const id = await createBellSchedule(trimmed, cloneFromId || undefined);
    revalidateTimetables();
    return { ok: true as const, id };
  } catch {
    return { ok: false as const, error: "สร้างตารางไม่สำเร็จ" };
  }
}

export async function setDefaultBellScheduleAction(id: string) {
  await requireAdmin();
  await setDefaultBellSchedule(id);
  revalidateTimetables();
  return { ok: true as const };
}

export async function deleteBellScheduleAction(id: string) {
  await requireAdmin();
  try {
    await deleteBellSchedule(id);
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "ลบไม่สำเร็จ" };
  }
  revalidateTimetables();
  return { ok: true as const };
}

export async function upsertScheduleOverrideAction(input: ScheduleOverrideInput) {
  await requireAdmin();
  const parsed = scheduleOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "ตรวจสอบข้อมูล", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  await upsertScheduleOverride(parsed.data);
  revalidateTimetables();
  return { ok: true as const, message: "กำหนดตารางเฉพาะวันเรียบร้อยแล้ว" };
}

export async function deleteScheduleOverrideAction(date: string) {
  await requireAdmin();
  await deleteScheduleOverride(date);
  revalidateTimetables();
  return { ok: true as const };
}
