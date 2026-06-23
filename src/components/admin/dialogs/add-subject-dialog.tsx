"use client";

import { EntityFormDialog } from "../entity-form-dialog";
import { FormField } from "../form-field";
import { CheckboxField } from "../checkbox-field";
import { createSubjectAction } from "@/server/actions/admin.actions";

export function AddSubjectDialog() {
  return (
    <EntityFormDialog title="เพิ่มวิชา" triggerLabel="เพิ่มวิชา" action={createSubjectAction}>
      {({ fieldErrors }) => (
        <>
          <FormField name="subjectName" label="ชื่อวิชา" placeholder="เช่น Mathematics" required error={fieldErrors?.subjectName} />
          <FormField name="subjectCode" label="รหัสวิชา" placeholder="เช่น MATH" required error={fieldErrors?.subjectCode} />
          <FormField name="colorHex" label="สีประจำวิชา (HEX)" placeholder="#7C3AED" error={fieldErrors?.colorHex} />
          <CheckboxField
            name="hideTeacherForStudents"
            label="วิชาที่ครูสอนหลายคน"
            hint="ซ่อนชื่อครูผู้สอนจากตารางเรียนของนักเรียน"
          />
        </>
      )}
    </EntityFormDialog>
  );
}
