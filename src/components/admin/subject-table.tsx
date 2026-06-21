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
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteSubjectAction, deleteSubjectsAction } from "@/server/actions/admin.actions";
import { EditSubjectDialog } from "@/components/admin/edit-subject-dialog";

export type SubjectRow = {
  id: string;
  subjectName: string;
  subjectCode: string;
  colorHex: string | null;
  schedulesCount: number;
};

export function SubjectTable({ subjects }: { subjects: SubjectRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = subjects.length > 0 && selected.size === subjects.length;
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
    setSelected(allSelected ? new Set() : new Set(subjects.map((s) => s.id)));
  }

  function bulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(`ลบวิชาที่เลือก ${ids.length} รายการ?`)) return;
    startTransition(async () => {
      const res = await deleteSubjectsAction(ids);
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
              <TableHead className="w-12">สีกำกับ</TableHead>
              <TableHead>ชื่อวิชา</TableHead>
              <TableHead>รหัส</TableHead>
              <TableHead className="text-center">คาบสอน</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((subject) => (
              <TableRow key={subject.id} data-state={selected.has(subject.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(subject.id)}
                    onCheckedChange={() => toggle(subject.id)}
                    aria-label={`เลือก ${subject.subjectName}`}
                  />
                </TableCell>
                <TableCell>
                  <span
                    className="block size-5 rounded-full border border-border"
                    style={{ backgroundColor: subject.colorHex ?? "var(--color-primary)" }}
                  />
                </TableCell>
                <TableCell className="font-medium text-foreground">{subject.subjectName}</TableCell>
                <TableCell className="font-mono text-xs">{subject.subjectCode}</TableCell>
                <TableCell className="text-center">{subject.schedulesCount}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <EditSubjectDialog subject={subject} />
                    <DeleteButton
                      id={subject.id}
                      action={deleteSubjectAction}
                      confirmText={`ลบวิชา ${subject.subjectName}?`}
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
