"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  upsertScheduleOverrideAction,
  deleteScheduleOverrideAction,
} from "@/server/actions/bell-schedule.actions";

type Override = {
  id: string;
  date: string;
  note: string | null;
  bellScheduleId: string;
  bellScheduleName: string;
};

function formatThaiDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

export function ScheduleOverrideManager({
  templates,
  overrides,
  todayIso,
}: {
  templates: { id: string; name: string }[];
  overrides: Override[];
  todayIso: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = React.useState(todayIso);
  const [bellScheduleId, setBellScheduleId] = React.useState(templates[0]?.id ?? "");
  const [note, setNote] = React.useState("");

  function onAdd() {
    if (!date || !bellScheduleId) {
      toast.error("เลือกวันที่และตาราง");
      return;
    }
    startTransition(async () => {
      const res = await upsertScheduleOverrideAction({ date, bellScheduleId, note: note || undefined });
      if (res.ok) {
        toast.success(res.message ?? "กำหนดแล้ว");
        setNote("");
        router.refresh();
      } else {
        toast.error(res.error ?? "ไม่สำเร็จ");
      }
    });
  }

  function onDelete(d: string) {
    startTransition(async () => {
      const res = await deleteScheduleOverrideAction(d);
      if (res.ok) {
        toast.success("ยกเลิกแล้ว");
        router.refresh();
      } else toast.error("ไม่สำเร็จ");
    });
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <CalendarClock className="size-5 text-primary" />
        <h2 className="font-semibold text-foreground">ปรับเวลาเฉพาะวัน (ชั่วคราว)</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        กำหนดให้วันใดวันหนึ่งใช้ตารางอื่นแทนตารางหลัก เช่น วันสอบหรือวันกิจกรรม — มีผลเฉพาะวันนั้น แล้วกลับมาใช้ตารางหลักอัตโนมัติ
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">วันที่</span>
          <Input
            type="date"
            value={date}
            min={todayIso}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 w-44"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">ใช้ตาราง</span>
          <select
            value={bellScheduleId}
            onChange={(e) => setBellScheduleId(e.target.value)}
            className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 flex-1 min-w-[10rem]">
          <span className="block text-xs font-medium text-muted-foreground">หมายเหตุ (ไม่บังคับ)</span>
          <Input value={note} onChange={(e) => setNote(e.target.value)} className="h-10" placeholder="เช่น สอบกลางภาค" />
        </label>
        <Button onClick={onAdd} loading={pending}>
          <Plus className="size-4" /> กำหนด
        </Button>
      </div>

      {overrides.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {overrides.map((o) => (
            <li key={o.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{formatThaiDate(o.date)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {o.bellScheduleName}
                  {o.note ? ` · ${o.note}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete(o.date)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="ยกเลิก"
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
