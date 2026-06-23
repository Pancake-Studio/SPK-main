"use client";

import { EntityFormDialog } from "../entity-form-dialog";
import { FormField } from "../form-field";
import { createAdminAction } from "@/server/actions/admin-user.actions";

export function AddAdminDialog() {
  return (
    <EntityFormDialog title="เพิ่มผู้ดูแลระบบ" triggerLabel="เพิ่มผู้ดูแลระบบ" action={createAdminAction}>
      {({ fieldErrors }) => (
        <>
          <FormField name="name" label="ชื่อ-นามสกุล" required error={fieldErrors?.name} />
          <FormField name="email" label="อีเมล" type="email" required error={fieldErrors?.email} />
          <FormField
            name="password"
            label="รหัสผ่าน (เว้นว่างจะใช้ค่าเริ่มต้น password123)"
            type="password"
            error={fieldErrors?.password}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
