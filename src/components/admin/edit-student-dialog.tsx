"use client";

import { EntityFormDialog } from "@/components/admin/entity-form-dialog";
import { FormField } from "@/components/admin/form-field";
import { SelectField, type Option } from "@/components/admin/select-field";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { updateStudentAction } from "@/server/actions/admin.actions";
import type { StudentRow } from "@/components/admin/student-table";

export function EditStudentDialog({ student, classes }: { student: StudentRow; classes: Option[] }) {
  return (
    <EntityFormDialog
      title="แก้ไขข้อมูลนักเรียน"
      description="อัปเดตข้อมูลนักเรียนหรือรหัสผ่านได้ที่นี่"
      action={updateStudentAction}
      trigger={
        <Button variant="ghost" size="icon-sm">
          <Pencil />
        </Button>
      }
      submitLabel="บันทึก"
    >
      {({ fieldErrors }) => (
        <>
          <input type="hidden" name="id" value={student.id} />
          <FormField name="name" label="ชื่อ-นามสกุล" required defaultValue={student.name} error={fieldErrors?.name} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="email"
              label="อีเมล"
              type="email"
              required
              defaultValue={student.email}
              error={fieldErrors?.email}
            />
            <FormField
              name="studentCode"
              label="รหัสนักเรียน"
              required
              defaultValue={student.studentCode}
              error={fieldErrors?.studentCode}
            />
          </div>
          <SelectField
            name="classId"
            label="ห้องเรียน"
            options={classes}
            required
            defaultValue={student.classId}
            error={fieldErrors?.classId}
          />
          <FormField name="password" label="รหัสผ่าน (เว้นว่างเพื่อเก็บเหมือนเดิม)" type="password" error={fieldErrors?.password} />
        </>
      )}
    </EntityFormDialog>
  );
}
