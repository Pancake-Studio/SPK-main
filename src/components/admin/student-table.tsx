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
import { deleteStudentAction, deleteStudentsAction } from "@/server/actions/admin.actions";
import { EditStudentDialog } from "@/components/admin/edit-student-dialog";

export type StudentRow = {
  id: string;
  studentCode: string;
  title: string | null;
  rollNumber: number | null;
  name: string;
  email: string;
  className: string;
  classId: string;
};

function duplicateRollKeys(students: StudentRow[]): Set<string> {
  const counts = new Map<string, number>();
  for (const s of students) {
    if (s.rollNumber == null) continue;
    const key = `${s.classId}|${s.rollNumber}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const dupes = new Set<string>();
  for (const [key, count] of counts) {
    if (count > 1) dupes.add(key);
  }
  return dupes;
}

export function StudentTable({ students, classes }: { students: StudentRow[]; classes: { value: string; label: string }[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const duplicateKeys = React.useMemo(() => duplicateRollKeys(students), [students]);

  const allSelected = students.length > 0 && selected.size === students.length;
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
    setSelected(allSelected ? new Set() : new Set(students.map((s) => s.id)));
  }

  function bulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(`ลบนักเรียนที่เลือก ${ids.length} รายการ?`)) return;
    startTransition(async () => {
      const res = await deleteStudentsAction(ids);
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
              <TableHead className="w-16">เลขที่</TableHead>
              <TableHead>รหัส</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>อีเมล</TableHead>
              <TableHead>ห้องเรียน</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id} data-state={selected.has(student.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(student.id)}
                    onCheckedChange={() => toggle(student.id)}
                    aria-label={`เลือก ${student.name}`}
                  />
                </TableCell>
                <TableCell
                  className={`text-center font-semibold ${
                    student.rollNumber != null && duplicateKeys.has(`${student.classId}|${student.rollNumber}`)
                      ? "text-destructive"
                      : "text-foreground"
                  }`}
                >
                  {student.rollNumber ?? <span className="text-muted-foreground">–</span>}
                </TableCell>
                <TableCell className="font-mono text-xs">{student.studentCode}</TableCell>
                <TableCell className="font-medium text-foreground">
                  {student.title ? (
                    <span className="font-normal text-muted-foreground">{student.title} </span>
                  ) : null}
                  {student.name}
                </TableCell>
                <TableCell className="text-muted-foreground">{student.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{student.className}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <EditStudentDialog student={student} classes={classes} />
                    <DeleteButton
                      id={student.id}
                      action={deleteStudentAction}
                      confirmText={`ลบนักเรียน ${student.name}?`}
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
