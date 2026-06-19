import { CalendarDays, Layers, Inbox, Send } from "lucide-react";
import { requireTeacherProfile } from "@/lib/auth";
import { getTeacherSchedule } from "@/server/services/schedule.service";
import {
  getSwapsForTeacher,
  mapSwapToClient,
} from "@/server/services/swap.service";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NowNext } from "@/components/timetable/now-next";
import { TodaySchedule } from "@/components/timetable/today-schedule";
import { SwapList } from "@/components/swap/swap-list";
import { dayKeyForDate, currentPeriodNo, slotsForDay } from "@/lib/timetable";
import { SWAP_STATUS } from "@/lib/constants";

export default async function TeacherDashboard() {
  const { user, teacher } = await requireTeacherProfile();
  const [slots, swaps] = await Promise.all([
    getTeacherSchedule(teacher.id),
    getSwapsForTeacher(teacher.id),
  ]);

  const now = new Date();
  const today = dayKeyForDate(now);
  const curPeriod = currentPeriodNo(now);
  const todayCount = today ? slotsForDay(slots, today).length : 0;

  const pendingIncoming = swaps.incoming.filter((s) => s.status === SWAP_STATUS.PENDING);
  const pendingOutgoing = swaps.outgoing.filter((s) => s.status === SWAP_STATUS.PENDING);
  const dateLabel = new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  return (
    <div>
      <PageHeader title={`สวัสดี, ${user.name}`} description={dateLabel} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="คาบสอนวันนี้" value={todayCount} icon={CalendarDays} accent="primary" />
        <StatCard label="คาบสอนต่อสัปดาห์" value={slots.length} icon={Layers} accent="info" />
        <StatCard
          label="คำขอรออนุมัติ"
          value={pendingIncoming.length}
          icon={Inbox}
          accent="gold"
          href="/teacher/swaps"
        />
        <StatCard
          label="คำขอที่ส่งไป"
          value={pendingOutgoing.length}
          icon={Send}
          accent="success"
          href="/teacher/swaps"
        />
      </div>

      <div className="mt-6">
        <NowNext slots={slots} variant="teacher" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ตารางสอนวันนี้</CardTitle>
          </CardHeader>
          <CardContent>
            <TodaySchedule slots={slots} day={today} variant="teacher" currentPeriod={curPeriod} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>คำขอแลกคาบรออนุมัติ</CardTitle>
          </CardHeader>
          <CardContent>
            <SwapList swaps={pendingIncoming.map(mapSwapToClient)} mode="incoming" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
