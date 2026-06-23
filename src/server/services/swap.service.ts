import "server-only";

import { db } from "@/lib/db";
import { createNotification, notifyUsers } from "./notification.service";
import { SWAP_STATUS, NOTIFICATION_TYPES, ROLES } from "@/lib/constants";
import { periodMeta, dayMeta } from "@/lib/timetable";
import { weekStartOf, weekRangeLabel, toIsoDate } from "@/lib/day-swap";

/** Minimal identity passed from the action layer (already authenticated). */
type Actor = { userId: string; role: string; teacherId?: string | null };

export class SwapError extends Error {}

const swapInclude = {
  requester: { include: { user: true } },
  targetTeacher: { include: { user: true } },
  sourceSchedule: { include: { subject: true, class: true } },
  targetSchedule: { include: { subject: true, class: true } },
} as const;

function slotLabel(s: {
  day: string;
  period: number;
  subject: { subjectName: string; subjectCode: string };
  class: { className: string };
}) {
  const d = dayMeta(s.day);
  return `${d?.labelTh ?? s.day} คาบ ${s.period} (${s.subject.subjectCode} ${s.subject.subjectName} · ห้อง ${s.class.className})`;
}

async function classStudentUserIds(classId: string) {
  const students = await db.student.findMany({
    where: { classId },
    select: { userId: true },
  });
  return students.map((s) => s.userId);
}

/** Is `teacherId` already teaching something at (day, period) in the base
 *  timetable (ignoring `exceptScheduleId`)? Used for the both-free check (#3). */
