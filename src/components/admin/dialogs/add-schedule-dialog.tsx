"use client";

import * as React from "react";
import { EntityFormDialog } from "../entity-form-dialog";
import { FormField } from "../form-field";
import { SelectField, type Option } from "../select-field";
import { createScheduleAction } from "@/server/actions/admin.actions";
import { DAYS } from "@/lib/constants";
import { DEFAULT_BELL_SLOTS, classSlots, type BellSlotData } from "@/lib/bell-schedule";

const dayOptions: Option[] = DAYS.map((d) => ({ value: d.key, label: `${d.labelTh} (${d.label})` }));

export function AddScheduleDialog({
  classes,
  subjects,
  teachers,
  occupied,
  bellSlots = DEFAULT_BELL_SLOTS,
}: {
  classes: Option[];
  subjects: Option[];
  teachers: Option[];
  /** Map of `${classId}__${day}` → periods already used by that class. */
  occupied: Record<string, number[]>;
  bellSlots?: BellSlotData[];
}) {
  const [classId, setClassId] = React.useState("");
  const [day, setDay] = React.useState("");

  // A class can have only one lesson per (day, period) — disable taken periods.
  const taken = new Set(classId && day ? occupied[`${classId}__${day}`] ?? [] : []);
  const periodOptions: Option[] = classSlots(bellSlots).map((p) => ({
    value: String(p.periodNumber),
    label: `${p.label} · ${p.startTime}–${p.endTime}${taken.has(p.periodNumber!) ? " · ไม่ว่าง" : ""}`,
    disabled: taken.has(p.periodNumber!),
  }));
  const className = classes.find((c) => c.value === classId)?.label;

  return (
    <EntityFormDialog title="เพิ่มคาบสอน" triggerLabel="เพิ่มคาบสอน" action={createScheduleAction}>
      {({ fieldErrors }) => (
        <>
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
            <SelectField name="subjectId" label="วิชา" options={subjects} required error={fieldErrors?.subjectId} />
            <SelectField name="teacherId" label="ครูผู้สอน" options={teachers} required error={fieldErrors?.teacherId} />
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
              disabled={!classId || !day}
              hint={
                !classId || !day
                  ? "เลือกห้องและวันก่อน"
                  : className
                    ? `คาบที่ "ไม่ว่าง" คือคาบที่ห้อง ${className} ถูกใช้ไปแล้ว`
                    : undefined
              }
              error={fieldErrors?.period}
            />
          </div>
          <FormField name="room" label="ห้อง/อาคาร (ไม่บังคับ)" error={fieldErrors?.room} />
        </>
      )}
    </EntityFormDialog>
  );
}
