"use client";

import { EntityFormDialog } from "@/components/admin/entity-form-dialog";
import { FormField } from "@/components/admin/form-field";
import { CheckboxField } from "@/components/admin/checkbox-field";
import { ReadOnlyField } from "@/components/admin/readonly-field";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { updateSubjectAction } from "@/server/actions/admin.actions";
import type { SubjectRow } from "@/components/admin/subject-table";

export function EditSubjectDialog({ subject }: { subject: SubjectRow }) {
  return (
    <EntityFormDialog
      title="แก้ไขข้อมูลวิชา"
      description="อัปเดตชื่อวิชา รหัส หรือสีประจำวิชาได้ที่นี่"
      action={updateSubjectAction}
      trigger={
        <Button variant="ghost" size="icon-sm">
          <Pencil />
        </Button>
      }
      submitLabel="บันทึก"
    >
      {({ fieldErrors }) => (
        <>
          <input type="hidden" name="id" value={subject.id} />
          <FormField name="subjectName" label="ชื่อวิชา" required defaultValue={subject.subjectName} error={fieldErrors?.subjectName} />
          <ReadOnlyField name="subjectCode" label="รหัสวิชา" value={subject.subjectCode} />
          <FormField name="colorHex" label="สีประจำวิชา (HEX)" placeholder="#7C3AED" defaultValue={subject.colorHex ?? ""} error={fieldErrors?.colorHex} />
          <CheckboxField
            name="hideTeacherForStudents"
            label="วิชาที่ครูสอนหลายคน"
            hint="ซ่อนชื่อครูผู้สอนจากตารางเรียนของนักเรียน"
            defaultChecked={subject.hideTeacher}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
