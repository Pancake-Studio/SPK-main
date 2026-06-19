import Link from "next/link";
import {
  CalendarDays,
  ArrowLeftRight,
  Bell,
  ShieldCheck,
  Megaphone,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_NAME, SCHOOL_NAME } from "@/lib/constants";

const FEATURES = [
  { icon: CalendarDays, title: "ตารางเรียน/ตารางสอน", desc: "ดูตารางรายวันและรายสัปดาห์ พร้อมไฮไลต์คาบปัจจุบันแบบเรียลไทม์" },
  { icon: ArrowLeftRight, title: "ระบบแลกคาบสอน", desc: "ครูส่งคำขอแลกคาบ อนุมัติ/ปฏิเสธ และอัปเดตตารางอัตโนมัติ" },
  { icon: Bell, title: "การแจ้งเตือนเรียลไทม์", desc: "รับการแจ้งเตือนทันทีเมื่อมีการแลกคาบ หรือตารางเปลี่ยนแปลง" },
  { icon: Megaphone, title: "ประกาศจากโรงเรียน", desc: "ผู้ดูแลระบบกระจายข่าวสารถึงครูและนักเรียนได้ในคลิกเดียว" },
  { icon: LayoutDashboard, title: "แผงควบคุมผู้ดูแล", desc: "จัดการครู นักเรียน ห้องเรียน วิชา และตารางสอน พร้อมนำเข้าไฟล์ CSV/Excel" },
  { icon: ShieldCheck, title: "ปลอดภัยตามบทบาท", desc: "สิทธิ์การเข้าถึงแบบ RBAC แยกผู้ดูแล ครู และนักเรียนอย่างชัดเจน" },
];

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button asChild>
                <Link href="/dashboard">ไปที่แดชบอร์ด</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/login">เข้าสู่ระบบ</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-secondary-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              ระบบบริหารจัดการโรงเรียนยุคใหม่
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              แพลตฟอร์มดิจิทัลกลาง
              <br />
              สำหรับ{SCHOOL_NAME}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              {APP_NAME} รวมตารางเรียน การแลกคาบสอน การแจ้งเตือน
              และการบริหารจัดการข้อมูลไว้ในที่เดียว ใช้งานง่าย ปลอดภัย
              และรองรับการใช้งานบนมือถือ
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={user ? "/dashboard" : "/login"}>
                  เริ่มใช้งาน
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <Card key={f.title} className="p-6">
                  <span className="grid size-11 place-items-center rounded-lg bg-secondary text-primary">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} {SCHOOL_NAME}. สงวนลิขสิทธิ์.</p>
        </div>
      </footer>
    </div>
  );
}
