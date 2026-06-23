"use client";

import { EntityFormDialog } from "@/components/admin/entity-form-dialog";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { updateAdminAction } from "@/server/actions/admin-user.actions";
import type { AdminRow } from "@/components/admin/admin-user-table";

export function EditAdminDialog({ admin }: { admin: AdminRow }) {
  return (
    <EntityFormDialog
      title="แก้ไขผู้ดูแลระบบ"
      description="อัปเดตชื่อ อีเมล หรือรหัสผ่านของผู้ดูแลระบบ"
      action={updateAdminAction}
      trigger={
        <Button variant="ghost" size="icon-sm">
          <Pencil />
        </Button>
      }
      submitLabel="บันทึก"
    >
      {({ fieldErrors }) => (
        <>
          <input type="hidden" name="id" value={admin.id} />
          <FormField name="name" label="ชื่อ-นามสกุล" required defaultValue={admin.name} error={fieldErrors?.name} />
          <FormField name="email" label="อีเมล" type="email" required defaultValue={admin.email} error={fieldErrors?.email} />
          <FormField
            name="password"
            label="รหัสผ่าน (เว้นว่างเพื่อเก็บเหมือนเดิม)"
            type="password"
            error={fieldErrors?.password}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
