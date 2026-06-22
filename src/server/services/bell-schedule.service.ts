import "server-only";

import { db } from "@/lib/db";
import {
  DEFAULT_BELL_SLOTS,
  type BellScheduleData,
  type BellSlotData,
  type SlotKind,
} from "@/lib/bell-schedule";
import type { BellScheduleSaveInput, ScheduleOverrideInput } from "@/lib/validations";

type BellSlotRow = {
  id: string;
  order: number;
  kind: string;
  label: string;
  startTime: string;
  endTime: string;
  periodNumber: number | null;
};

function rowToSlot(r: BellSlotRow): BellSlotData {
  return {
    id: r.id,
    order: r.order,
    kind: r.kind as SlotKind,
    label: r.label,
    startTime: r.startTime,
    endTime: r.endTime,
    periodNumber: r.periodNumber,
  };
}

const slotsOrderBy = { orderBy: { order: "asc" } } as const;

/** Create the default template from DEFAULT_BELL_SLOTS if none exists yet, so
 *  the app is self-healing on a fresh/un-seeded DB. Returns the default row. */
export async function ensureDefaultSchedule(): Promise<BellScheduleData> {
  const existing = await db.bellSchedule.findFirst({
    where: { isDefault: true },
    include: { slots: slotsOrderBy },
  });
  if (existing) {
    return { id: existing.id, name: existing.name, isDefault: true, slots: existing.slots.map(rowToSlot) };
  }
  const created = await db.bellSchedule.create({
    data: {
      name: "ตารางปกติ",
      isDefault: true,
      slots: {
        create: DEFAULT_BELL_SLOTS.map((s) => ({
          order: s.order,
          kind: s.kind,
          label: s.label,
          startTime: s.startTime,
          endTime: s.endTime,
          periodNumber: s.periodNumber,
        })),
      },
    },
    include: { slots: slotsOrderBy },
  });
  return { id: created.id, name: created.name, isDefault: true, slots: created.slots.map(rowToSlot) };
}

/** The active default template (used for week-view grids everywhere). */
export async function getDefaultSchedule(): Promise<BellScheduleData> {
  return ensureDefaultSchedule();
}

/** All templates with their slots, default first. */
export async function listBellSchedules(): Promise<BellScheduleData[]> {
  await ensureDefaultSchedule();
  const rows = await db.bellSchedule.findMany({
    include: { slots: slotsOrderBy },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    isDefault: r.isDefault,
    slots: r.slots.map(rowToSlot),
  }));
}

export async function getBellScheduleById(id: string): Promise<BellScheduleData | null> {
  const r = await db.bellSchedule.findUnique({ where: { id }, include: { slots: slotsOrderBy } });
  return r ? { id: r.id, name: r.name, isDefault: r.isDefault, slots: r.slots.map(rowToSlot) } : null;
}

/** Bell slots in effect for a specific local date: the pinned override's
 *  template if one exists, otherwise the default. */
export async function getEffectiveSlots(date: string): Promise<BellSlotData[]> {
  const override = await db.scheduleOverride.findUnique({
    where: { date },
    include: { bellSchedule: { include: { slots: slotsOrderBy } } },
  });
  if (override) return override.bellSchedule.slots.map(rowToSlot);
  const def = await getDefaultSchedule();
  return def.slots;
}

/** Replace a template's slots wholesale (after edit / reorder / swap). The
 *  client sends already-ordered, already-chained slots; we persist verbatim
 *  with `order` = array index inside a transaction. */
export async function saveBellScheduleSlots(input: BellScheduleSaveInput): Promise<void> {
  await db.$transaction([
    db.bellSchedule.update({ where: { id: input.id }, data: { name: input.name } }),
    db.bellSlot.deleteMany({ where: { scheduleId: input.id } }),
    db.bellSlot.createMany({
      data: input.slots.map((s, i) => ({
        scheduleId: input.id,
        order: i,
        kind: s.kind,
        label: s.label,
        startTime: s.startTime,
        endTime: s.endTime,
        periodNumber: s.kind === "CLASS" ? s.periodNumber : null,
      })),
    }),
  ]);
}

/** Create a new template, optionally cloning another template's slots. */
export async function createBellSchedule(name: string, cloneFromId?: string): Promise<string> {
  const source = cloneFromId
    ? await getBellScheduleById(cloneFromId)
    : await getDefaultSchedule();
  const slots = source?.slots ?? DEFAULT_BELL_SLOTS;
  const created = await db.bellSchedule.create({
    data: {
      name,
      isDefault: false,
      slots: {
        create: slots.map((s, i) => ({
          order: i,
          kind: s.kind,
          label: s.label,
          startTime: s.startTime,
          endTime: s.endTime,
          periodNumber: s.periodNumber,
        })),
      },
    },
  });
  return created.id;
}

/** Promote a template to the school-wide default (whole-week scope). */
export async function setDefaultBellSchedule(id: string): Promise<void> {
  await db.$transaction([
    db.bellSchedule.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
    db.bellSchedule.update({ where: { id }, data: { isDefault: true } }),
  ]);
}

export async function deleteBellSchedule(id: string): Promise<void> {
  const row = await db.bellSchedule.findUnique({ where: { id } });
  if (!row || row.isDefault) throw new Error("ลบตารางหลักไม่ได้");
  await db.bellSchedule.delete({ where: { id } });
}

/* ------------------------------ overrides -------------------------------- */

/** Pin (or re-pin) a date to a template — the specific-day temporary change. */
export async function upsertScheduleOverride(input: ScheduleOverrideInput): Promise<void> {
  await db.scheduleOverride.upsert({
    where: { date: input.date },
    update: { bellScheduleId: input.bellScheduleId, note: input.note ?? null },
    create: { date: input.date, bellScheduleId: input.bellScheduleId, note: input.note ?? null },
  });
}

export async function deleteScheduleOverride(date: string): Promise<void> {
  await db.scheduleOverride.deleteMany({ where: { date } });
}

/** Upcoming overrides (today onward), each with its template name. */
export async function listUpcomingOverrides(fromDate: string) {
  const rows = await db.scheduleOverride.findMany({
    where: { date: { gte: fromDate } },
    include: { bellSchedule: true },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    note: r.note,
    bellScheduleId: r.bellScheduleId,
    bellScheduleName: r.bellSchedule.name,
  }));
}
