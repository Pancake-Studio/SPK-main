"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteClassAction, deleteClassesAction } from "@/server/actions/admin.actions";
import { EditClassDialog } from "@/components/admin/edit-class-dialog";

export type ClassRow = {
  id: string;
  className: string;
  gradeLevel: string;
  room: string | null;
  studentCount: number;
  scheduleCount: number;
};

export function ClassTable({ classes }: { classes: ClassRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = classes.length > 0 && selected.size === classes.length;
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
    setSelected(allSelected ? new Set() : new Set(classes.map((c) => c.id)));
  }

  function bulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(`ลบห้องเรียนที่เลือก ${ids.length} รายการ?`)) return;
    startTransition(async () => {
      const res = await deleteClassesAction(ids);
      if (res?.ok) {
        toast.success(`ลบแล้ว ${res.count ?? ids.length} รายการ`);
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error("ลบไม่สำเร็จ");
      }
    });
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-secondary/40 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">เลือกแล้ว {selected.size} รายการ</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} disabled={pending}>
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
              <TableHead>ระดับชั้น</TableHead>
              <TableHead>อาคาร/ห้อง</TableHead>
              <TableHead className="text-center">นักเรียน</TableHead>
              <TableHead className="text-center">คาบเรียน</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((cls) => (
              <TableRow key={cls.id} data-state={selected.has(cls.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(cls.id)}
                    onCheckedChange={() => toggle(cls.id)}
                    aria-label={`เลือก ${cls.className}`}
                  />
                </TableCell>
                <TableCell className="font-medium text-foreground">{cls.className}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{cls.gradeLevel}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{cls.room ?? "-"}</TableCell>
                <TableCell className="text-center">{cls.studentCount}</TableCell>
                <TableCell className="text-center">{cls.scheduleCount}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <EditClassDialog classData={cls} />
                    <DeleteButton
                      id={cls.id}
                      action={deleteClassAction}
                      confirmText={`ลบห้อง ${cls.className}?`}
                    />
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
