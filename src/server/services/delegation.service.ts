import "server-only";

import { db } from "@/lib/db";
import { createNotification, notifyUsers } from "./notification.service";
import { NOTIFICATION_TYPES, ROLES } from "@/lib/constants";
import { dayMeta } from "@/lib/timetable";
import { weekStartOf, weekRangeLabel, toIsoDate } from "@/lib/day-swap";

/** Minimal identity passed from the action layer (already authenticated). */
type Actor = { userId: string; role: string; teacherId?: string | null };

export class DelegationError extends Error {}

export const DELEGATION_STATUS = {
  ACTIVE: "ACTIVE",
  DECLINED: "DECLINED",
  CANCELLED: "CANCELLED",
} as const;

const delegationInclude = {
  fromTeacher: { include: { user: true } },
  toTeacher: { include: { user: true } },
  schedule: { include: { subject: true, class: true } },
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
  const students = await db.student.findMany({ where: { classId }, select: { userId: true } });
  return students.map((s) => s.userId);
}

/* ------------------------------------------------------------------ */
/*  Create                                                             */
/* ------------------------------------------------------------------ */

export async function createDelegation(input: {
  ownerTeacherId: string;
  scheduleId: string;
  toTeacherId: string;
  /** A date (YYYY-MM-DD) inside the week the delegation should apply to. */
  weekDate: string;
  reason?: string;
}) {
  const weekStart = weekStartOf(input.weekDate);
  if (weekStart < weekStartOf(toIsoDate(new Date()))) {
    throw new DelegationError("เลือกได้เฉพาะสัปดาห์ปัจจุบันหรือสัปดาห์ถัดไป");
  }
  if (input.toTeacherId === input.ownerTeacherId) {
    throw new DelegationError("ฝากคาบให้ตัวเองไม่ได้");
  }

  const schedule = await db.schedule.findUnique({
    where: { id: input.scheduleId },
    include: { subject: true, class: true },
  });
  if (!schedule) throw new DelegationError("ไม่พบคาบเรียนที่เลือก");
  if (schedule.teacherId !== input.ownerTeacherId) {
    throw new DelegationError("ฝากได้เฉพาะคาบที่คุณสอนเอง");
  }

  const cover = await db.teacher.findUnique({
    where: { id: input.toTeacherId },
    include: { user: true },
  });
  if (!cover) throw new DelegationError("ไม่พบครูที่จะฝากคาบ");

  // The covering teacher must be free at that day/period (#6).
  const busy = await db.schedule.findFirst({
    where: { teacherId: input.toTeacherId, day: schedule.day, period: schedule.period },
    select: { id: true },
  });
  if (busy) {
    throw new DelegationError(
      `ครู ${cover.user.name} มีคาบสอนอยู่แล้วใน ${dayMeta(schedule.day)?.labelTh ?? schedule.day} คาบ ${schedule.period}`,
    );
  }

  // One active delegation per period per week.
  const existing = await db.delegation.findFirst({
    where: { scheduleId: input.scheduleId, weekStart, status: DELEGATION_STATUS.ACTIVE },
  });
  if (existing) throw new DelegationError("คาบนี้ถูกฝากไปแล้วในสัปดาห์นี้");

  const delegation = await db.delegation.create({
    data: {
      weekStart,
      scheduleId: input.scheduleId,
      fromTeacherId: input.ownerTeacherId,
      toTeacherId: input.toTeacherId,
      reason: input.reason?.trim() || null,
      status: DELEGATION_STATUS.ACTIVE,
    },
    include: delegationInclude,
  });

  const weekLabel = weekRangeLabel(weekStart);
  await createNotification({
    userId: cover.user.id,
    type: NOTIFICATION_TYPES.SCHEDULE_CHANGED,
    title: "คุณได้รับฝากคาบสอน",
    message: `${delegation.fromTeacher.user.name} ฝากให้คุณคุมแทน ${slotLabel(schedule)} — เฉพาะสัปดาห์ ${weekLabel}`,
    linkUrl: "/teacher/delegations",
  });

  const students = await classStudentUserIds(schedule.classId);
  await notifyUsers(students, {
    type: NOTIFICATION_TYPES.SCHEDULE_CHANGED,
    title: "มีการฝากคาบสอน",
    message: `${slotLabel(schedule)} สัปดาห์ ${weekLabel} ครู ${cover.user.name} จะมาคุมแทน`,
    linkUrl: "/student/schedule",
  });

  return delegation;
}

/* ------------------------------------------------------------------ */
/*  Cancel (owner) / decline (covering teacher)                        */
/* ------------------------------------------------------------------ */

