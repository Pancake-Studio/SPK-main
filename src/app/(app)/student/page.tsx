import { School } from "lucide-react";
import { requireStudentProfile } from "@/lib/auth";
import { getClassBrief } from "@/server/services/schedule.service";
import { getClassEffective } from "@/server/services/effective-schedule.service";
import { getEffectiveSlots } from "@/server/services/bell-schedule.service";
import { getWeekSwaps } from "@/server/services/day-swap.service";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NowNext } from "@/components/timetable/now-next";
import { TodaySchedule } from "@/components/timetable/today-schedule";
import { DaySwapBanner } from "@/components/timetable/day-swap-banner";
import { dayKeyForDate, currentPeriodNo } from "@/lib/timetable";
import { effectiveDayFor, toIsoDate } from "@/lib/day-swap";

export default async function StudentDashboard() {
  const { user, student } = await requireStudentProfile();
  const now = new Date();
  const todayIso = toIsoDate(now);
  const [{ slots }, klass] = await Promise.all([
    getClassEffective(student.classId, todayIso),
    getClassBrief(student.classId),
  ]);

  const today = dayKeyForDate(now);
  const weekSwaps = await getWeekSwaps(todayIso);
  const lessonDay = effectiveDayFor(now, weekSwaps);
  const bellSlots = await getEffectiveSlots(todayIso);
  const curPeriod = currentPeriodNo(now, bellSlots);
  const dateLabel = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  return (
    <div>
      <PageHeader title={`สวัสดี, ${user.name}`} description={dateLabel} />

      <DaySwapBanner swaps={weekSwaps} today={today} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="ห้องเรียน" value={klass?.className ?? "-"} icon={School} accent="primary" />
      </div>

      <div className="mt-6">
        <NowNext slots={slots} variant="class" bellSlots={bellSlots} dayOverride={lessonDay} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>ตารางเรียนวันนี้</CardTitle>
        </CardHeader>
        <CardContent>
          <TodaySchedule slots={slots} day={lessonDay} variant="class" currentPeriod={curPeriod} bellSlots={bellSlots} />
        </CardContent>
      </Card>
    </div>
  );
}
