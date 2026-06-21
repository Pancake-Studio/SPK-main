"use client";

import { EntityFormDialog } from "@/components/admin/entity-form-dialog";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { updateTeacherAction } from "@/server/actions/admin.actions";
import type { TeacherRow } from "@/components/admin/teacher-table";

export function EditTeacherDialog({ teacher }: { teacher: TeacherRow }) {
  return (
    <EntityFormDialog
      title="แก้ไขข้อมูลครู"
      description="อัปเดตข้อมูลครูหรือรหัสผ่านได้ที่นี่"
      action={updateTeacherAction}
      trigger={
        <Button variant="ghost" size="icon-sm">
          <Pencil />
        </Button>
      }
      submitLabel="บันทึก"
    >
      {({ fieldErrors }) => (
        <>
          <input type="hidden" name="id" value={teacher.id} />
          <FormField
            name="name"
            label="ชื่อ-นามสกุล"
            required
            defaultValue={teacher.name}
            error={fieldErrors?.name}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="email"
              label="อีเมล"
              type="email"
              required
              defaultValue={teacher.email}
              error={fieldErrors?.email}
            />
            <FormField
              name="teacherCode"
              label="รหัสครู"
              required
              defaultValue={teacher.teacherCode}
              error={fieldErrors?.teacherCode}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="title"
              label="คำนำหน้า"
              defaultValue={teacher.title ?? ""}
              error={fieldErrors?.title}
            />
            <FormField
              name="department"
              label="กลุ่มสาระ/แผนก"
              defaultValue={teacher.department ?? ""}
              error={fieldErrors?.department}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="phone"
              label="เบอร์โทร"
              defaultValue={teacher.phone ?? ""}
              error={fieldErrors?.phone}
            />
            <FormField
              name="password"
              label="รหัสผ่าน (เว้นว่างเพื่อเก็บเหมือนเดิม)"
              type="password"
              error={fieldErrors?.password}
            />
          </div>
        </>
      )}
    </EntityFormDialog>
  );
}