async function teacherBusyAt(
  teacherId: string,
  day: string,
  period: number,
  exceptScheduleId?: string,
): Promise<boolean> {
  const row = await db.schedule.findFirst({
    where: {
      teacherId,
      day,
      period,
      ...(exceptScheduleId ? { id: { not: exceptScheduleId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(row);
}

/* ------------------------------------------------------------------ */
/*  Create                                                             */
/* ------------------------------------------------------------------ */

export async function createSwapRequest(input: {
  requesterTeacherId: string;
  sourceScheduleId: string;
  targetScheduleId: string;
  /** A date (YYYY-MM-DD) inside the week the swap should apply to. */
  weekDate: string;
  reason?: string;
}) {
  const weekStart = weekStartOf(input.weekDate);
  // The swap is temporary (one week) — don't allow scheduling it for a past week.
  if (weekStart < weekStartOf(toIsoDate(new Date()))) {
    throw new SwapError("เลือกได้เฉพาะสัปดาห์ปัจจุบันหรือสัปดาห์ถัดไป");
  }

  const [source, target] = await Promise.all([
    db.schedule.findUnique({
      where: { id: input.sourceScheduleId },
      include: { subject: true, class: true },
    }),
    db.schedule.findUnique({
      where: { id: input.targetScheduleId },
      include: { subject: true, class: true, teacher: { include: { user: true } } },
    }),
  ]);

  if (!source || !target) throw new SwapError("ไม่พบคาบเรียนที่เลือก");
  if (source.teacherId !== input.requesterTeacherId) {
    throw new SwapError("คาบต้นทางต้องเป็นคาบที่คุณสอนเอง");
  }
  if (target.teacherId === input.requesterTeacherId) {
    throw new SwapError("ไม่สามารถแลกกับคาบของตัวเองได้");
  }
  // Core business rule (#2): swaps are only allowed between periods of the EXACT
  // same classroom (e.g. 4/1 ↔ 4/1, never 4/1 ↔ 4/2). Enforced server-side so an
  // invalid request is rejected even if the client filter is bypassed.
  if (source.classId !== target.classId) {
    throw new SwapError(
      `แลกได้เฉพาะคาบของห้องเรียนเดียวกัน — คาบของคุณเป็นห้อง "${source.class.className}" แต่คาบเป้าหมายเป็นห้อง "${target.class.className}"`,
    );
  }

  // Both-free rule (#3): after the swap the requester teaches at the target's
  // time and the target teacher teaches at the requester's time — each must be
  // free at the other's slot, else they'd be double-booked.
  await assertSwapTeachersFree(source, target);

  // Block duplicate pending/active requests for the same pair in the same week.
  const existing = await db.swapRequest.findFirst({
    where: {
      sourceScheduleId: input.sourceScheduleId,
      targetScheduleId: input.targetScheduleId,
      weekStart,
      status: { in: [SWAP_STATUS.PENDING, SWAP_STATUS.APPROVED, SWAP_STATUS.CANCEL_REQUESTED] },
    },
  });
  if (existing) throw new SwapError("มีคำขอแลกคาบนี้ในสัปดาห์นี้อยู่แล้ว");

  const swap = await db.swapRequest.create({
    data: {
      requesterId: input.requesterTeacherId,
      targetTeacherId: target.teacherId,
      sourceScheduleId: input.sourceScheduleId,
      targetScheduleId: input.targetScheduleId,
      weekStart,
      reason: input.reason?.trim() || null,
      status: SWAP_STATUS.PENDING,
      logs: {
        create: {
          action: "CREATED",
          actorId: null,
          beforeJson: JSON.stringify({ source, target, weekStart }),
        },
      },
    },
    include: swapInclude,
  });

  await createNotification({
    userId: target.teacher.user.id,
    type: NOTIFICATION_TYPES.SWAP_REQUEST,
    title: "คำขอแลกคาบสอนใหม่",
    message: `${swap.requester.user.name} ขอแลก ${slotLabel(source)} กับ ${slotLabel(target)} ของคุณ — เฉพาะสัปดาห์ ${weekRangeLabel(weekStart)}`,
    linkUrl: "/teacher/swaps",
  });

  return swap;
}

/** Throws unless both teachers are free at each other's target slot. */
async function assertSwapTeachersFree(
  source: { teacherId: string; day: string; period: number; id: string },
  target: { teacherId: string; day: string; period: number; id: string },
) {
  const [requesterBusy, targetBusy] = await Promise.all([
    // Requester (teaches source) would move to the target's time.
    teacherBusyAt(source.teacherId, target.day, target.period, target.id),
    // Target teacher (teaches target) would move to the source's time.
    teacherBusyAt(target.teacherId, source.day, source.period, source.id),
  ]);
  if (requesterBusy) {
    throw new SwapError(
      `คุณมีคาบสอนอยู่แล้วใน ${dayMeta(target.day)?.labelTh ?? target.day} คาบ ${target.period} จึงแลกคาบนี้ไม่ได้`,
    );
  }
  if (targetBusy) {
    throw new SwapError(
      `ครูปลายทางมีคาบสอนอยู่แล้วใน ${dayMeta(source.day)?.labelTh ?? source.day} คาบ ${source.period} จึงแลกคาบนี้ไม่ได้`,
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Authorisation helper                                               */
/* ------------------------------------------------------------------ */

function assertCanDecide(
  actor: Actor,
  swap: { targetTeacherId: string; status: string },
) {
  if (swap.status !== SWAP_STATUS.PENDING) {
    throw new SwapError("คำขอนี้ถูกดำเนินการไปแล้ว");
  }
  const isAdmin = actor.role === ROLES.ADMIN;
  const isTarget = actor.teacherId && actor.teacherId === swap.targetTeacherId;
  if (!isAdmin && !isTarget) {
    throw new SwapError("คุณไม่มีสิทธิ์อนุมัติ/ปฏิเสธคำขอนี้");
  }
}

/* ------------------------------------------------------------------ */
/*  Approve                                                            */
/* ------------------------------------------------------------------ */

export async function approveSwapRequest(swapRequestId: string, actor: Actor) {
  const swap = await db.swapRequest.findUnique({
    where: { id: swapRequestId },
    include: swapInclude,
  });
  if (!swap) throw new SwapError("ไม่พบคำขอแลกคาบ");
  assertCanDecide(actor, swap);

  const src = swap.sourceSchedule;
  const tgt = swap.targetSchedule;

  // Non-destructive (#5): we never touch the base Schedule. Approving just flips
  // the status to APPROVED — the swap is then applied as a read-time overlay for
  // its `weekStart` week only (see effective-schedule.service). Re-check the
  // both-free rule (#3) in case the base timetable changed since the request.
  await assertSwapTeachersFree(src, tgt);

  const weekLabel = swap.weekStart ? weekRangeLabel(swap.weekStart) : "สัปดาห์นี้";

  await db.$transaction(async (tx) => {
    await tx.swapRequest.update({
      where: { id: swap.id },
      data: {
        status: SWAP_STATUS.APPROVED,
        decidedById: actor.userId,
        respondedAt: new Date(),
      },
    });
    await tx.swapLog.create({
      data: {
        swapRequestId: swap.id,
        action: "APPROVED",
        actorId: actor.userId,
        afterJson: JSON.stringify({
          weekStart: swap.weekStart,
          source: { id: src.id, day: src.day, period: src.period },
          target: { id: tgt.id, day: tgt.day, period: tgt.period },
        }),
      },
    });
    await tx.auditLog.create({
      data: {
        userId: actor.userId,
        action: "SWAP_APPROVED",
        entity: "SwapRequest",
        entityId: swap.id,
      },
    });
  });

  // Notify the requester.
  await createNotification({
    userId: swap.requester.user.id,
    type: NOTIFICATION_TYPES.SWAP_APPROVED,
    title: "คำขอแลกคาบได้รับการอนุมัติ",
    message: `${swap.targetTeacher.user.name} อนุมัติการสลับ ${slotLabel(src)} กับ ${slotLabel(tgt)} — เฉพาะสัปดาห์ ${weekLabel}`,
    linkUrl: "/teacher/swaps",
  });

  // Both periods belong to the SAME classroom (#2), so notify that one class.
  const students = await classStudentUserIds(src.classId);
  await notifyUsers(students, {
    type: NOTIFICATION_TYPES.SCHEDULE_CHANGED,
    title: "ตารางเรียนมีการเปลี่ยนแปลง",
    message: `${slotLabel(src)} และ ${slotLabel(tgt)} ถูกสลับเวลาเรียน`,
    linkUrl: "/student/schedule",
  });

  return swap;
}

/* ------------------------------------------------------------------ */
/*  Reject / cancel                                                    */
/* ------------------------------------------------------------------ */

export async function rejectSwapRequest(swapRequestId: string, actor: Actor) {
  const swap = await db.swapRequest.findUnique({
    where: { id: swapRequestId },
    include: swapInclude,
  });
  if (!swap) throw new SwapError("ไม่พบคำขอแลกคาบ");
  assertCanDecide(actor, swap);

  await db.$transaction([
    db.swapRequest.update({
      where: { id: swap.id },
      data: {
        status: SWAP_STATUS.REJECTED,
        decidedById: actor.userId,
        respondedAt: new Date(),
      },
    }),
    db.swapLog.create({
      data: { swapRequestId: swap.id, action: "REJECTED", actorId: actor.userId },
    }),
    db.auditLog.create({
      data: {
        userId: actor.userId,
        action: "SWAP_REJECTED",
        entity: "SwapRequest",
        entityId: swap.id,
      },
    }),
  ]);

  await createNotification({
    userId: swap.requester.user.id,
    type: NOTIFICATION_TYPES.SWAP_REJECTED,
    title: "คำขอแลกคาบถูกปฏิเสธ",
    message: `${swap.targetTeacher.user.name} ปฏิเสธการแลก ${slotLabel(swap.sourceSchedule)} กับ ${slotLabel(swap.targetSchedule)}`,
    linkUrl: "/teacher/swaps",
  });

  return swap;
}

/** Requester cancels their own still-pending request. */
export async function cancelSwapRequest(swapRequestId: string, actor: Actor) {
  const swap = await db.swapRequest.findUnique({ where: { id: swapRequestId } });
  if (!swap) throw new SwapError("ไม่พบคำขอแลกคาบ");
  if (swap.status !== SWAP_STATUS.PENDING) {
    throw new SwapError("คำขอนี้ถูกดำเนินการไปแล้ว");
  }
  if (!actor.teacherId || actor.teacherId !== swap.requesterId) {
    throw new SwapError("ยกเลิกได้เฉพาะคำขอของตนเองเท่านั้น");
  }

  await db.$transaction([
    db.swapRequest.update({
      where: { id: swap.id },
      data: { status: SWAP_STATUS.CANCELLED, respondedAt: new Date() },
    }),
    db.swapLog.create({
      data: { swapRequestId: swap.id, action: "CANCELLED", actorId: actor.userId },
    }),
  ]);
  return swap;
}

/* ------------------------------------------------------------------ */
/*  Cancellation of an APPROVED swap (#1)                              */
/* ------------------------------------------------------------------ */

function participants(swap: { requesterId: string; targetTeacherId: string }) {
  return [swap.requesterId, swap.targetTeacherId];
}

/** A participant teacher requests to undo an already-approved swap. The OTHER
 *  teacher must then approve or reject the cancellation. */
export async function requestSwapCancellation(swapRequestId: string, actor: Actor) {
  const swap = await db.swapRequest.findUnique({
    where: { id: swapRequestId },
    include: swapInclude,
  });
  if (!swap) throw new SwapError("ไม่พบคำขอแลกคาบ");
  if (swap.status !== SWAP_STATUS.APPROVED) {
    throw new SwapError("ขอยกเลิกได้เฉพาะการสลับที่อนุมัติแล้วเท่านั้น");
  }
  if (!actor.teacherId || !participants(swap).includes(actor.teacherId)) {
    throw new SwapError("เฉพาะครูที่เกี่ยวข้องกับการสลับนี้เท่านั้นที่ขอยกเลิกได้");
  }

  const otherTeacherId =
    actor.teacherId === swap.requesterId ? swap.targetTeacherId : swap.requesterId;
  const otherUserId =
    actor.teacherId === swap.requesterId
      ? swap.targetTeacher.user.id
      : swap.requester.user.id;
  const me =
    actor.teacherId === swap.requesterId
      ? swap.requester.user.name
      : swap.targetTeacher.user.name;

  await db.$transaction([
    db.swapRequest.update({
      where: { id: swap.id },
      data: { status: SWAP_STATUS.CANCEL_REQUESTED, cancelRequestedById: actor.teacherId },
    }),
    db.swapLog.create({
      data: { swapRequestId: swap.id, action: "CANCEL_REQUESTED", actorId: actor.userId },
    }),
  ]);

  await createNotification({
    userId: otherUserId,
    type: NOTIFICATION_TYPES.SWAP_CANCEL_REQUEST,
    title: "คำขอยกเลิกการสลับคาบ",
    message: `${me} ขอยกเลิกการสลับ ${slotLabel(swap.sourceSchedule)} กับ ${slotLabel(swap.targetSchedule)} — โปรดอนุมัติหรือปฏิเสธ`,
    linkUrl: "/teacher/swaps",
  });

  return { swap, otherTeacherId };
}

function assertCanDecideCancel(
  actor: Actor,
  swap: { status: string; cancelRequestedById: string | null; requesterId: string; targetTeacherId: string },
) {
  if (swap.status !== SWAP_STATUS.CANCEL_REQUESTED) {
    throw new SwapError("ไม่มีคำขอยกเลิกที่รอดำเนินการ");
  }
  const isAdmin = actor.role === ROLES.ADMIN;
  // The teacher who must decide is the participant who did NOT request the cancel.
  const isOther =
    actor.teacherId &&
    participants(swap).includes(actor.teacherId) &&
    actor.teacherId !== swap.cancelRequestedById;
  if (!isAdmin && !isOther) {
    throw new SwapError("เฉพาะครูอีกฝ่ายเท่านั้นที่อนุมัติ/ปฏิเสธการยกเลิกได้");
  }
}

/** The other teacher approves the cancellation → revert schedules to original. */
export async function approveSwapCancellation(swapRequestId: string, actor: Actor) {
  const swap = await db.swapRequest.findUnique({
    where: { id: swapRequestId },
    include: swapInclude,
  });
  if (!swap) throw new SwapError("ไม่พบคำขอแลกคาบ");
  assertCanDecideCancel(actor, swap);

  const src = swap.sourceSchedule;
  const tgt = swap.targetSchedule;

  await db.$transaction(async (tx) => {
    // Non-destructive: flipping to REVERTED simply stops the overlay applying —
    // the base timetable was never changed, so it is already the original.
    await tx.swapRequest.update({
      where: { id: swap.id },
      data: {
        status: SWAP_STATUS.REVERTED,
        cancelDecidedById: actor.userId,
        cancelRespondedAt: new Date(),
      },
    });
    await tx.swapLog.create({
      data: {
        swapRequestId: swap.id,
        action: "CANCEL_APPROVED",
        actorId: actor.userId,
        afterJson: JSON.stringify({
          source: { id: src.id, day: src.day, period: src.period },
          target: { id: tgt.id, day: tgt.day, period: tgt.period },
        }),
      },
    });
    await tx.auditLog.create({
      data: {
        userId: actor.userId,
        action: "SWAP_REVERTED",
        entity: "SwapRequest",
        entityId: swap.id,
      },
    });
  });

  // Notify the teacher who requested the cancellation.
  const requestedByUserId =
    swap.cancelRequestedById === swap.requesterId
      ? swap.requester.user.id
      : swap.targetTeacher.user.id;
  await createNotification({
    userId: requestedByUserId,
    type: NOTIFICATION_TYPES.SWAP_CANCELLED,
    title: "การยกเลิกการสลับได้รับการอนุมัติ",
    message: `ตารางกลับเป็นเดิมแล้ว: ${slotLabel(src)} และ ${slotLabel(tgt)}`,
    linkUrl: "/teacher/swaps",
  });

  // Students of the (single) classroom: schedule reverted.
  const students = await classStudentUserIds(src.classId);
  await notifyUsers(students, {
    type: NOTIFICATION_TYPES.SCHEDULE_CHANGED,
    title: "ตารางเรียนกลับเป็นเดิม",
    message: `${slotLabel(src)} และ ${slotLabel(tgt)} ถูกยกเลิกการสลับ กลับเป็นตารางเดิม`,
    linkUrl: "/student/schedule",
  });

  return swap;
}

/** The other teacher rejects the cancellation → the swap stands (back to APPROVED). */
export async function rejectSwapCancellation(swapRequestId: string, actor: Actor) {
  const swap = await db.swapRequest.findUnique({
    where: { id: swapRequestId },
    include: swapInclude,
  });
  if (!swap) throw new SwapError("ไม่พบคำขอแลกคาบ");
  assertCanDecideCancel(actor, swap);

  const requestedByUserId =
    swap.cancelRequestedById === swap.requesterId
      ? swap.requester.user.id
      : swap.targetTeacher.user.id;

  await db.$transaction([
    db.swapRequest.update({
      where: { id: swap.id },
      data: {
        status: SWAP_STATUS.APPROVED,
        cancelRequestedById: null,
        cancelDecidedById: actor.userId,
        cancelRespondedAt: new Date(),
      },
    }),
    db.swapLog.create({
      data: { swapRequestId: swap.id, action: "CANCEL_REJECTED", actorId: actor.userId },
    }),
  ]);

  await createNotification({
    userId: requestedByUserId,
    type: NOTIFICATION_TYPES.SWAP_REJECTED,
    title: "คำขอยกเลิกการสลับถูกปฏิเสธ",
    message: `ครูอีกฝ่ายไม่อนุมัติการยกเลิก — การสลับ ${slotLabel(swap.sourceSchedule)} กับ ${slotLabel(swap.targetSchedule)} ยังมีผลอยู่`,
    linkUrl: "/teacher/swaps",
  });

  return swap;
}

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export type SwapWithRelations = Awaited<
  ReturnType<typeof getSwapsForTeacher>
>["incoming"][number];

export async function getSwapsForTeacher(teacherId: string) {
  const [incoming, outgoing] = await Promise.all([
    db.swapRequest.findMany({
      where: { targetTeacherId: teacherId },
      include: swapInclude,
      orderBy: { createdAt: "desc" },
    }),
    db.swapRequest.findMany({
      where: { requesterId: teacherId },
      include: swapInclude,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { incoming, outgoing };
}

export function getAllSwaps() {
  return db.swapRequest.findMany({
    include: swapInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

/** Flatten a swap (with relations) into the client-facing shape. */
export function mapSwapToClient(swap: {
  id: string;
  status: string;
  reason: string | null;
  weekStart: string | null;
  createdAt: Date;
  requesterId: string;
  targetTeacherId: string;
  cancelRequestedById: string | null;
  requester: { user: { name: string } };
  targetTeacher: { user: { name: string } };
  sourceSchedule: { day: string; period: number; subject: { subjectName: string; subjectCode: string }; class: { className: string } };
  targetSchedule: { day: string; period: number; subject: { subjectName: string; subjectCode: string }; class: { className: string } };
}) {
  return {
    id: swap.id,
    status: swap.status,
    reason: swap.reason,
    weekLabel: swap.weekStart ? weekRangeLabel(swap.weekStart) : null,
    createdAt: swap.createdAt.toISOString(),
    requesterId: swap.requesterId,
    targetTeacherId: swap.targetTeacherId,
    cancelRequestedById: swap.cancelRequestedById,
    requesterName: swap.requester.user.name,
    targetTeacherName: swap.targetTeacher.user.name,
    sourceLabel: slotLabel(swap.sourceSchedule),
    targetLabel: slotLabel(swap.targetSchedule),
  };
}

export { periodMeta };
