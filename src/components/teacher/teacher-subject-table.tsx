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
import { deleteOwnSubjectAction } from "@/server/actions/teacher-self.actions";
import { EditOwnSubjectDialog, type OwnSubjectRow } from "@/components/teacher/own-subject-dialogs";
import { matchesQuery } from "@/lib/utils";

export function TeacherSubjectTable({ subjects }: { subjects: OwnSubjectRow[] }) {
  const [q, setQ] = React.useState("");
  const shown = subjects.filter((s) => matchesQuery([s.subjectName, s.subjectCode], q));

  return (
    <div className="space-y-3">
      <SearchBox value={q} onChange={setQ} placeholder="ค้นหาวิชา (ชื่อ/รหัส)" />
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">สี</TableHead>
              <TableHead>ชื่อวิชา</TableHead>
              <TableHead>รหัส</TableHead>
              <TableHead className="text-center">คาบสอน</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <span
                    className="block size-5 rounded-full border border-border"
                    style={{ backgroundColor: s.colorHex ?? "var(--color-primary)" }}
                  />
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {s.subjectName}
                  {s.hideTeacher && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                      ซ่อนชื่อครู
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{s.subjectCode}</TableCell>
                <TableCell className="text-center">{s.schedulesCount}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <EditOwnSubjectDialog subject={s} />
                    <DeleteButton id={s.id} action={deleteOwnSubjectAction} confirmText={`ลบวิชา ${s.subjectName}?`} />
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
