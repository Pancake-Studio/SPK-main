"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditScheduleDialog } from "@/components/admin/edit-schedule-dialog";

export type ScheduleRow = {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  className: string;
  day: string;
  dayLabel: string;
  period: number;
  subjectName: string;
  colorHex: string | null;
  teacherName: string;
  room: string | null;
};

/** Admin schedule table with multi-select checkboxes + bulk delete. */
export function SchedulesTable({
  rows,
  classes,
  subjects,
  teachers,
  occupied,
  deleteOne,
  deleteMany,
}: {
  rows: ScheduleRow[];
  classes: { value: string; label: string }[];
  subjects: { value: string; label: string }[];
  teachers: { value: string; label: string }[];
  occupied?: Record<string, number[]>;
  deleteOne: (id: string) => Promise<{ ok: boolean; error?: string }>;
  deleteMany: (ids: string[]) => Promise<{ ok: boolean; count?: number }>;
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function bulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(`ลบคาบสอนที่เลือก ${ids.length} รายการ?`)) return;
    startTransition(async () => {
      const res = await deleteMany(ids);
      if (res?.ok) {
        toast.success(`ลบแล้ว ${res.count ?? ids.length} รายการ`);
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error("ลบไม่สำเร็จ");
      }
    });
  }

  function deleteRow(id: string) {
    if (!window.confirm("ลบคาบสอนนี้?")) return;
    startTransition(async () => {
      const res = await deleteOne(id);
      if (res?.ok) {
        toast.success("ลบเรียบร้อยแล้ว");
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        router.refresh();
      } else {
        toast.error(res?.error ?? "ลบไม่สำเร็จ");
      }
    });
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-secondary/40 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">
            เลือกแล้ว {selected.size} รายการ
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
              disabled={pending}
            >
              ยกเลิกการเลือก
            </Button>
            <Button variant="destructive" size="sm" onClick={bulkDelete} loading={pending}>
              <Trash2 />
              ลบที่เลือก ({selected.size})
            </Button>
          </div>
        </div>
      )}

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  aria-label="เลือกทั้งหมด"
                />
              </TableHead>
              <TableHead>ห้อง</TableHead>
              <TableHead>วัน</TableHead>
              <TableHead className="text-center">คาบ</TableHead>
              <TableHead>วิชา</TableHead>
              <TableHead>ครู</TableHead>
              <TableHead>ห้อง/อาคาร</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} data-state={selected.has(r.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={() => toggle(r.id)}
                    aria-label={`เลือก ${r.subjectName}`}
                  />
                </TableCell>
                <TableCell className="font-medium text-foreground">{r.className}</TableCell>
                <TableCell>{r.dayLabel}</TableCell>
                <TableCell className="text-center">{r.period}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: r.colorHex ?? "var(--color-primary)" }}
                    />
                    {r.subjectName}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.teacherName}</TableCell>
                <TableCell className="text-muted-foreground">{r.room ?? "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <EditScheduleDialog
                      schedule={r}
                      classes={classes}
                      subjects={subjects}
                      teachers={teachers}
                      occupied={occupied}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="ลบ"
                      onClick={() => deleteRow(r.id)}
                      disabled={pending}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
