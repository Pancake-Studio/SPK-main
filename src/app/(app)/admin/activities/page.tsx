import { Sparkles } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listActivityPeriods } from "@/server/services/activity.service";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AddActivityDialog, ActivityTable, type ActivityRow } from "@/components/admin/activity-manager";

type ActivityPeriod = {
    id: string;
    day: string;
    period: number;
    label: string;
    colorHex: string | null;
}

export const metadata = { title: "คาบกิจกรรม" };
export default async function AdminActivitiesPage() {
  await requireAdmin();
  const activities: ActivityPeriod[] = await listActivityPeriods();
  const rows: ActivityRow[] = activities.map((a) => ({
    id: a.id,
    day: a.day,
    period: a.period,
    label: a.label,
    colorHex: a.colorHex,
  }));

  return (
    <div>
      <PageHeader
        title="คาบกิจกรรม"
        description="คาบกิจกรรมระดับโรงเรียน (เช่น ชุมนุม, อบรมคุณธรรม) — แสดงในตารางของทุกห้องและทุกครูในวัน/คาบที่กำหนด"
      >
        <AddActivityDialog />
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="ยังไม่มีคาบกิจกรรม"
          description="เพิ่มคาบกิจกรรม เช่น คาบชุมนุม (พฤหัสบดี คาบ 7) หรือ คาบอบรมคุณธรรม (ศุกร์ คาบ 7)"
        />
      ) : (
        <ActivityTable rows={rows} />
      )}
    </div>
  );
}
