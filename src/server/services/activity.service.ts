import "server-only";

import { db } from "@/lib/db";
import type { DayKey } from "@/lib/constants";
import type { TimetableSlot } from "@/lib/timetable";
import type { ActivityInput, ActivityUpdateInput } from "@/lib/validations";

export function listActivityPeriods() {
  return db.activityPeriod.findMany({ orderBy: [{ day: "asc" }, { period: "asc" }] });
}

export function createActivityPeriod(input: ActivityInput) {
  return db.activityPeriod.create({
    data: { day: input.day, period: input.period, label: input.label, colorHex: input.colorHex || null },
  });
}

export function updateActivityPeriod(input: ActivityUpdateInput) {
  return db.activityPeriod.update({
    where: { id: input.id },
    data: { day: input.day, period: input.period, label: input.label, colorHex: input.colorHex || null },
  });
}

export function deleteActivityPeriod(id: string) {
  return db.activityPeriod.delete({ where: { id } });
}

type ActivityRow = { id: string; day: string; period: number; label: string; colorHex: string | null };

/** A school-wide activity rendered as a synthetic timetable slot (no class/teacher). */
function activitySlot(a: ActivityRow): TimetableSlot {
  return {
    id: `activity-${a.id}`,
    day: a.day as DayKey,
    period: a.period,
    room: null,
    subjectName: a.label,
    subjectCode: "",
    colorHex: a.colorHex,
    activity: true,
    teacherId: "",
    teacherName: "",
    classId: "",
    className: "",
    gradeLevel: "",
  };
}

/** Overlay school-wide activities onto a timetable. Activities have the highest
 *  priority: any regular slot at the same (day, period) is hidden and replaced
 *  by the activity slot. Deleting the activity makes the original slot visible
 *  again automatically. Shared by class & teacher views. */
export async function withActivities(slots: TimetableSlot[]): Promise<TimetableSlot[]> {
  const activities = await db.activityPeriod.findMany();
  if (activities.length === 0) return slots;
  const activityKeys = new Set(activities.map((a) => `${a.day}|${a.period}`));
  const filtered = slots.filter((s) => !activityKeys.has(`${s.day}|${s.period}`));
  const extra = activities.map(activitySlot);
  return [...filtered, ...extra];
}

/** The school-wide activity at (day, period), if any — used to block scheduling
 *  a normal lesson onto an activity slot. */
export function activityAt(day: string, period: number) {
  return db.activityPeriod.findFirst({ where: { day, period } });
}

/** `${day}|${period}` → activity label, for the editor (block scheduling there). */
export async function activitySlotMap(): Promise<Record<string, string>> {
  const activities = await db.activityPeriod.findMany();
  const map: Record<string, string> = {};
  for (const a of activities) map[`${a.day}|${a.period}`] = a.label;
  return map;
}
