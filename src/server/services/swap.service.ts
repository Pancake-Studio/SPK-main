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

type SlotPos = { id: string; day: string; period: number };
type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/** Exchange two same-class rows' (day, period). Parks the first row at a temp
 *  day so the unique (classId, day, period) constraint can't trip mid-swap. The
 *  whole session (teacher/subject/room/class) travels with its own row. */
async function exchangeDayPeriod(tx: Tx, a: SlotPos, b: SlotPos) {
  await tx.schedule.update({ where: { id: a.id }, data: { day: `__SWAP_${a.id.slice(0, 8)}` } });
  await tx.schedule.update({ where: { id: b.id }, data: { day: a.day, period: a.period } });
  await tx.schedule.update({ where: { id: a.id }, data: { day: b.day, period: b.period } });
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
  // Core business rule (#2): swaps are only allowed between periods of the EXACT
  // same classroom (e.g. 4/1 ↔ 4/1, never 4/1 ↔ 4/2). Enforced server-side so an
  // invalid request is rejected even if the client filter is bypassed.
  if (source.classId !== target.classId) {
    throw new SwapError(
      `แลกได้เฉพาะคาบของห้องเรียนเดียวกัน — คาบของคุณเป็นห้อง "${source.class.className}" แต่คาบเป้าหมายเป็นห้อง "${target.class.className}"`,
    );
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

  const src = swap.sourceSchedule;
  const tgt = swap.targetSchedule;
  // Whole-session swap (#3/#6/#7): exchange the two rows' (day, period). Every
  // other field (teacher, subject, subjectCode, room, classId) travels with its
  // own row automatically — nothing is copied, so nothing can go stale/empty.
  const before = {
    source: { id: src.id, day: src.day, period: src.period },
    target: { id: tgt.id, day: tgt.day, period: tgt.period },
  };
  const after = {
    source: { id: src.id, day: tgt.day, period: tgt.period },
    target: { id: tgt.id, day: src.day, period: src.period },
  };

  await db.$transaction(async (tx) => {
    await exchangeDayPeriod(
      tx,
      { id: src.id, day: src.day, period: src.period },
      { id: tgt.id, day: tgt.day, period: tgt.period },
    );
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
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(after),
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
    message: `${swap.targetTeacher.user.name} อนุมัติการสลับ ${slotLabel(src)} กับ ${slotLabel(tgt)}`,
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
  const before = {
    source: { id: src.id, day: src.day, period: src.period },
    target: { id: tgt.id, day: tgt.day, period: tgt.period },
  };

  await db.$transaction(async (tx) => {
    // Exchange the rows' (day, period) again — restores the original timetable.
    await exchangeDayPeriod(
      tx,
      { id: src.id, day: src.day, period: src.period },
      { id: tgt.id, day: tgt.day, period: tgt.period },
    );
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
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify({
          source: { id: src.id, day: tgt.day, period: tgt.period },
          target: { id: tgt.id, day: src.day, period: src.period },
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

export function getPendingIncomingCount(teacherId: string) {
  return db.swapRequest.count({
    where: { targetTeacherId: teacherId, status: SWAP_STATUS.PENDING },
  });
}

/** Marks a schedule slot as recently swapped, for timetable highlighting (#7/#9).
 *  Since a whole session moves time slots, we record where it sat BEFORE. */
export type SwapMark = {
  scheduleId: string;
  originalDay: string;
  originalPeriod: number;
  swappedAt: string;
};

/** Build a `scheduleId -> SwapMark` map for the given slots, from APPROVED swaps.
 *  After an approved swap each row sits at its partner's old (day, period), so a
 *  row's ORIGINAL position equals its partner row's CURRENT position. Most-recent
 *  swap wins if a slot was swapped more than once. */
export async function getSwapMarks(
  scheduleIds: string[],
): Promise<Record<string, SwapMark>> {
  if (scheduleIds.length === 0) return {};
  const swaps = await db.swapRequest.findMany({
    where: {
      // Highlight while the swap is in effect (APPROVED, or cancellation pending).
      // A REVERTED swap is back to the original schedule → no highlight.
      status: { in: [SWAP_STATUS.APPROVED, SWAP_STATUS.CANCEL_REQUESTED] },
      OR: [
        { sourceScheduleId: { in: scheduleIds } },
        { targetScheduleId: { in: scheduleIds } },
      ],
    },
    include: swapInclude,
    orderBy: { respondedAt: "asc" }, // ascending so later writes overwrite earlier
  });

  const marks: Record<string, SwapMark> = {};
  for (const s of swaps) {
    const when = (s.respondedAt ?? s.createdAt).toISOString();
    if (scheduleIds.includes(s.sourceScheduleId)) {
      marks[s.sourceScheduleId] = {
        scheduleId: s.sourceScheduleId,
        originalDay: s.targetSchedule.day,
        originalPeriod: s.targetSchedule.period,
        swappedAt: when,
      };
    }
    if (scheduleIds.includes(s.targetScheduleId)) {
      marks[s.targetScheduleId] = {
        scheduleId: s.targetScheduleId,
        originalDay: s.sourceSchedule.day,
        originalPeriod: s.sourceSchedule.period,
        swappedAt: when,
      };
    }
  }
  return marks;
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
