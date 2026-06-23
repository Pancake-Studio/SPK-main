"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchBox } from "@/components/ui/search-box";
import type { Option } from "@/components/admin/select-field";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteAdvisoryStudentAction } from "@/server/actions/teacher-self.actions";
import {
  EditAdvisoryStudentDialog,
  type AdvisoryStudentRow,
} from "@/components/teacher/advisory-student-dialogs";
import { matchesQuery } from "@/lib/utils";

function duplicateRollKeys(students: AdvisoryStudentRow[]): Set<string> {
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

export function AdvisoryStudentTable({ students, rooms }: { students: AdvisoryStudentRow[]; rooms: Option[] }) {
  const [q, setQ] = React.useState("");
  const shown = students.filter((s) =>
    matchesQuery([s.rollNumber, s.title, s.name, s.studentCode, s.email, s.className], q),
  );
  const duplicateKeys = React.useMemo(() => duplicateRollKeys(students), [students]);
  // Show the room column only when the advisor manages more than one room.
  const multiRoom = rooms.length > 1;

  return (
    <div className="space-y-3">
      <SearchBox value={q} onChange={setQ} placeholder="ค้นหานักเรียน (ชื่อ/เลขที่/รหัส/อีเมล)" />
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {multiRoom && <TableHead className="w-24">ห้อง</TableHead>}
              <TableHead className="w-16 text-center">เลขที่</TableHead>
              <TableHead>ชื่อ-นามสกุล</TableHead>
              <TableHead>รหัส</TableHead>
              <TableHead>อีเมล</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((s) => (
              <TableRow key={s.id}>
                {multiRoom && <TableCell className="font-medium text-primary">{s.className}</TableCell>}
                <TableCell
                  className={`text-center font-semibold ${
                    s.rollNumber != null && duplicateKeys.has(`${s.classId}|${s.rollNumber}`)
                      ? "text-destructive"
                      : "text-foreground"
                  }`}
                >
                  {s.rollNumber ?? "-"}
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {s.title ? `${s.title} ` : ""}
                  {s.name}
                </TableCell>
                <TableCell className="font-mono text-xs">{s.studentCode}</TableCell>
                <TableCell className="text-muted-foreground">{s.email}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <EditAdvisoryStudentDialog student={s} rooms={rooms} />
                    <DeleteButton id={s.id} action={deleteAdvisoryStudentAction} confirmText={`ลบนักเรียน ${s.name}?`} />
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
