"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Reorder, useDragControls } from "framer-motion";
import {
  GripVertical,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Save,
  Clock,
  Star,
  CopyPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  rechainSlots,
  isClassKind,
  type BellScheduleData,
  type BellSlotData,
  type SlotKind,
} from "@/lib/bell-schedule";
import {
  saveBellScheduleAction,
  createBellScheduleAction,
  setDefaultBellScheduleAction,
  deleteBellScheduleAction,
} from "@/server/actions/bell-schedule.actions";

const KIND_LABEL: Record<SlotKind, string> = {
  HOMEROOM: "โฮมรูม",
  CLASS: "คาบเรียน",
  BREAK: "พัก",
  LUNCH: "พักเที่ยง",
};
const KIND_OPTIONS = Object.entries(KIND_LABEL) as [SlotKind, string][];

const KIND_TONE: Record<SlotKind, string> = {
  HOMEROOM: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  CLASS: "bg-primary/10 text-primary",
  BREAK: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  LUNCH: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
};

let tmpCounter = 0;
function freshId() {
  tmpCounter += 1;
  return `tmp-${Date.now()}-${tmpCounter}`;
}

/* ===================== Outer: template chooser ===================== */

export function BellScheduleEditor({ templates }: { templates: BellScheduleData[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = React.useState(
    () => templates.find((t) => t.isDefault)?.id ?? templates[0]?.id ?? "",
  );
  const selected = templates.find((t) => t.id === selectedId) ?? templates[0];

  function onCreate() {
    const name = window.prompt("ตั้งชื่อตารางใหม่ (คัดลอกจากตารางที่เลือก)", `${selected?.name ?? "ตาราง"} (สำเนา)`);
    if (!name) return;
    startTransition(async () => {
      const res = await createBellScheduleAction(name, selected?.id);
      if (res.ok) {
        toast.success("สร้างตารางใหม่แล้ว");
        if (res.id) setSelectedId(res.id);
        router.refresh();
      } else {
        toast.error(res.error ?? "สร้างไม่สำเร็จ");
      }
    });
  }

  function onSetDefault() {
    if (!selected || selected.isDefault) return;
    startTransition(async () => {
      const res = await setDefaultBellScheduleAction(selected.id);
      if (res.ok) {
        toast.success("ตั้งเป็นตารางหลัก (ใช้ทั้งสัปดาห์) แล้ว");
        router.refresh();
      } else toast.error("ไม่สำเร็จ");
    });
  }

  function onDelete() {
    if (!selected || selected.isDefault) return;
    if (!window.confirm(`ลบตาราง "${selected.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteBellScheduleAction(selected.id);
      if (res.ok) {
        toast.success("ลบแล้ว");
        setSelectedId(templates.find((t) => t.isDefault)?.id ?? "");
        router.refresh();
      } else toast.error(res.error ?? "ลบไม่สำเร็จ");
    });
  }

  if (!selected) return null;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="h-10 rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.isDefault ? " (หลัก)" : ""}
            </option>
          ))}
        </select>
        {selected.isDefault ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Star className="size-3.5" /> ตารางหลัก · ใช้ทั้งสัปดาห์
          </span>
        ) : (
          <Button size="sm" variant="secondary" onClick={onSetDefault} loading={pending}>
            <Star className="size-4" /> ตั้งเป็นตารางหลัก
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onCreate} loading={pending}>
            <CopyPlus className="size-4" /> ตารางใหม่
          </Button>
          {!selected.isDefault && (
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        ลากที่จับ <GripVertical className="inline size-3.5" /> หรือใช้ปุ่มลูกศรเพื่อสลับลำดับคาบ — เวลาจะถูกจัดเรียงต่อเนื่องให้อัตโนมัติ
        (วิชาจะย้ายตามช่วงเวลา). แก้ตัวเลขเวลาเพื่อปรับระยะเวลาเรียน. การบันทึกจะมีผลกับทุกห้องเรียน
        {selected.isDefault ? " ทั้งสัปดาห์" : " เฉพาะตารางนี้"}.
      </p>

      {/* key → fully reset draft state when switching templates */}
      <TemplateSlots key={selected.id} template={selected} />
    </Card>
  );
}

/* ===================== Inner: slot list for one template ===================== */

function TemplateSlots({ template }: { template: BellScheduleData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = React.useState(template.name);
  const [slots, setSlots] = React.useState<BellSlotData[]>(template.slots);

  const dirty =
    name !== template.name || JSON.stringify(stripIds(slots)) !== JSON.stringify(stripIds(template.slots));

  function applyReorder(next: BellSlotData[]) {
    // Re-chain times so swapping moves the lessons with their time block.
    setSlots(rechainSlots(next).map((s, i) => ({ ...s, order: i })));
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...slots];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j]!, next[index]!];
    applyReorder(next);
  }

  function patch(id: string, fields: Partial<BellSlotData>) {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...fields } : s)));
  }

  function removeRow(id: string) {
    setSlots((prev) => rechainSlots(prev.filter((s) => s.id !== id)).map((s, i) => ({ ...s, order: i })));
  }

  function addRow() {
    setSlots((prev) => {
      const last = prev[prev.length - 1];
      const usedPeriods = new Set(prev.filter((s) => s.periodNumber != null).map((s) => s.periodNumber!));
      let nextPeriod = 1;
      while (usedPeriods.has(nextPeriod)) nextPeriod += 1;
      const start = last?.endTime ?? "08:20";
      const [h, m] = start.split(":").map(Number);
      const endMin = (h ?? 0) * 60 + (m ?? 0) + 50;
      const newSlot: BellSlotData = {
        id: freshId(),
        order: prev.length,
        kind: "CLASS",
        label: `คาบ ${nextPeriod}`,
        startTime: start,
        endTime: `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`,
        periodNumber: nextPeriod,
      };
      return [...prev, newSlot];
    });
  }

  function recontinue() {
    setSlots((prev) => rechainSlots(prev).map((s, i) => ({ ...s, order: i })));
  }

  function onSave() {
    // Client guards: class rows need a unique period number.
    const classNos = slots.filter((s) => isClassKind(s.kind)).map((s) => s.periodNumber);
    if (classNos.some((n) => n == null)) {
      toast.error("คาบเรียนทุกแถวต้องมีเลขคาบ");
      return;
    }
    if (new Set(classNos).size !== classNos.length) {
      toast.error("เลขคาบซ้ำกัน");
      return;
    }
    startTransition(async () => {
      const res = await saveBellScheduleAction({
        id: template.id,
        name: name.trim(),
        slots: slots.map((s) => ({
          kind: s.kind,
          label: s.label,
          startTime: s.startTime,
          endTime: s.endTime,
          periodNumber: s.periodNumber,
        })),
      });
      if (res.ok) {
        toast.success(res.message ?? "บันทึกแล้ว");
        router.refresh();
      } else {
        toast.error(res.error ?? "บันทึกไม่สำเร็จ");
      }
    });
  }

  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 max-w-xs"
          placeholder="ชื่อตาราง"
        />
        <Button size="sm" variant="ghost" onClick={recontinue} title="จัดเวลาให้ต่อเนื่องจากแถวแรก">
          <Clock className="size-4" /> จัดเวลาต่อเนื่อง
        </Button>
        <Button size="sm" variant="outline" onClick={addRow}>
          <Plus className="size-4" /> เพิ่มแถว
        </Button>
        <Button size="sm" onClick={onSave} loading={pending} disabled={!dirty} className="ml-auto">
          <Save className="size-4" /> บันทึก
        </Button>
      </div>

      <Reorder.Group axis="y" values={slots} onReorder={applyReorder} className="space-y-2">
        {slots.map((slot, i) => (
          <SlotRow
            key={slot.id}
            slot={slot}
            index={i}
            count={slots.length}
            onMove={move}
            onPatch={patch}
            onRemove={removeRow}
          />
        ))}
      </Reorder.Group>
    </div>
  );
}

function stripIds(slots: BellSlotData[]) {
  return slots.map(({ id: _id, order: _order, ...rest }) => rest);
}

/* ===================== One reorderable row ===================== */

function SlotRow({
  slot,
  index,
  count,
  onMove,
  onPatch,
  onRemove,
}: {
  slot: BellSlotData;
  index: number;
  count: number;
  onMove: (index: number, dir: -1 | 1) => void;
  onPatch: (id: string, fields: Partial<BellSlotData>) => void;
  onRemove: (id: string) => void;
}) {
  const controls = useDragControls();
  const isClass = isClassKind(slot.kind);

  return (
    <Reorder.Item
      value={slot}
      dragListener={false}
      dragControls={controls}
      className="rounded-lg border border-border bg-card"
    >
      <div className="flex flex-wrap items-center gap-2 p-2 sm:flex-nowrap">
        {/* Drag handle (desktop) */}
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="hidden cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing sm:block"
          aria-label="ลากเพื่อจัดลำดับ"
        >
          <GripVertical className="size-5" />
        </button>

        {/* Up/down (mobile-friendly) */}
        <div className="flex flex-col">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-6 w-7"
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
            aria-label="เลื่อนขึ้น"
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-6 w-7"
            disabled={index === count - 1}
            onClick={() => onMove(index, 1)}
            aria-label="เลื่อนลง"
          >
            <ArrowDown className="size-4" />
          </Button>
        </div>

        {/* Kind */}
        <select
          value={slot.kind}
          onChange={(e) => {
            const kind = e.target.value as SlotKind;
            onPatch(slot.id, {
              kind,
              periodNumber: kind === "CLASS" ? (slot.periodNumber ?? null) : null,
            });
          }}
          className={cn(
            "h-9 shrink-0 rounded-md px-2 text-xs font-medium",
            KIND_TONE[slot.kind],
          )}
        >
          {KIND_OPTIONS.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>

        {/* Label */}
        <Input
          value={slot.label}
          onChange={(e) => onPatch(slot.id, { label: e.target.value })}
          className="h-9 min-w-[7rem] flex-1"
          placeholder="ชื่อแถว"
        />

        {/* Period number (class only) */}
        {isClass ? (
          <Input
            type="number"
            min={1}
            value={slot.periodNumber ?? ""}
            onChange={(e) =>
              onPatch(slot.id, { periodNumber: e.target.value ? Number(e.target.value) : null })
            }
            className="h-9 w-16"
            placeholder="คาบ"
            aria-label="เลขคาบ"
          />
        ) : (
          <span className="w-16 shrink-0" />
        )}

        {/* Times */}
        <Input
          type="time"
          value={slot.startTime}
          onChange={(e) => onPatch(slot.id, { startTime: e.target.value })}
          className="h-9 w-[7.5rem]"
          aria-label="เวลาเริ่ม"
        />
        <span className="text-muted-foreground">–</span>
        <Input
          type="time"
          value={slot.endTime}
          onChange={(e) => onPatch(slot.id, { endTime: e.target.value })}
          className="h-9 w-[7.5rem]"
          aria-label="เวลาจบ"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(slot.id)}
          className="text-muted-foreground hover:text-destructive"
          aria-label="ลบแถว"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </Reorder.Item>
  );
}
