"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { DAYS } from "@/lib/constants";
import {
  weekStartOf,
  weekRangeLabel,
  dayLabelTh,
  type DaySwapData,
} from "@/lib/day-swap";
import { createDaySwapAction, deleteDaySwapAction } from "@/server/actions/day-swap.actions";

const dayOptions = DAYS.map((d) => ({ value: d.key, label: `${d.labelTh} (${d.short})` }));

export function DaySwapManager({
  swaps,
  todayIso,
}: {
  swaps: DaySwapData[];
  todayIso: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [weekDate, setWeekDate] = React.useState(todayIso);
  const [dayA, setDayA] = React.useState("MON");
  const [dayB, setDayB] = React.useState("TUE");
  const [note, setNote] = React.useState("");

  const weekStart = weekStartOf(weekDate);

  function onAdd() {
    if (dayA === dayB) {
      toast.error("ต้องเลือกคนละวัน");
      return;
    }
    startTransition(async () => {
      const res = await createDaySwapAction({ weekStart, dayA, dayB, note: note || undefined });
      if (res.ok) {
        toast.success(res.message ?? "สลับแล้ว");
        setNote("");
        router.refresh();
      } else {
        toast.error(res.error ?? "ไม่สำเร็จ");
      }
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const res = await deleteDaySwapAction(id);
      if (res.ok) {
        toast.success("ยกเลิกการสลับแล้ว");
        router.refresh();
      } else toast.error("ไม่สำเร็จ");
    });
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="size-5 text-primary" />
        <h2 className="font-semibold text-foreground">สลับคาบทั้งวัน (เฉพาะสัปดาห์)</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        สลับตารางทั้งวันของสองวันในสัปดาห์ที่เลือก เช่น สัปดาห์นี้เรียนตารางวันอังคารแทนวันจันทร์ — มีผลทุกห้องเรียน เฉพาะสัปดาห์นั้น แล้วกลับมาปกติเอง
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">สัปดาห์ (เลือกวันใดก็ได้ในสัปดาห์นั้น)</span>
          <Input
            type="date"
            value={weekDate}
            onChange={(e) => setWeekDate(e.target.value)}
            className="h-10 w-44"
          />
          <span className="block text-[11px] text-muted-foreground">สัปดาห์ {weekRangeLabel(weekStart)}</span>
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">สลับวัน</span>
          <select
            value={dayA}
            onChange={(e) => setDayA(e.target.value)}
            className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
          >
            {dayOptions.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </label>
        <span className="pb-2.5 text-muted-foreground">↔</span>
        <label className="space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">กับวัน</span>
          <select
            value={dayB}
            onChange={(e) => setDayB(e.target.value)}
            className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
          >
            {dayOptions.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 flex-1 min-w-[9rem]">
          <span className="block text-xs font-medium text-muted-foreground">หมายเหตุ (ไม่บังคับ)</span>
          <Input value={note} onChange={(e) => setNote(e.target.value)} className="h-10" placeholder="เช่น ชดเชยวันหยุด" />
        </label>
        <Button onClick={onAdd} loading={pending}>
          <Plus className="size-4" /> สลับ
        </Button>
      </div>

      {swaps.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {swaps.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  สัปดาห์ {weekRangeLabel(s.weekStart)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {dayLabelTh(s.dayA)} ↔ {dayLabelTh(s.dayB)}
                  {s.note ? ` · ${s.note}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete(s.id)}
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
