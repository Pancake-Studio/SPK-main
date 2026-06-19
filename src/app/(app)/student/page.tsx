import { CalendarDays, School, Clock } from "lucide-react";
import { requireStudentProfile } from "@/lib/auth";
import {
  getClassSchedule,
  getClassBrief,
} from "@/server/services/schedule.service";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NowNext } from "@/components/timetable/now-next";
import { TodaySchedule } from "@/components/timetable/today-schedule";
import { dayKeyForDate, currentPeriodNo, slotsForDay } from "@/lib/timetable";

export default async function StudentDashboard() {
  const { user, student } = await requireStudentProfile();
  const [slots, klass] = await Promise.all([
    getClassSchedule(student.classId),
    getClassBrief(student.classId),
  ]);

  const now = new Date();
  const today = dayKeyForDate(now);
  const curPeriod = currentPeriodNo(now);
  const todayCount = today ? slotsForDay(slots, today).length : 0;
  const dateLabel = new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  return (
    <div>
      <PageHeader title={`สวัสดี, ${user.name}`} description={dateLabel} />

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
        <NowNext slots={slots} variant="class" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>ตารางเรียนวันนี้</CardTitle>
        </CardHeader>
        <CardContent>
          <TodaySchedule slots={slots} day={today} variant="class" currentPeriod={curPeriod} />
        </CardContent>
      </Card>
    </div>
  );
}
