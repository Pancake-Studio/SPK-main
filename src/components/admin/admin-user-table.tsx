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
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/admin/delete-button";
import { EditAdminDialog } from "@/components/admin/edit-admin-dialog";
import { deleteAdminAction } from "@/server/actions/admin-user.actions";
import { SearchBox } from "@/components/ui/search-box";
import { matchesQuery } from "@/lib/utils";

export type AdminRow = {
  id: string;
  name: string;
  email: string;
  isYou: boolean;
};

export function AdminUserTable({ admins }: { admins: AdminRow[] }) {
  const [q, setQ] = React.useState("");
  const shown = admins.filter((a) => matchesQuery([a.name, a.email], q));
  return (
    <div className="space-y-3">
      <SearchBox value={q} onChange={setQ} placeholder="ค้นหาผู้ดูแลระบบ (ชื่อ/อีเมล)" />
      <Card className="p-0">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ชื่อ</TableHead>
            <TableHead>อีเมล</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium text-foreground">
                {a.name}
                {a.isYou && <Badge variant="muted" className="ml-2">คุณ</Badge>}
              </TableCell>
              <TableCell className="font-mono text-xs">{a.email}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <EditAdminDialog admin={a} />
                  {!a.isYou && (
                    <DeleteButton
                      id={a.id}
                      action={deleteAdminAction}
                      confirmText={`ลบผู้ดูแลระบบ ${a.name}?`}
                    />
                  )}
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
