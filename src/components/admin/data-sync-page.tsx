"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ENTITY_KEYS } from "@/lib/constants";
import type { ActionState } from "@/server/actions/_helpers";
import {
  exportTeachersAction,
  exportStudentsAction,
  exportClassesAction,
  exportSubjectsAction,
  exportSchedulesAction,
  syncTeachersAction,
  syncStudentsAction,
  syncClassesAction,
  syncSubjectsAction,
  syncSchedulesAction,
} from "@/server/actions/admin.actions";

type ExportResult =
  | { ok: true; base64: string; filename: string }
  | { ok: false; error: string };

type EntityConfig = {
  key: string;
  label: string;
  description: string;
  columns: string[];
  exportAction: () => Promise<ExportResult>;
  syncAction: (rows: unknown[]) => Promise<ActionState>;
};

const ENTITIES: EntityConfig[] = [
  {
    key: "teachers",
    label: "ครู",
    description: "ดาวน์โหลด/อัปโหลดข้อมูลครู",
    columns: ["teacherCode", "name", "email", "title", "department", "phone"],
    exportAction: exportTeachersAction,
    syncAction: syncTeachersAction,
  },
  {
    key: "students",
    label: "นักเรียน",
    description: "ดาวน์โหลด/อัปโหลดข้อมูลนักเรียน",
    columns: ["studentCode", "name", "email", "className"],
    exportAction: exportStudentsAction,
    syncAction: syncStudentsAction,
  },
  {
    key: "classes",
    label: "ห้องเรียน",
    description: "ดาวน์โหลด/อัปโหลดข้อมูลห้องเรียน",
    columns: ["className", "gradeLevel", "room"],
    exportAction: exportClassesAction,
    syncAction: syncClassesAction,
  },
  {
    key: "subjects",
    label: "วิชา",
    description: "ดาวน์โหลด/อัปโหลดข้อมูลวิชา",
    columns: ["subjectCode", "subjectName", "colorHex"],
    exportAction: exportSubjectsAction,
    syncAction: syncSubjectsAction,
  },
  {
    key: "schedules",
    label: "ตารางสอน",
    description: "ดาวน์โหลด/อัปโหลดข้อมูลตารางสอน",
    columns: ["className", "subjectCode", "teacherCode", "day", "period", "room"],
    exportAction: exportSchedulesAction,
    syncAction: syncSchedulesAction,
  },
];

function downloadBase64(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function parseFile(file: File): Promise<{ rows: Record<string, unknown>[]; error?: string }> {
  try {
    let rows: Record<string, unknown>[] = [];
    if (file.name.toLowerCase().endsWith(".csv")) {
      const text = await file.text();
      const res = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
      });
      rows = res.data;
    } else {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]!]!;
      rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    }
    return { rows };
  } catch {
    return { rows: [], error: "อ่านไฟล์ไม่สำเร็จ" };
  }
}

function SyncTab({ config }: { config: EntityConfig }) {
  const [rows, setRows] = React.useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = React.useState("");
  const [parseError, setParseError] = React.useState("");
  const [lastResult, setLastResult] = React.useState<ActionState | null>(null);
  const [exportPending, startExport] = useTransition();
  const [syncPending, startSync] = useTransition();

  async function onExport() {
    startExport(async () => {
      const res = await config.exportAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      downloadBase64(res.base64, res.filename);
      toast.success(`ดาวน์โหลด ${config.label} แล้ว`);
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    setLastResult(null);
    const { rows: parsed, error } = await parseFile(file);
    if (error) {
      setParseError(error);
      setRows([]);
    } else {
      setRows(parsed);
      if (parsed.length === 0) setParseError("ไม่พบข้อมูลในไฟล์");
    }
  }

  async function onSync() {
    if (rows.length === 0) return;
    startSync(async () => {
      const res = await config.syncAction(rows);
      setLastResult(res);
      if (res.ok) {
        toast.success(res.message ?? "Sync สำเร็จ");
      } else {
        toast.error(res.error ?? "Sync ไม่สำเร็จ");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.label}</CardTitle>
        <CardDescription>
          {config.description} — คอลัมน์: {" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            {config.columns.join(", ")}
          </code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={onExport}
            loading={exportPending}
            disabled={exportPending}
          >
            <Download />
            ดาวน์โหลด Excel
          </Button>
        </div>

        <div className="rounded-lg border border-dashed border-border p-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 text-center">
            <FileSpreadsheet className="size-8 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {fileName || "เลือกไฟล์เพื่ออัปโหลด"}
            </span>
            <span className="text-xs text-muted-foreground">.csv, .xlsx, .xls</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={onFile}
            />
          </label>
        </div>

        {parseError && <p className="text-sm text-destructive">{parseError}</p>}
        {rows.length > 0 && !parseError && (
          <p className="text-sm text-muted-foreground">
            พบ{" "}
            <span className="font-medium text-foreground">{rows.length}</span>{" "}
            แถวพร้อม sync
          </p>
        )}

        <Button
          onClick={onSync}
          loading={syncPending}
          disabled={rows.length === 0 || syncPending}
        >
          <Upload />
          Sync {config.label} ({rows.length})
        </Button>

        {lastResult && (
          <p
            className={`text-sm ${
              lastResult.ok ? "text-green-600" : "text-destructive"
            }`}
          >
            {lastResult.ok
              ? lastResult.message
              : lastResult.error ?? "Sync ไม่สำเร็จ"}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          โหมด <span className="font-medium text-foreground">Replace-all</span>:{" "}
          ข้อมูลที่มีในระบบแต่ไม่อยู่ในไฟล์จะถูกลบออก ข้อมูลใหม่จะถูกเพิ่ม และข้อมูลเดิมที่มีในไฟล์จะถูกแก้ไขตามไฟล์
        </p>
      </CardContent>
    </Card>
  );
}

export function DataSyncPage({ defaultTab = "teachers" }: { defaultTab?: string }) {
  const [activeTab, setActiveTab] = React.useState(defaultTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sync Excel</h1>
        <p className="text-muted-foreground">
          ดาวน์โหลดข้อมูลปัจจุบันเป็น Excel แก้ไขแล้วอัปโหลดกลับมา sync กับระบบ
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {ENTITIES.map((e) => (
            <TabsTrigger key={e.key} value={e.key}>
              {e.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {ENTITIES.map((e) => (
          <TabsContent key={e.key} value={e.key}>
            <SyncTab config={e} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
