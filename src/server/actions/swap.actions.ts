"use server";

import { revalidatePath } from "next/cache";
import { requireTeacherProfile, requireUser } from "@/lib/auth";
import { createSwapSchema, swapDecisionSchema } from "@/lib/validations";
import {
  createSwapRequest,
  approveSwapRequest,
  rejectSwapRequest,
  cancelSwapRequest,
  requestSwapCancellation,
  approveSwapCancellation,
  rejectSwapCancellation,
  SwapError,
} from "@/server/services/swap.service";
import { fieldErrorsFromZod, fail, ok, type ActionState } from "./_helpers";

export async function createSwapAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { teacher } = await requireTeacherProfile();

  const parsed = createSwapSchema.safeParse({
    sourceScheduleId: formData.get("sourceScheduleId"),
    targetScheduleId: formData.get("targetScheduleId"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) {
    return fail("กรุณาตรวจสอบข้อมูล", fieldErrorsFromZod(parsed.error));
  }

  try {
    await createSwapRequest({
      requesterTeacherId: teacher.id,
      sourceScheduleId: parsed.data.sourceScheduleId,
      targetScheduleId: parsed.data.targetScheduleId,
      reason: parsed.data.reason,
    });
  } catch (e) {
    if (e instanceof SwapError) return fail(e.message);
    throw e;
  }

  revalidatePath("/teacher/swaps");
  revalidatePath("/teacher");
  return ok("ส่งคำขอแลกคาบเรียบร้อยแล้ว");
}

export async function decideSwapAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const actor = {
    userId: user.id,
    role: user.role,
    teacherId: user.teacher?.id ?? null,
  };

  const parsed = swapDecisionSchema.safeParse({
    swapRequestId: formData.get("swapRequestId"),
    action: formData.get("action"),
  });
  if (!parsed.success) return fail("คำขอไม่ถูกต้อง");

  try {
    if (parsed.data.action === "APPROVE") {
      await approveSwapRequest(parsed.data.swapRequestId, actor);
    } else {
      await rejectSwapRequest(parsed.data.swapRequestId, actor);
    }
  } catch (e) {
    if (e instanceof SwapError) return fail(e.message);
    throw e;
  }

  revalidatePath("/teacher/swaps");
  revalidatePath("/teacher");
  revalidatePath("/admin/swaps");
  return ok(
    parsed.data.action === "APPROVE" ? "อนุมัติและอัปเดตตารางแล้ว" : "ปฏิเสธคำขอแล้ว",
  );
}

export async function cancelSwapAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const actor = {
    userId: user.id,
    role: user.role,
    teacherId: user.teacher?.id ?? null,
  };

  const id = String(formData.get("swapRequestId") ?? "");
  if (!id) return fail("คำขอไม่ถูกต้อง");

  try {
    await cancelSwapRequest(id, actor);
  } catch (e) {
    if (e instanceof SwapError) return fail(e.message);
    throw e;
  }

  revalidatePath("/teacher/swaps");
  return ok("ยกเลิกคำขอแล้ว");
}

/** A participant teacher requests to undo an APPROVED swap (#1). */
export async function requestSwapCancelAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const actor = { userId: user.id, role: user.role, teacherId: user.teacher?.id ?? null };
  const id = String(formData.get("swapRequestId") ?? "");
  if (!id) return fail("คำขอไม่ถูกต้อง");

  try {
    await requestSwapCancellation(id, actor);
  } catch (e) {
    if (e instanceof SwapError) return fail(e.message);
    throw e;
  }

  revalidatePath("/teacher/swaps");
  revalidatePath("/teacher");
  return ok("ส่งคำขอยกเลิกการสลับให้ครูอีกฝ่ายแล้ว");
}

/** The other teacher approves/rejects a cancellation request (#1). */
export async function decideSwapCancelAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const actor = { userId: user.id, role: user.role, teacherId: user.teacher?.id ?? null };

  const id = String(formData.get("swapRequestId") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!id || (action !== "APPROVE" && action !== "REJECT")) {
    return fail("คำขอไม่ถูกต้อง");
  }

  try {
    if (action === "APPROVE") await approveSwapCancellation(id, actor);
    else await rejectSwapCancellation(id, actor);
  } catch (e) {
    if (e instanceof SwapError) return fail(e.message);
    throw e;
  }

  revalidatePath("/teacher/swaps");
  revalidatePath("/teacher");
  revalidatePath("/student/schedule");
  revalidatePath("/admin/swaps");
  return ok(
    action === "APPROVE" ? "ยกเลิกการสลับและคืนตารางเดิมแล้ว" : "ปฏิเสธคำขอยกเลิกแล้ว",
  );
}
