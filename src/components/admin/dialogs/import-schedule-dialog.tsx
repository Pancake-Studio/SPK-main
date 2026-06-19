"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { importSchedulesAction } from "@/server/actions/admin.actions";
import { initialActionState } from "@/server/actions/_helpers";

type Row = Record<string, string>;

export function ImportScheduleDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [fileName, setFileName] = React.useState("");
  const [parseError, setParseError] = React.useState("");
  const [state, formAction, pending] = useActionState(
    importSchedulesAction,
    initialActionState,
  );

  React.useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "นำเข้าเรียบร้อยแล้ว");
      setOpen(false);
      setRows([]);
      setFileName("");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    try {
      let parsed: Row[] = [];
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        const res = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
        parsed = res.data;
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf);
        const sheet = wb.Sheets[wb.SheetNames[0]!]!;
        parsed = XLSX.utils.sheet_to_json<Row>(sheet);
      }
      setRows(parsed);
      if (parsed.length === 0) setParseError("ไม่พบข้อมูลในไฟล์");
    } catch {
      setParseError("ไม่สามารถอ่านไฟล์ได้");
      setRows([]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Upload />
          นำเข้า CSV/Excel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>นำเข้าตารางสอนจากไฟล์</DialogTitle>
          <DialogDescription>
            รองรับ .csv และ .xlsx — คอลัมน์ที่ต้องมี: <code>class</code>,{" "}
            <code>subjectCode</code>, <code>teacherCode</code>, <code>day</code>{" "}
            (MON–FRI), <code>period</code>, <code>room</code> (ไม่บังคับ)
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="rows" value={JSON.stringify(rows)} />

          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-8 text-center hover:bg-muted/40">
            <FileSpreadsheet className="size-8 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {fileName || "คลิกเพื่อเลือกไฟล์"}
            </span>
            <span className="text-xs text-muted-foreground">.csv หรือ .xlsx</span>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFile} />
          </label>

          {parseError && <p className="text-sm text-destructive">{parseError}</p>}
          {rows.length > 0 && (
            <p className="text-sm text-muted-foreground">
              พบ <span className="font-medium text-foreground">{rows.length}</span> แถวพร้อมนำเข้า
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                ยกเลิก
              </Button>
            </DialogClose>
            <Button type="submit" loading={pending} disabled={rows.length === 0}>
              นำเข้า {rows.length > 0 ? `(${rows.length})` : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
