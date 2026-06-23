import { requireAdmin } from "@/lib/auth";
import {
  listBellSchedules,
  listUpcomingOverrides,
} from "@/server/services/bell-schedule.service";
import { listUpcomingDaySwaps } from "@/server/services/day-swap.service";
import { PageHeader } from "@/components/page-header";
import { BellScheduleEditor } from "@/components/admin/bell-schedule-editor";
import { ScheduleOverrideManager } from "@/components/admin/schedule-override-manager";
import { DaySwapManager } from "@/components/admin/day-swap-manager";

export const metadata = { title: "เวลาเรียน / คาบเรียน" };

/** Today's date in YYYY-MM-DD (Asia/Bangkok). */
function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

export default async function AdminPeriodsPage() {
  await requireAdmin();
  const today = todayIso();
  const [templates, overrides, daySwaps] = await Promise.all([
    listBellSchedules(),
    listUpcomingOverrides(today),
    listUpcomingDaySwaps(today),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="เวลาเรียน / คาบเรียน"
        description="แก้ไขเวลาคาบเรียน สลับลำดับคาบ (มีผลทุกห้อง) และบันทึกเป็นเทมเพลตสำหรับใช้เฉพาะวัน"
      />

      <BellScheduleEditor templates={templates} />

      <DaySwapManager swaps={daySwaps} todayIso={today} />

      <ScheduleOverrideManager
        templates={templates.map((t) => ({ id: t.id, name: t.name }))}
        overrides={overrides}
        todayIso={today}
      />
    </div>
  );
}
