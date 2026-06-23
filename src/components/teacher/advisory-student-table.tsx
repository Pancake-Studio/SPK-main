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
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteAdvisoryStudentAction } from "@/server/actions/teacher-self.actions";
import {
  EditAdvisoryStudentDialog,
  type AdvisoryStudentRow,
} from "@/components/teacher/advisory-student-dialogs";
import { matchesQuery } from "@/lib/utils";

export function AdvisoryStudentTable({ students }: { students: AdvisoryStudentRow[] }) {
  const [q, setQ] = React.useState("");
  const shown = students.filter((s) =>
    matchesQuery([s.rollNumber, s.title, s.name, s.studentCode, s.email], q),
  );

  return (
    <div className="space-y-3">
      <SearchBox value={q} onChange={setQ} placeholder="ค้นหานักเรียน (ชื่อ/เลขที่/รหัส/อีเมล)" />
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell className="text-center">{s.rollNumber ?? "-"}</TableCell>
                <TableCell className="font-medium text-foreground">
                  {s.title ? `${s.title} ` : ""}
                  {s.name}
                </TableCell>
                <TableCell className="font-mono text-xs">{s.studentCode}</TableCell>
                <TableCell className="text-muted-foreground">{s.email}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <EditAdvisoryStudentDialog student={s} />
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
