"use client";

import { EntityFormDialog } from "../entity-form-dialog";
import { FormField } from "../form-field";
import { SelectField, type Option } from "../select-field";
import { createStudentAction } from "@/server/actions/admin.actions";

export function AddStudentDialog({ classes }: { classes: Option[] }) {
  return (
    <EntityFormDialog
      title="เพิ่มนักเรียน"
      description="บัญชีจะถูกสร้างพร้อมรหัสผ่านเริ่มต้น (หากไม่กำหนด คือ password123)"
      triggerLabel="เพิ่มนักเรียน"
      action={createStudentAction}
    >
      {({ fieldErrors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <FormField name="title" label="คำนำหน้า" placeholder="เด็กชาย / นางสาว" error={fieldErrors?.title} />
            <FormField name="name" label="ชื่อ-นามสกุล" required error={fieldErrors?.name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="email" label="อีเมล" type="email" required error={fieldErrors?.email} />
            <FormField name="studentCode" label="รหัสนักเรียน" required error={fieldErrors?.studentCode} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField name="classId" label="ห้องเรียน" options={classes} required error={fieldErrors?.classId} />
            <FormField
              name="rollNumber"
              label="เลขที่"
              type="number"
              placeholder="เช่น 1"
              error={fieldErrors?.rollNumber}
            />
          </div>
          <FormField name="password" label="รหัสผ่าน (ไม่บังคับ)" type="password" error={fieldErrors?.password} />
        </>
      )}
    </EntityFormDialog>
  );
}
