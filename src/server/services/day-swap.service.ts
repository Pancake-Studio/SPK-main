import "server-only";

import { db } from "@/lib/db";
import { ROLES, NOTIFICATION_TYPES, type DayKey } from "@/lib/constants";
import {
  weekStartOf,
  weekRangeLabel,
  dayLabelTh,
  buildDayRemap,
  type DaySwapData,
} from "@/lib/day-swap";
import type { DaySwapInput } from "@/lib/validations";
import { notifyUsers } from "./notification.service";

type DaySwapRow = { id: string; weekStart: string; dayA: string; dayB: string; note: string | null };

function toData(r: DaySwapRow): DaySwapData {
  return { id: r.id, weekStart: r.weekStart, dayA: r.dayA as DayKey, dayB: r.dayB as DayKey, note: r.note };
}

/** All whole-day swaps for the week containing `dateIso` (or its Monday). */
export async function getWeekSwaps(dateIso: string): Promise<DaySwapData[]> {
  const weekStart = weekStartOf(dateIso);
  const rows = await db.daySwap.findMany({ where: { weekStart }, orderBy: { createdAt: "asc" } });
  return rows.map(toData);
}

/** display→source weekday remap for the week containing `dateIso`. */
export async function getDayRemap(dateIso: string): Promise<Partial<Record<DayKey, DayKey>>> {
  return buildDayRemap(await getWeekSwaps(dateIso));
}

/** Upcoming swaps (this week onward), newest week first-ish (asc by week). */
export async function listUpcomingDaySwaps(fromDateIso: string): Promise<DaySwapData[]> {
  const fromWeek = weekStartOf(fromDateIso);
  const rows = await db.daySwap.findMany({
    where: { weekStart: { gte: fromWeek } },
    orderBy: [{ weekStart: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toData);
}

/** Create a swap. Normalises weekStart to Monday and rejects a day that is
 *  already part of another swap in the same week (keeps the remap unambiguous). */
export async function createDaySwap(input: DaySwapInput): Promise<void> {
  const weekStart = weekStartOf(input.weekStart);
  const existing = await db.daySwap.findMany({ where: { weekStart } });
  const used = new Set<string>();
  for (const e of existing) {
    used.add(e.dayA);
    used.add(e.dayB);
  }
  if (used.has(input.dayA) || used.has(input.dayB)) {
    throw new Error("วันนี้ถูกสลับไปแล้วในสัปดาห์นี้");
  }
  await db.daySwap.create({
    data: { weekStart, dayA: input.dayA, dayB: input.dayB, note: input.note ?? null },
  });

  // Notify the whole school — a whole-day swap affects every class & teacher.
  await notifyDaySwap(weekStart, input.dayA, input.dayB, input.note);
}

/** Fan out a "schedule changed" notification (realtime + web push) to all
 *  teachers and students when a whole-day swap is made. */
async function notifyDaySwap(weekStart: string, dayA: string, dayB: string, note?: string) {
  const title = "เปลี่ยนแปลงตารางเรียน";
  const message =
    `สัปดาห์ ${weekRangeLabel(weekStart)}: สลับตารางทั้งวัน ${dayLabelTh(dayA)} ↔ ${dayLabelTh(dayB)}` +
    (note ? ` (${note})` : "");

  const [teachers, students] = await Promise.all([
    db.user.findMany({ where: { role: ROLES.TEACHER }, select: { id: true } }),
    db.user.findMany({ where: { role: ROLES.STUDENT }, select: { id: true } }),
  ]);

  await Promise.all([
    notifyUsers(teachers.map((u) => u.id), {
      type: NOTIFICATION_TYPES.SCHEDULE_CHANGED,
      title,
      message,
      linkUrl: "/teacher/schedule",
    }),
    notifyUsers(students.map((u) => u.id), {
      type: NOTIFICATION_TYPES.SCHEDULE_CHANGED,
      title,
      message,
      linkUrl: "/student/schedule",
    }),
  ]);
}

export async function deleteDaySwap(id: string): Promise<void> {
  await db.daySwap.deleteMany({ where: { id } });
}
