"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Coffee, UtensilsCrossed, Sunrise } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { DAYS, type DayKey } from "@/lib/constants";
import {
  DEFAULT_BELL_SLOTS,
  isClassKind,
  orderedSlots,
  type BellSlotData,
} from "@/lib/bell-schedule";
import { cn } from "@/lib/utils";

export type EditorSlot = {
  id: string;
  classId: string;
  subjectId: string;
  day: DayKey;
  period: number;
  room: string | null;
  className: string;
  subjectName: string;
  subjectCode: string;
  colorHex: string | null;
  /** subject flagged "ครูสอนหลายคน" — may be co-taught / span several rooms. */
  multi: boolean;
};

type SaveInput = {
  id?: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  day: string;
  period: number;
  room?: string;
};
type Result = { ok: boolean; error?: string };

const BREAK_ICON: Record<string, typeof Coffee> = { HOMEROOM: Sunrise, BREAK: Coffee, LUNCH: UtensilsCrossed };

export type SlotOccupant = { subjectId: string; multi: boolean };

export function ScheduleEditor({
  teacherId,
  slots,
  classes,
  subjects,
  occupancy,
  activities = {},
  bellSlots = DEFAULT_BELL_SLOTS,
  onSave,
  onDelete,
}: {
  teacherId: string;
  slots: EditorSlot[];
  classes: ComboboxOption[];
  subjects: ComboboxOption[];
  /** `${classId}|${day}|${period}` → the lesson occupying it (subject + whether
   *  it is a multi-teacher subject that can be co-taught). */
  occupancy: Record<string, SlotOccupant>;
  /** `${day}|${period}` → school-wide activity label (read-only, blocks editing). */
  activities?: Record<string, string>;
  bellSlots?: BellSlotData[];
  onSave: (input: SaveInput) => Promise<Result>;
  onDelete: (id: string) => Promise<Result>;
}) {
  const router = useRouter();
  const cols = React.useMemo(() => orderedSlots(bellSlots), [bellSlots]);
  // A teacher may teach several rooms in the same period (multi-teacher subject),
  // so each cell holds a list of lessons.
  const grid = React.useMemo(() => {
    const g: Record<string, Record<number, EditorSlot[]>> = {};
    for (const s of slots) ((g[s.day] ??= {})[s.period] ??= []).push(s);
    return g;
  }, [slots]);

  // Dialog state.
  const [open, setOpen] = React.useState(false);
  const [cell, setCell] = React.useState<{ day: DayKey; period: number; slot: EditorSlot | null } | null>(null);
  const [classId, setClassId] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("");
  const [room, setRoom] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  function openCell(day: DayKey, period: number, slot: EditorSlot | null, presetSubjectId?: string) {
    setCell({ day, period, slot });
    setClassId(slot?.classId ?? "");
    setSubjectId(slot?.subjectId ?? presetSubjectId ?? "");
    setRoom(slot?.room ?? "");
    setOpen(true);
  }

  // Classes already booked at this cell's (day, period) can't be double-booked —
  // EXCEPT a multi-teacher subject, which stays selectable (the subject is then
  // locked to that same subject below). The slot being edited keeps its own class.
  // Rooms this teacher already teaches at this (day, period) — can't pick again.
  const myClassesHere = React.useMemo(() => {
    if (!cell) return new Set<string>();
    return new Set(
      slots.filter((s) => s.day === cell.day && s.period === cell.period && s.id !== cell.slot?.id).map((s) => s.classId),
    );
  }, [cell, slots]);

  const classOptions = React.useMemo<ComboboxOption[]>(() => {
    if (!cell) return classes;
    return classes.map((c) => {
      if (cell.slot && c.value === cell.slot.classId) return c;
      if (myClassesHere.has(c.value)) return { ...c, disabled: true, hint: "สอนห้องนี้แล้ว" };
      const occ = occupancy[`${c.value}|${cell.day}|${cell.period}`];
      if (!occ) return c;
      if (occ.multi) return { ...c, hint: "วิชาสอนหลายคน" };
      return { ...c, disabled: true, hint: "มีคาบแล้ว" };
    });
  }, [cell, classes, occupancy, myClassesHere]);

  // Picking a class that already has a multi-teacher lesson at this slot locks
  // the subject to that same subject (you may only co-teach the same subject).
  const lockedSubjectId = React.useMemo(() => {
    if (!cell || (cell.slot && classId === cell.slot.classId)) return null;
    const occ = occupancy[`${classId}|${cell.day}|${cell.period}`];
    return occ?.multi ? occ.subjectId : null;
  }, [cell, classId, occupancy]);

  React.useEffect(() => {
    if (lockedSubjectId) setSubjectId(lockedSubjectId);
  }, [lockedSubjectId]);

  async function save() {
    if (!cell) return;
    if (!classId || !subjectId) {
      toast.error("เลือกห้องเรียนและวิชาก่อน");
      return;
    }
    setSaving(true);
    const res = await onSave({
      id: cell.slot?.id,
      classId,
      subjectId,
      teacherId,
      day: cell.day,
      period: cell.period,
      room: room.trim() || undefined,
    });
    setSaving(false);
    if (res.ok) {
      toast.success(cell.slot ? "แก้ไขคาบสอนแล้ว" : "เพิ่มคาบสอนแล้ว");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(res.error ?? "บันทึกไม่สำเร็จ");
    }
  }

  async function remove() {
    if (!cell?.slot) return;
    if (!window.confirm(`ลบคาบ ${cell.slot.subjectName} (${cell.slot.className})?`)) return;
    setSaving(true);
    const res = await onDelete(cell.slot.id);
    setSaving(false);
    if (res.ok) {
      toast.success("ลบคาบสอนแล้ว");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(res.error ?? "ลบไม่สำเร็จ");
    }
  }

  const cellBorder = "border border-border";

  return (
    <>
      <div className="overflow-x-auto scrollbar-thin rounded-lg border border-border bg-card">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={cn(cellBorder, "sticky left-0 z-10 w-24 bg-muted/70 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground")}>
                วัน \ คาบ
              </th>
              {cols.map((bell) => {
                const isClass = isClassKind(bell.kind);
                const Icon = BREAK_ICON[bell.kind] ?? Coffee;
                return (
                  <th key={bell.id} className={cn(cellBorder, "px-2 py-2 text-center align-middle", isClass ? "min-w-[120px] bg-muted/40" : "min-w-[60px] bg-muted/20")}>
                    {isClass ? (
                      <span className="block text-sm font-bold text-foreground">{bell.periodNumber}</span>
                    ) : (
                      <span className="mx-auto flex w-fit items-center gap-1 text-[11px] font-medium text-muted-foreground">
                        <Icon className="size-3.5" />
                        {bell.label}
                      </span>
                    )}
                    <span className="block text-[10px] text-muted-foreground">{bell.startTime}–{bell.endTime}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((d) => (
              <tr key={d.key}>
                <th scope="row" className={cn(cellBorder, "sticky left-0 z-10 bg-muted/40 px-2 py-2 text-center align-middle")}>
                  <span className="block text-sm font-semibold text-foreground">{d.labelTh}</span>
                  <span className="block text-[10px] text-muted-foreground">{d.short}</span>
                </th>
                {cols.map((bell) => {
                  if (!isClassKind(bell.kind)) {
                    return (
                      <td key={bell.id} className={cn(cellBorder, "bg-muted/15 p-0 text-center align-middle")}>
                        <span className="text-[10px] text-muted-foreground/50">·</span>
                      </td>
                    );
                  }
                  const period = bell.periodNumber!;
                  const here = grid[d.key]?.[period] ?? [];
                  const multiSubjectId = here.find((s) => s.multi)?.subjectId;
                  const activityLabel = activities[`${d.key}|${period}`];
                  return (
                    <td key={bell.id} className={cn(cellBorder, "min-h-[78px] min-w-[120px] p-1 align-top")}>
                      {activityLabel && here.length === 0 ? (
                        <div className="flex h-[70px] w-full flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-primary/40 bg-secondary/40 px-2 text-center">
                          <span className="text-[12px] font-semibold text-foreground">{activityLabel}</span>
                          <span className="text-[9px] font-medium text-muted-foreground">กิจกรรม · ทุกห้อง</span>
                        </div>
                      ) : here.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => openCell(d.key as DayKey, period, null)}
                          className="flex h-[70px] w-full items-center justify-center rounded-md border border-dashed border-border text-muted-foreground/50 transition-colors hover:border-primary/50 hover:bg-secondary/40 hover:text-primary"
                          aria-label={`เพิ่มคาบ ${d.labelTh} คาบ ${period}`}
                        >
                          <Plus className="size-4" />
                        </button>
                      ) : (
                        <div className="flex h-full flex-col gap-1">
                          {here.map((slot) => (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => openCell(d.key as DayKey, period, slot)}
                              className="group flex w-full flex-col rounded-md border border-transparent bg-muted/40 px-2 py-1.5 text-left transition-colors hover:border-primary/40 hover:bg-secondary/60"
                            >
                              <span className="flex items-center gap-1">
                                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: slot.colorHex ?? "var(--color-primary)" }} />
                                <span className="truncate text-[13px] font-semibold text-foreground">{slot.subjectName}</span>
                                <Pencil className="ml-auto size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                              </span>
                              <span className="mt-0.5 truncate text-[11px] font-medium text-primary">{slot.className}</span>
                              {slot.room && <span className="truncate text-[10px] text-muted-foreground">{slot.room}</span>}
                            </button>
                          ))}
                          {multiSubjectId && (
                            <button
                              type="button"
                              onClick={() => openCell(d.key as DayKey, period, null, multiSubjectId)}
                              className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-secondary/40 hover:text-primary"
                            >
                              <Plus className="size-3" /> เพิ่มห้อง
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{cell?.slot ? "แก้ไขคาบสอน" : "เพิ่มคาบสอน"}</DialogTitle>
            <DialogDescription>
              {cell ? `${DAYS.find((x) => x.key === cell.day)?.labelTh} · คาบ ${cell.period}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ed-class">ห้องเรียน <span className="text-destructive">*</span></Label>
              <Combobox id="ed-class" options={classOptions} value={classId} onChange={setClassId} placeholder="เลือกห้องเรียน" searchPlaceholder="ค้นหาห้อง…" />
              <p className="text-xs text-muted-foreground">ห้องที่มีคาบเรียนอยู่แล้วในเวลานี้จะเลือกไม่ได้</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-subject">วิชา <span className="text-destructive">*</span></Label>
              <Combobox id="ed-subject" options={subjects} value={subjectId} onChange={setSubjectId} placeholder="เลือกวิชา" searchPlaceholder="ค้นหาวิชา (ชื่อ/รหัส)…" disabled={Boolean(lockedSubjectId)} />
              {lockedSubjectId && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ห้องนี้มีวิชาที่สอนหลายคนอยู่แล้วในคาบนี้ — เพิ่มได้เฉพาะวิชาเดียวกันเท่านั้น
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-room">ห้อง/สถานที่ (ไม่บังคับ)</Label>
              <Input id="ed-room" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="เช่น ห้อง 521 / ห้องปฏิบัติการ" />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {cell?.slot ? (
              <Button variant="ghost" onClick={remove} disabled={saving} className="text-destructive hover:text-destructive">
                <Trash2 className="size-4" /> ลบคาบนี้
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>ยกเลิก</Button>
              <Button onClick={save} loading={saving}>บันทึก</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
