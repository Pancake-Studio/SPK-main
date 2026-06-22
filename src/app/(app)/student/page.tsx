import { CalendarDays, School, Clock } from "lucide-react";
import { requireStudentProfile } from "@/lib/auth";
import {
  getClassSchedule,
  getClassBrief,
} from "@/server/services/schedule.service";
import { getEffectiveSlots } from "@/server/services/bell-schedule.service";
import { getWeekSwaps } from "@/server/services/day-swap.service";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NowNext } from "@/components/timetable/now-next";
import { TodaySchedule } from "@/components/timetable/today-schedule";
import { DaySwapBanner } from "@/components/timetable/day-swap-banner";
import { dayKeyForDate, currentPeriodNo, slotsForDay } from "@/lib/timetable";
import { effectiveDayFor, toIsoDate } from "@/lib/day-swap";

export default async function StudentDashboard() {
  const { user, student } = await requireStudentProfile();
  const [slots, klass] = await Promise.all([
    getClassSchedule(student.classId),
    getClassBrief(student.classId),
  ]);

  const now = new Date();
  const todayIso = toIsoDate(now);
  const today = dayKeyForDate(now);
  const weekSwaps = await getWeekSwaps(todayIso);
  const lessonDay = effectiveDayFor(now, weekSwaps);
  const bellSlots = await getEffectiveSlots(todayIso);
  const curPeriod = currentPeriodNo(now, bellSlots);
  const todayCount = lessonDay ? slotsForDay(slots, lessonDay).length : 0;
  const dateLabel = new Intl.DateTimeFormat("th-TH", {
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
        <StatCard label="คาบเรียนวันนี้" value={todayCount} icon={CalendarDays} accent="info" />
        <StatCard
          label="คาบเรียนต่อสัปดาห์"
          value={slots.length}
          icon={Clock}
          accent="gold"
        />
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
