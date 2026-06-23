"use client";

import { Pencil } from "lucide-react";
import { EntityFormDialog } from "@/components/admin/entity-form-dialog";
import { FormField } from "@/components/admin/form-field";
import { SelectField } from "@/components/admin/select-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteButton } from "@/components/admin/delete-button";
import { DAYS } from "@/lib/constants";
import {
  createActivityAction,
  updateActivityAction,
  deleteActivityAction,
} from "@/server/actions/activity.actions";

export type ActivityRow = {
  id: string;
  day: string;
  period: number;
  label: string;
  colorHex: string | null;
};

const dayOptions = DAYS.map((d) => ({ value: d.key, label: d.labelTh }));
const dayLabel = (key: string) => DAYS.find((d) => d.key === key)?.labelTh ?? key;

function Fields({ activity, fieldErrors }: { activity?: ActivityRow; fieldErrors?: Record<string, string> }) {
  return (
    <>
      <FormField name="label" label="ชื่อกิจกรรม" placeholder="เช่น คาบชุมนุม / คาบอบรมคุณธรรม" required defaultValue={activity?.label} error={fieldErrors?.label} />
      <SelectField name="day" label="วัน" options={dayOptions} required defaultValue={activity?.day ?? ""} error={fieldErrors?.day} />
      <FormField name="period" label="คาบที่" type="number" placeholder="เช่น 7" required defaultValue={activity ? String(activity.period) : ""} error={fieldErrors?.period} />
      <FormField name="colorHex" label="สีประจำกิจกรรม (HEX)" placeholder="#7C3AED" defaultValue={activity?.colorHex ?? ""} error={fieldErrors?.colorHex} />
    </>
  );
}

export function AddActivityDialog() {
  return (
    <EntityFormDialog title="เพิ่มคาบกิจกรรม" triggerLabel="เพิ่มคาบกิจกรรม" action={createActivityAction}>
      {({ fieldErrors }) => <Fields fieldErrors={fieldErrors} />}
    </EntityFormDialog>
  );
}

function EditActivityDialog({ activity }: { activity: ActivityRow }) {
  return (
    <EntityFormDialog
      title="แก้ไขคาบกิจกรรม"
      action={updateActivityAction}
      trigger={
        <Button variant="ghost" size="icon-sm">
          <Pencil />
        </Button>
      }
    >
      {({ fieldErrors }) => (
        <>
          <input type="hidden" name="id" value={activity.id} />
          <Fields activity={activity} fieldErrors={fieldErrors} />
        </>
      )}
    </EntityFormDialog>
  );
}

export function ActivityTable({ rows }: { rows: ActivityRow[] }) {
  return (
    <Card className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">สี</TableHead>
            <TableHead>กิจกรรม</TableHead>
            <TableHead>วัน</TableHead>
            <TableHead className="text-center">คาบ</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <span className="block size-5 rounded-full border border-border" style={{ backgroundColor: a.colorHex ?? "var(--color-primary)" }} />
              </TableCell>
              <TableCell className="font-medium text-foreground">{a.label}</TableCell>
              <TableCell>{dayLabel(a.day)}</TableCell>
              <TableCell className="text-center">{a.period}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <EditActivityDialog activity={a} />
                  <DeleteButton id={a.id} action={deleteActivityAction} confirmText={`ลบคาบกิจกรรม ${a.label}?`} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
