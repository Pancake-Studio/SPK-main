import "server-only";

import { db } from "@/lib/db";
import { createNotification, notifyUsers } from "./notification.service";
import { SWAP_STATUS, NOTIFICATION_TYPES, ROLES } from "@/lib/constants";
import { periodMeta, dayMeta } from "@/lib/timetable";

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
  subject: { subjectName: string };
  class: { className: string };
}) {
  const d = dayMeta(s.day);
  return `${d?.label ?? s.day} คาบ ${s.period} (${s.subject.subjectName} · ${s.class.className})`;
}

async function classStudentUserIds(classId: string) {
  const students = await db.student.findMany({
    where: { classId },
    select: { userId: true },
  });
  return students.map((s) => s.userId);
}

/* ------------------------------------------------------------------ */
/*  Create                                                             */
/* ------------------------------------------------------------------ */

export async function createSwapRequest(input: {
  requesterTeacherId: string;
  sourceScheduleId: string;
  targetScheduleId: string;
  reason?: string;
}) {
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

  // Block duplicate pending requests for the same pair.
  const existing = await db.swapRequest.findFirst({
    where: {
      requesterId: input.requesterTeacherId,
      sourceScheduleId: input.sourceScheduleId,
      targetScheduleId: input.targetScheduleId,
      status: SWAP_STATUS.PENDING,
    },
  });
  if (existing) throw new SwapError("มีคำขอแลกคาบนี้ที่รออนุมัติอยู่แล้ว");

  const swap = await db.swapRequest.create({
    data: {
      requesterId: input.requesterTeacherId,
      targetTeacherId: target.teacherId,
      sourceScheduleId: input.sourceScheduleId,
      targetScheduleId: input.targetScheduleId,
      reason: input.reason?.trim() || null,
      status: SWAP_STATUS.PENDING,
      logs: {
        create: {
          action: "CREATED",
          actorId: null,
          beforeJson: JSON.stringify({ source, target }),
        },
      },
    },
    include: swapInclude,
  });

  await createNotification({
    userId: target.teacher.user.id,
    type: NOTIFICATION_TYPES.SWAP_REQUEST,
    title: "คำขอแลกคาบสอนใหม่",
    message: `${swap.requester.user.name} ขอแลก ${slotLabel(source)} กับ ${slotLabel(target)} ของคุณ`,
    linkUrl: "/teacher/swaps",
  });

  return swap;
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

  const before = {
    source: { id: swap.sourceSchedule.id, teacherId: swap.sourceSchedule.teacherId },
    target: { id: swap.targetSchedule.id, teacherId: swap.targetSchedule.teacherId },
  };
  // Swap: each slot keeps its subject/class/day/period; only the teacher moves.
  const newSourceTeacher = swap.targetSchedule.teacherId;
  const newTargetTeacher = swap.sourceSchedule.teacherId;

  await db.$transaction([
    db.schedule.update({
      where: { id: swap.sourceScheduleId },
      data: { teacherId: newSourceTeacher },
    }),
    db.schedule.update({
      where: { id: swap.targetScheduleId },
      data: { teacherId: newTargetTeacher },
    }),
    db.swapRequest.update({
      where: { id: swap.id },
      data: {
        status: SWAP_STATUS.APPROVED,
        decidedById: actor.userId,
        respondedAt: new Date(),
      },
    }),
    db.swapLog.create({
      data: {
        swapRequestId: swap.id,
        action: "APPROVED",
        actorId: actor.userId,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify({
          source: { id: swap.sourceScheduleId, teacherId: newSourceTeacher },
          target: { id: swap.targetScheduleId, teacherId: newTargetTeacher },
        }),
      },
    }),
    db.auditLog.create({
      data: {
        userId: actor.userId,
        action: "SWAP_APPROVED",
        entity: "SwapRequest",
        entityId: swap.id,
      },
    }),
  ]);

  // Notify the requester.
  await createNotification({
    userId: swap.requester.user.id,
    type: NOTIFICATION_TYPES.SWAP_APPROVED,
    title: "คำขอแลกคาบได้รับการอนุมัติ",
    message: `${swap.targetTeacher.user.name} อนุมัติการแลก ${slotLabel(swap.sourceSchedule)} กับ ${slotLabel(swap.targetSchedule)}`,
    linkUrl: "/teacher/swaps",
  });

  // Notify affected students in both classes.
  const [srcStudents, tgtStudents] = await Promise.all([
    classStudentUserIds(swap.sourceSchedule.classId),
    classStudentUserIds(swap.targetSchedule.classId),
  ]);
  await notifyUsers(srcStudents, {
    type: NOTIFICATION_TYPES.SCHEDULE_CHANGED,
    title: "ตารางเรียนมีการเปลี่ยนแปลง",
    message: `${slotLabel(swap.sourceSchedule)} เปลี่ยนครูผู้สอนเป็น ${swap.targetTeacher.user.name}`,
    linkUrl: "/student/schedule",
  });
  await notifyUsers(tgtStudents, {
    type: NOTIFICATION_TYPES.SCHEDULE_CHANGED,
    title: "ตารางเรียนมีการเปลี่ยนแปลง",
    message: `${slotLabel(swap.targetSchedule)} เปลี่ยนครูผู้สอนเป็น ${swap.requester.user.name}`,
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

export function getPendingIncomingCount(teacherId: string) {
  return db.swapRequest.count({
    where: { targetTeacherId: teacherId, status: SWAP_STATUS.PENDING },
  });
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
  createdAt: Date;
  requester: { user: { name: string } };
  targetTeacher: { user: { name: string } };
  sourceSchedule: { day: string; period: number; subject: { subjectName: string }; class: { className: string } };
  targetSchedule: { day: string; period: number; subject: { subjectName: string }; class: { className: string } };
}) {
  return {
    id: swap.id,
    status: swap.status,
    reason: swap.reason,
    createdAt: swap.createdAt.toISOString(),
    requesterName: swap.requester.user.name,
    targetTeacherName: swap.targetTeacher.user.name,
    sourceLabel: slotLabel(swap.sourceSchedule),
    targetLabel: slotLabel(swap.targetSchedule),
  };
}

export { periodMeta };
