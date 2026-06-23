"use client";

import { EntityFormDialog } from "@/components/admin/entity-form-dialog";
import { FormField } from "@/components/admin/form-field";
import { SelectField, type Option } from "@/components/admin/select-field";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { DAYS } from "@/lib/constants";
import {
  createOwnScheduleAction,
  updateOwnScheduleAction,
} from "@/server/actions/teacher-self.actions";

const DAY_OPTIONS: Option[] = DAYS.map((d) => ({ value: d.key, label: d.labelTh }));

export type OwnScheduleRow = {
  id: string;
  classId: string;
  subjectId: string;
  day: string;
  period: number;
  room: string | null;
};

function Fields({
  classes,
  subjects,
  row,
  fieldErrors,
}: {
  classes: Option[];
  subjects: Option[];
  row?: OwnScheduleRow;
  fieldErrors?: Record<string, string>;
}) {
  return (
    <>
      <SelectField name="classId" label="ห้องเรียน" options={classes} required defaultValue={row?.classId ?? ""} error={fieldErrors?.classId} />
      <SelectField name="subjectId" label="วิชา" options={subjects} required defaultValue={row?.subjectId ?? ""} error={fieldErrors?.subjectId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="day" label="วัน" options={DAY_OPTIONS} required defaultValue={row?.day ?? ""} error={fieldErrors?.day} />
        <FormField name="period" label="คาบที่" type="number" required defaultValue={row ? String(row.period) : ""} error={fieldErrors?.period} />
      </div>
      <FormField name="room" label="ห้อง/สถานที่ (ไม่บังคับ)" defaultValue={row?.room ?? ""} error={fieldErrors?.room} />
    </>
  );
}

export function AddOwnScheduleDialog({ classes, subjects }: { classes: Option[]; subjects: Option[] }) {
  return (
    <EntityFormDialog title="เพิ่มคาบสอนของฉัน" triggerLabel="เพิ่มคาบสอน" action={createOwnScheduleAction}>
      {({ fieldErrors }) => <Fields classes={classes} subjects={subjects} fieldErrors={fieldErrors} />}
    </EntityFormDialog>
  );
}

export function EditOwnScheduleDialog({
  row,
  classes,
  subjects,
}: {
  row: OwnScheduleRow;
  classes: Option[];
  subjects: Option[];
}) {
  return (
    <EntityFormDialog
      title="แก้ไขคาบสอนของฉัน"
      action={updateOwnScheduleAction}
      trigger={
        <Button variant="ghost" size="icon-sm">
          <Pencil />
        </Button>
      }
    >
      {({ fieldErrors }) => (
        <>
          <input type="hidden" name="id" value={row.id} />
          <Fields classes={classes} subjects={subjects} row={row} fieldErrors={fieldErrors} />
        </>
      )}
    </EntityFormDialog>
  );
}
