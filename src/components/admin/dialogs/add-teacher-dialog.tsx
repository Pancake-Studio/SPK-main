"use client";

import { EntityFormDialog } from "../entity-form-dialog";
import { FormField } from "../form-field";
import { SelectField, type Option } from "../select-field";
import { createTeacherAction } from "@/server/actions/admin.actions";

const NO_ADVISOR: Option = { value: "", label: "— ไม่เป็นครูที่ปรึกษา —" };

export function AddTeacherDialog({ classes }: { classes: Option[] }) {
  return (
    <EntityFormDialog
      title="เพิ่มครู"
      description="บัญชีจะถูกสร้างพร้อมรหัสผ่านเริ่มต้น (หากไม่กำหนด คือ password123)"
      triggerLabel="เพิ่มครู"
      action={createTeacherAction}
    >
      {({ fieldErrors }) => (
        <>
          <FormField name="name" label="ชื่อ-นามสกุล" required error={fieldErrors?.name} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="email" label="อีเมล" type="email" required error={fieldErrors?.email} />
            <FormField name="teacherCode" label="รหัสครู" required error={fieldErrors?.teacherCode} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="title" label="คำนำหน้า" placeholder="Mr. / Mrs." error={fieldErrors?.title} />
            <FormField name="department" label="กลุ่มสาระ/แผนก" error={fieldErrors?.department} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="phone" label="เบอร์โทร" error={fieldErrors?.phone} />
            <FormField name="password" label="รหัสผ่าน (ไม่บังคับ)" type="password" error={fieldErrors?.password} />
          </div>
          <SelectField
            name="advisorClassId"
            label="ครูที่ปรึกษาประจำห้อง"
            options={[NO_ADVISOR, ...classes]}
            defaultValue=""
            placeholder="— ไม่เป็นครูที่ปรึกษา —"
            error={fieldErrors?.advisorClassId}
            hint="ครูที่ปรึกษาแก้ไขข้อมูลนักเรียนเฉพาะห้องนี้ได้"
          />
        </>
      )}
    </EntityFormDialog>
  );
}
