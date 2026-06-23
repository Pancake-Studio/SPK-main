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
import { deleteOwnScheduleAction } from "@/server/actions/teacher-self.actions";
import { EditOwnScheduleDialog } from "@/components/teacher/own-schedule-dialogs";
import type { Option } from "@/components/admin/select-field";
import { dayMeta } from "@/lib/timetable";
import { matchesQuery } from "@/lib/utils";

export type OwnScheduleTableRow = {
  id: string;
  classId: string;
  subjectId: string;
  day: string;
  period: number;
  room: string | null;
  className: string;
  subjectName: string;
  subjectCode: string;
};

export function OwnScheduleTable({
  rows,
  classes,
  subjects,
}: {
  rows: OwnScheduleTableRow[];
  classes: Option[];
  subjects: Option[];
}) {
  const [q, setQ] = React.useState("");
  const shown = rows.filter((r) =>
    matchesQuery([dayMeta(r.day)?.labelTh, r.period, r.className, r.subjectName, r.subjectCode, r.room], q),
  );

  return (
    <div className="space-y-3">
      <SearchBox value={q} onChange={setQ} placeholder="ค้นหา (วัน/ห้อง/วิชา)" />
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>วัน</TableHead>
              <TableHead className="text-center">คาบ</TableHead>
              <TableHead>ห้องเรียน</TableHead>
              <TableHead>วิชา</TableHead>
              <TableHead>สถานที่</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-foreground">{dayMeta(r.day)?.labelTh ?? r.day}</TableCell>
                <TableCell className="text-center">{r.period}</TableCell>
                <TableCell>{r.className}</TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">{r.subjectCode}</span> {r.subjectName}
                </TableCell>
                <TableCell className="text-muted-foreground">{r.room ?? "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <EditOwnScheduleDialog row={r} classes={classes} subjects={subjects} />
                    <DeleteButton
                      id={r.id}
                      action={deleteOwnScheduleAction}
                      confirmText={`ลบคาบสอน ${dayMeta(r.day)?.labelTh ?? r.day} คาบ ${r.period}?`}
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
