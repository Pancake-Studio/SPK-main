"use client";

import { EntityFormDialog } from "@/components/admin/entity-form-dialog";
import { FormField } from "@/components/admin/form-field";
import { SelectField, type Option } from "@/components/admin/select-field";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import {
  createAdvisoryStudentAction,
  updateAdvisoryStudentAction,
} from "@/server/actions/teacher-self.actions";

export type AdvisoryStudentRow = {
  id: string;
  title: string | null;
  name: string;
  email: string;
  studentCode: string;
  rollNumber: number | null;
  classId: string;
  className: string;
};

/** Room picker: a select when the advisor has several sub-rooms, else a hidden
 *  field pinned to the single room. */
function RoomField({ rooms, defaultValue, error }: { rooms: Option[]; defaultValue?: string; error?: string }) {
  if (rooms.length <= 1) {
    return <input type="hidden" name="classId" value={defaultValue ?? rooms[0]?.value ?? ""} />;
  }
  return (
    <SelectField
      name="classId"
      label="ห้อง"
      options={rooms}
      required
      defaultValue={defaultValue ?? ""}
      placeholder="เลือกห้อง"
      error={error}
      hint="เลือกห้องย่อยที่นักเรียนสังกัด"
    />
  );
}

export function AddAdvisoryStudentDialog({ className, rooms }: { className: string; rooms: Option[] }) {
  return (
    <EntityFormDialog
      title="เพิ่มนักเรียน"
      description={`เพิ่มนักเรียนเข้าห้อง ${className} (ห้องที่คุณเป็นที่ปรึกษา)`}
      triggerLabel="เพิ่มนักเรียน"
      action={createAdvisoryStudentAction}
    >
      {({ fieldErrors }) => (
        <>
          <RoomField rooms={rooms} error={fieldErrors?.classId} />
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <FormField name="title" label="คำนำหน้า" placeholder="เด็กชาย / นางสาว" error={fieldErrors?.title} />
            <FormField name="name" label="ชื่อ-นามสกุล" required error={fieldErrors?.name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="email" label="อีเมล" type="email" required error={fieldErrors?.email} />
            <FormField name="studentCode" label="รหัสนักเรียน" required error={fieldErrors?.studentCode} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="rollNumber" label="เลขที่" type="number" placeholder="เช่น 1" error={fieldErrors?.rollNumber} />
            <FormField name="password" label="รหัสผ่าน (ไม่บังคับ)" type="password" error={fieldErrors?.password} />
          </div>
        </>
      )}
    </EntityFormDialog>
  );
}

export function EditAdvisoryStudentDialog({ student, rooms }: { student: AdvisoryStudentRow; rooms: Option[] }) {
  return (
    <EntityFormDialog
      title="แก้ไขข้อมูลนักเรียน"
      action={updateAdvisoryStudentAction}
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
          <RoomField rooms={rooms} defaultValue={student.classId} error={fieldErrors?.classId} />
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <FormField name="title" label="คำนำหน้า" defaultValue={student.title ?? ""} error={fieldErrors?.title} />
            <FormField name="name" label="ชื่อ-นามสกุล" required defaultValue={student.name} error={fieldErrors?.name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="email" label="อีเมล" type="email" required defaultValue={student.email} error={fieldErrors?.email} />
            <FormField name="studentCode" label="รหัสนักเรียน" required defaultValue={student.studentCode} error={fieldErrors?.studentCode} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="rollNumber"
              label="เลขที่"
              type="number"
              defaultValue={student.rollNumber != null ? String(student.rollNumber) : ""}
              error={fieldErrors?.rollNumber}
            />
            <FormField name="password" label="รหัสผ่าน (เว้นว่างเพื่อเก็บเหมือนเดิม)" type="password" error={fieldErrors?.password} />
          </div>
        </>
      )}
    </EntityFormDialog>
  );
}
