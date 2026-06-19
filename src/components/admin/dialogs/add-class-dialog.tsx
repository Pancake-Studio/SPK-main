"use client";

import { EntityFormDialog } from "../entity-form-dialog";
import { FormField } from "../form-field";
import { createClassAction } from "@/server/actions/admin.actions";

export function AddClassDialog() {
  return (
    <EntityFormDialog title="เพิ่มห้องเรียน" triggerLabel="เพิ่มห้องเรียน" action={createClassAction}>
      {({ fieldErrors }) => (
        <>
          <FormField name="className" label="ชื่อห้อง" placeholder="เช่น M.4/1" required error={fieldErrors?.className} />
          <FormField name="gradeLevel" label="ระดับชั้น" placeholder="เช่น M.4" required error={fieldErrors?.gradeLevel} />
          <FormField name="room" label="ห้อง/อาคาร" placeholder="เช่น Building A 401" error={fieldErrors?.room} />
        </>
      )}
    </EntityFormDialog>
  );
}
