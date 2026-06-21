"use client";

import * as React from "react";
import { EntityFormDialog } from "@/components/admin/entity-form-dialog";
import { FormField } from "@/components/admin/form-field";
import { SelectField, type Option } from "@/components/admin/select-field";
import { Button } from "@/components/ui/button";
import { DAYS, PERIODS } from "@/lib/constants";
import { Pencil } from "lucide-react";
import { updateScheduleAction } from "@/server/actions/admin.actions";
import type { ScheduleRow } from "@/components/admin/schedules-table";

const dayOptions: Option[] = DAYS.map((d) => ({
  value: d.key,
  label: `${d.labelTh} (${d.label})`,
}));

export function EditScheduleDialog({
  schedule,
  classes,
  subjects,
  teachers,
  occupied,
}: {
  schedule: ScheduleRow;
  classes: Option[];
  subjects: Option[];
  teachers: Option[];
  occupied?: Record<string, number[]>;
}) {
  const [classId, setClassId] = React.useState(schedule.classId);
  const [day, setDay] = React.useState(schedule.day);
  const [period, setPeriod] = React.useState(String(schedule.period));

  const taken = new Set(
    classId && day
      ? (occupied?.[`${classId}__${day}`] ?? []).filter(
          (p) => !(classId === schedule.classId && day === schedule.day && p === schedule.period),
        )
      : [],
  );
  const periodOptions: Option[] = PERIODS.map((p) => ({
    value: String(p.period),
    label: `คาบ ${p.period} · ${p.start}–${p.end}${taken.has(p.period) ? " · ไม่ว่าง" : ""}`,
    disabled: taken.has(p.period),
  }));

  return (
    <EntityFormDialog
      title="แก้ไขคาบสอน"
      description="อัปเดตข้อมูลคาบสอนได้ที่นี่"
      action={updateScheduleAction}
      trigger={
        <Button variant="ghost" size="icon-sm">
          <Pencil />
        </Button>
      }
      submitLabel="บันทึก"
    >
      {({ fieldErrors }) => (
        <>
          <input type="hidden" name="id" value={schedule.id} />
          <SelectField
            name="classId"
            label="ห้องเรียน"
            options={classes}
            required
            value={classId}
            onValueChange={setClassId}
            error={fieldErrors?.classId}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              name="subjectId"
              label="วิชา"
              options={subjects}
              required
              defaultValue={schedule.subjectId}
              error={fieldErrors?.subjectId}
            />
            <SelectField
              name="teacherId"
              label="ครูผู้สอน"
              options={teachers}
              required
              defaultValue={schedule.teacherId}
              error={fieldErrors?.teacherId}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              name="day"
              label="วัน"
              options={dayOptions}
              required
              value={day}
              onValueChange={setDay}
              error={fieldErrors?.day}
            />
            <SelectField
              name="period"
              label="คาบ"
              options={periodOptions}
              required
              value={period}
              onValueChange={setPeriod}
              error={fieldErrors?.period}
            />
          </div>
          <FormField name="room" label="ห้อง/อาคาร" defaultValue={schedule.room ?? ""} error={fieldErrors?.room} />
        </>
      )}
    </EntityFormDialog>
  );
}