async function endDelegation(
  id: string,
  actor: Actor,
  mode: "CANCEL" | "DECLINE",
) {
  const d = await db.delegation.findUnique({ where: { id }, include: delegationInclude });
  if (!d) throw new DelegationError("ไม่พบรายการฝากคาบ");
  if (d.status !== DELEGATION_STATUS.ACTIVE) {
    throw new DelegationError("รายการนี้ถูกดำเนินการไปแล้ว");
  }
  const isAdmin = actor.role === ROLES.ADMIN;
  const isOwner = actor.teacherId && actor.teacherId === d.fromTeacherId;
  const isCover = actor.teacherId && actor.teacherId === d.toTeacherId;

  if (mode === "CANCEL" && !isAdmin && !isOwner) {
    throw new DelegationError("ยกเลิกได้เฉพาะครูเจ้าของคาบเท่านั้น");
  }
  if (mode === "DECLINE" && !isAdmin && !isCover) {
    throw new DelegationError("ปฏิเสธได้เฉพาะครูที่รับฝากเท่านั้น");
  }

  await db.delegation.update({
    where: { id },
    data: { status: mode === "CANCEL" ? DELEGATION_STATUS.CANCELLED : DELEGATION_STATUS.DECLINED },
  });

  const weekLabel = d.weekStart ? weekRangeLabel(d.weekStart) : "";
  // Notify the OTHER teacher + the class that the cover is off.
  const otherUserId =
    mode === "CANCEL" ? d.toTeacher.user.id : d.fromTeacher.user.id;
  await createNotification({
    userId: otherUserId,
    type: NOTIFICATION_TYPES.SCHEDULE_CHANGED,
    title: mode === "CANCEL" ? "ยกเลิกการฝากคาบ" : "ครูปฏิเสธการรับฝากคาบ",
    message: `${slotLabel(d.schedule)} สัปดาห์ ${weekLabel} กลับเป็นตารางเดิม`,
    linkUrl: "/teacher/delegations",
  });

  const students = await classStudentUserIds(d.schedule.classId);
  await notifyUsers(students, {
    type: NOTIFICATION_TYPES.SCHEDULE_CHANGED,
    title: "ตารางเรียนกลับเป็นเดิม",
    message: `${slotLabel(d.schedule)} สัปดาห์ ${weekLabel} ยกเลิกการฝากคาบแล้ว`,
    linkUrl: "/student/schedule",
  });

  return d;
}

export function cancelDelegation(id: string, actor: Actor) {
  return endDelegation(id, actor, "CANCEL");
}

export function declineDelegation(id: string, actor: Actor) {
  return endDelegation(id, actor, "DECLINE");
}

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

type DelegationWithRelations = Awaited<ReturnType<typeof getDelegationsForTeacher>>["owned"][number];

export function mapDelegationToClient(d: {
  id: string;
  status: string;
  reason: string | null;
  weekStart: string;
  createdAt: Date;
  fromTeacherId: string;
  toTeacherId: string;
  fromTeacher: { user: { name: string } };
  toTeacher: { user: { name: string } };
  schedule: { day: string; period: number; subject: { subjectName: string; subjectCode: string }; class: { className: string } };
}) {
  return {
    id: d.id,
    status: d.status,
    reason: d.reason,
    weekLabel: weekRangeLabel(d.weekStart),
    createdAt: d.createdAt.toISOString(),
    fromTeacherId: d.fromTeacherId,
    toTeacherId: d.toTeacherId,
    fromTeacherName: d.fromTeacher.user.name,
    toTeacherName: d.toTeacher.user.name,
    slotLabel: slotLabel(d.schedule),
  };
}
export type DelegationClient = ReturnType<typeof mapDelegationToClient>;

/** Delegations this teacher owns (handed out) and ones they are covering. */
export async function getDelegationsForTeacher(teacherId: string) {
  const [owned, covering] = await Promise.all([
    db.delegation.findMany({
      where: { fromTeacherId: teacherId },
      include: delegationInclude,
      orderBy: { createdAt: "desc" },
    }),
    db.delegation.findMany({
      where: { toTeacherId: teacherId },
      include: delegationInclude,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { owned, covering };
}

/** Count of active covers for a teacher (badge on the dashboard / nav). */
export function getActiveCoverCount(teacherId: string) {
  return db.delegation.count({
    where: { toTeacherId: teacherId, status: DELEGATION_STATUS.ACTIVE },
  });
}

export type { DelegationWithRelations };
