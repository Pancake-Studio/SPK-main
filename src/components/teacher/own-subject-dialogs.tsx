"use client";

import { EntityFormDialog } from "@/components/admin/entity-form-dialog";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import {
  createOwnSubjectAction,
  updateOwnSubjectAction,
} from "@/server/actions/teacher-self.actions";

export type OwnSubjectRow = {
  id: string;
  subjectName: string;
  subjectCode: string;
  colorHex: string | null;
  schedulesCount: number;
};

function Fields({ subject, fieldErrors }: { subject?: OwnSubjectRow; fieldErrors?: Record<string, string> }) {
  return (
    <>
      <FormField name="subjectName" label="ชื่อวิชา" required defaultValue={subject?.subjectName} error={fieldErrors?.subjectName} />
      <FormField name="subjectCode" label="รหัสวิชา" required defaultValue={subject?.subjectCode} error={fieldErrors?.subjectCode} />
      <FormField name="colorHex" label="สีประจำวิชา (HEX)" placeholder="#7C3AED" defaultValue={subject?.colorHex ?? ""} error={fieldErrors?.colorHex} />
    </>
  );
}

export function AddOwnSubjectDialog() {
  return (
    <EntityFormDialog title="เพิ่มวิชาของฉัน" triggerLabel="เพิ่มวิชา" action={createOwnSubjectAction}>
      {({ fieldErrors }) => <Fields fieldErrors={fieldErrors} />}
    </EntityFormDialog>
  );
}

export function EditOwnSubjectDialog({ subject }: { subject: OwnSubjectRow }) {
  return (
    <EntityFormDialog
      title="แก้ไขวิชาของฉัน"
      action={updateOwnSubjectAction}
      trigger={
        <Button variant="ghost" size="icon-sm">
          <Pencil />
        </Button>
      }
    >
      {({ fieldErrors }) => (
        <>
          <input type="hidden" name="id" value={subject.id} />
          <Fields subject={subject} fieldErrors={fieldErrors} />
        </>
      )}
    </EntityFormDialog>
  );
}
