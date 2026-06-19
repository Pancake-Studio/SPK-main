"use client";

import { EntityFormDialog } from "../entity-form-dialog";
import { FormField } from "../form-field";
import { SelectField, type Option } from "../select-field";
import { createScheduleAction } from "@/server/actions/admin.actions";
import { DAYS, PERIODS } from "@/lib/constants";

const dayOptions: Option[] = DAYS.map((d) => ({ value: d.key, label: `${d.labelTh} (${d.label})` }));
const periodOptions: Option[] = PERIODS.map((p) => ({
  value: String(p.period),
  label: `คาบ ${p.period} · ${p.start}–${p.end}`,
}));

export function AddScheduleDialog({
  classes,
  subjects,
  teachers,
}: {
  classes: Option[];
  subjects: Option[];
  teachers: Option[];
}) {
  return (
    <EntityFormDialog title="เพิ่มคาบสอน" triggerLabel="เพิ่มคาบสอน" action={createScheduleAction}>
      {({ fieldErrors }) => (
        <>
          <SelectField name="classId" label="ห้องเรียน" options={classes} required error={fieldErrors?.classId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField name="subjectId" label="วิชา" options={subjects} required error={fieldErrors?.subjectId} />
            <SelectField name="teacherId" label="ครูผู้สอน" options={teachers} required error={fieldErrors?.teacherId} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField name="day" label="วัน" options={dayOptions} required error={fieldErrors?.day} />
            <SelectField name="period" label="คาบ" options={periodOptions} required error={fieldErrors?.period} />
          </div>
          <FormField name="room" label="ห้อง/อาคาร (ไม่บังคับ)" error={fieldErrors?.room} />
        </>
      )}
    </EntityFormDialog>
  );
}
