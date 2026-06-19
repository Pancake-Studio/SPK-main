import { Users, GraduationCap, School, BookOpen, ArrowLeftRight, CalendarDays, Activity } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import {
  getAdminStats,
  getSwapStatusBreakdown,
} from "@/server/services/admin.service";
import { getAllSwaps, mapSwapToClient } from "@/server/services/swap.service";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SwapChart } from "@/components/admin/swap-chart";
import { SwapList } from "@/components/swap/swap-list";

export default async function AdminDashboard() {
  await requireAdmin();
  const [stats, breakdown, swaps] = await Promise.all([
    getAdminStats(),
    getSwapStatusBreakdown(),
    getAllSwaps(),
  ]);

  const recent = swaps.slice(0, 5).map(mapSwapToClient);

  return (
    <div>
      <PageHeader title="ภาพรวมระบบ" description="สรุปข้อมูลและกิจกรรมของโรงเรียน" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="ครูทั้งหมด" value={stats.teachers} icon={Users} accent="primary" href="/admin/teachers" />
        <StatCard label="นักเรียนทั้งหมด" value={stats.students} icon={GraduationCap} accent="info" href="/admin/students" />
        <StatCard label="ห้องเรียน" value={stats.classes} icon={School} accent="success" href="/admin/classes" />
        <StatCard label="คำขอแลกคาบรออนุมัติ" value={stats.pendingSwaps} icon={ArrowLeftRight} accent="gold" href="/admin/swaps" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="วิชาทั้งหมด" value={stats.subjects} icon={BookOpen} accent="primary" href="/admin/subjects" />
        <StatCard label="คาบสอนในตาราง" value={stats.schedules} icon={CalendarDays} accent="info" href="/admin/schedule" />
        <StatCard label="คำขอแลกคาบวันนี้" value={stats.todaySwaps} icon={ArrowLeftRight} accent="gold" />
        <StatCard label="กิจกรรมวันนี้" value={stats.todayActivity} icon={Activity} accent="success" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>สถานะคำขอแลกคาบ</CardTitle>
          </CardHeader>
          <CardContent>
            <SwapChart data={breakdown} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>คำขอแลกคาบล่าสุด</CardTitle>
          </CardHeader>
          <CardContent>
            <SwapList swaps={recent} mode="admin" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
