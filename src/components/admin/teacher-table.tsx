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
import { deleteTeacherAction, deleteTeachersAction } from "@/server/actions/admin.actions";
import { EditTeacherDialog } from "@/components/admin/edit-teacher-dialog";

export type TeacherRow = {
  id: string;
  teacherCode: string;
  name: string;
  email: string;
  department: string | null;
  title: string | null;
  phone: string | null;
  schedulesCount: number;
};

export function TeacherTable({ teachers }: { teachers: TeacherRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = teachers.length > 0 && selected.size === teachers.length;
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
    setSelected(allSelected ? new Set() : new Set(teachers.map((t) => t.id)));
  }

  function bulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(`ลบครูที่เลือก ${ids.length} รายการ?`)) return;
    startTransition(async () => {
      const res = await deleteTeachersAction(ids);
      if (res?.ok) {
        toast.success(`ลบไปแล้ว ${res.count ?? ids.length} รายการ`);
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
              <TableHead>รหัส</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>อีเมล</TableHead>
              <TableHead>กลุ่มสาระ</TableHead>
              <TableHead className="text-center">คาบสอน</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((teacher) => (
              <TableRow key={teacher.id} data-state={selected.has(teacher.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(teacher.id)}
                    onCheckedChange={() => toggle(teacher.id)}
                    aria-label={`เลือก ${teacher.name}`}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">{teacher.teacherCode}</TableCell>
                <TableCell className="font-medium text-foreground">
                  {teacher.title ? `${teacher.title} ` : ""}
                  {teacher.name}
                </TableCell>
                <TableCell className="text-muted-foreground">{teacher.email}</TableCell>
                <TableCell>
                  {teacher.department ? <Badge variant="secondary">{teacher.department}</Badge> : "-"}
                </TableCell>
                <TableCell className="text-center">{teacher.schedulesCount}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <EditTeacherDialog teacher={teacher} />
                    <DeleteButton
                      id={teacher.id}
                      action={deleteTeacherAction}
                      confirmText={`ลบครู ${teacher.name}? บัญชีและคาบสอนที่เกี่ยวข้องจะถูกลบ`}
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
