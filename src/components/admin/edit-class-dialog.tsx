"use client";

import { EntityFormDialog } from "@/components/admin/entity-form-dialog";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { updateClassAction } from "@/server/actions/admin.actions";
import type { ClassRow } from "@/components/admin/class-table";

export function EditClassDialog({ classData }: { classData: ClassRow }) {
  return (
    <EntityFormDialog
      title="แก้ไขข้อมูลห้องเรียน"
      description="อัปเดตชื่อห้อง ชั้น และข้อมูลอาคารได้ที่นี่"
      action={updateClassAction}
      trigger={
        <Button variant="ghost" size="icon-sm">
          <Pencil />
        </Button>
      }
      submitLabel="บันทึก"
    >
      {({ fieldErrors }) => (
        <>
          <input type="hidden" name="id" value={classData.id} />
          <FormField name="className" label="ชื่อห้อง" required defaultValue={classData.className} error={fieldErrors?.className} />
          <FormField name="gradeLevel" label="ระดับชั้น" required defaultValue={classData.gradeLevel} error={fieldErrors?.gradeLevel} />
          <FormField name="room" label="ห้อง/อาคาร" defaultValue={classData.room ?? ""} error={fieldErrors?.room} />
        </>
      )}
    </EntityFormDialog>
  );
}
