import Link from "next/link";
import { ArrowLeftRight, Share2 } from "lucide-react";
import { requireTeacherProfile } from "@/lib/auth";
import { getTeacherEffective } from "@/server/services/effective-schedule.service";
import { getDefaultSchedule } from "@/server/services/bell-schedule.service";
import { getWeekSwaps } from "@/server/services/day-swap.service";
import { buildDayRemap, toIsoDate } from "@/lib/day-swap";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { TimetableGrid } from "@/components/timetable/timetable-grid";
import { DaySwapBanner } from "@/components/timetable/day-swap-banner";

export const metadata = { title: "ตารางสอนของฉัน" };

export default async function TeacherSchedulePage() {
  const { teacher } = await requireTeacherProfile();
  const todayIso = toIsoDate(new Date());
  const { slots, marks } = await getTeacherEffective(teacher.id, todayIso);
  const { slots: bellSlots } = await getDefaultSchedule();
  const weekSwaps = await getWeekSwaps(todayIso);
  const dayRemap = buildDayRemap(weekSwaps);

  return (
    <div>
      <PageHeader
        title="ตารางสอนของฉัน"
        description="ตารางสอนทั้งสัปดาห์ คาบปัจจุบันจะถูกไฮไลต์โดยอัตโนมัติ"
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/teacher/delegations/new">
              <Share2 />
              ฝากคาบ
            </Link>
          </Button>
          <Button asChild>
            <Link href="/teacher/swaps/new">
              <ArrowLeftRight />
              ขอแลกคาบสอน
            </Link>
          </Button>
        </div>
      </PageHeader>

      <DaySwapBanner swaps={weekSwaps} />

      <TimetableGrid slots={slots} variant="teacher" marks={marks} bellSlots={bellSlots} dayRemap={dayRemap} />

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-tt-current" /> คาบปัจจุบัน
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-tt-free" /> คาบว่าง
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-amber-400" /> คาบที่สลับ (สัปดาห์นี้)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-violet-400" /> ฝากคาบ
        </span>
      </div>
    </div>
  );
}
