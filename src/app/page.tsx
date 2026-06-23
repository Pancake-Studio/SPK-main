import Link from "next/link";
import {
  CalendarDays,
  ArrowLeftRight,
  Bell,
  ShieldCheck,
  Megaphone,
  LayoutDashboard,
  ArrowRight,
  Share2,
  ClipboardList,
  GraduationCap,
  Users,
  Sparkles,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_NAME, SCHOOL_NAME } from "@/lib/constants";

const FEATURES = [
  { icon: CalendarDays, title: "ตารางเรียน/ตารางสอน", desc: "ดูตารางรายวันและรายสัปดาห์ พร้อมไฮไลต์คาบปัจจุบันแบบเรียลไทม์ และมุมมองมือถือที่อ่านง่าย" },
  { icon: ArrowLeftRight, title: "แลกคาบสอน", desc: "ครูส่งคำขอแลกคาบเฉพาะสัปดาห์ อนุมัติ/ปฏิเสธ และตารางอัปเดตให้อัตโนมัติ" },
  { icon: Share2, title: "ฝากคาบสอน", desc: "ฝากคาบให้ครูที่ว่างมาคุมแทนเฉพาะสัปดาห์ที่เลือก โดยไม่ต้องแลกคาบ" },
  { icon: ClipboardList, title: "มอบหมายงาน & To-do", desc: "ครูมอบหมายงานพร้อมไฟล์แนบ นักเรียนติ๊กเสร็จ/ส่งงานได้ทันใจ พร้อมแถบความคืบหน้า" },
  { icon: Bell, title: "แจ้งเตือนเรียลไทม์", desc: "รับการแจ้งเตือนทันทีเมื่อมีการแลกคาบ ฝากคาบ ตารางเปลี่ยน หรือมีประกาศใหม่" },
  { icon: Megaphone, title: "ประกาศข่าวสาร", desc: "ผู้ดูแลและครูกระจายข่าวสารถึงครูและนักเรียนได้ในคลิกเดียว" },
];

const ROLES = [
  {
    icon: ShieldCheck,
    title: "ผู้ดูแลระบบ",
    color: "bg-primary/10 text-primary",
    points: ["จัดการครู นักเรียน ห้องเรียน วิชา ตาราง", "นำเข้า/ส่งออก Excel", "ตั้งเวลาเรียน/คาบ และผู้ดูแลคนอื่น"],
  },
  {
    icon: Users,
    title: "ครู",
    color: "bg-amber-400/15 text-amber-600 dark:text-amber-400",
    points: ["จัดวิชา/ตารางสอนของตนเอง", "แลกคาบ • ฝากคาบ • มอบหมายงาน", "ดูแลนักเรียนในห้องที่ปรึกษา"],
  },
  {
    icon: GraduationCap,
    title: "นักเรียน",
    color: "bg-secondary text-primary",
    points: ["ดูตารางเรียนและคาบปัจจุบัน", "รายการงาน/To-do พร้อมส่งไฟล์", "รับประกาศและการแจ้งเตือน"],
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  const cta = user ? "/dashboard" : "/login";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild>
              <Link href={cta}>{user ? "ไปที่แดชบอร์ด" : "เข้าสู่ระบบ"}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Decorative gradient blobs */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-24 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute -right-24 top-40 size-80 rounded-full bg-amber-400/15 blur-3xl" />
          </div>

          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
                <Sparkles className="size-3.5 text-primary" />
                ระบบบริหารจัดการโรงเรียนยุคใหม่
              </span>
              <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                แพลตฟอร์มดิจิทัลกลาง
                <span className="block bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
                  สำหรับ{SCHOOL_NAME}
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
                {APP_NAME} รวมตารางเรียน การแลกคาบ/ฝากคาบ การมอบหมายงาน การแจ้งเตือน
                และการบริหารข้อมูลไว้ในที่เดียว — ใช้งานง่าย รวดเร็ว ปลอดภัย และลื่นไหลบนมือถือ
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href={cta}>
                    เริ่มใช้งาน
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="#features">ดูฟีเจอร์ทั้งหมด</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Roles */}
        <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {ROLES.map((r) => (
              <Card key={r.title} className="p-6">
                <span className={`grid size-12 place-items-center rounded-xl ${r.color}`}>
                  <r.icon className="size-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{r.title}</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                      {p}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mt-16 border-t border-border bg-muted/30 scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                ทุกอย่างที่โรงเรียนต้องใช้ ในที่เดียว
              </h2>
              <p className="mt-3 text-muted-foreground">ออกแบบให้เร็ว ตอบสนองทันที และใช้งานง่ายสำหรับทุกบทบาท</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <Card key={f.title} className="group p-6 transition-shadow hover:shadow-md">
                  <span className="grid size-11 place-items-center rounded-lg bg-secondary text-primary transition-transform group-hover:scale-110">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <LayoutDashboard className="mx-auto size-9 opacity-90" />
              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">พร้อมเริ่มใช้งานแล้วหรือยัง?</h2>
              <p className="mx-auto mt-2 max-w-xl text-primary-foreground/80">
                เข้าสู่ระบบด้วยบัญชีโรงเรียนของคุณ แล้วจัดการทุกอย่างได้ทันที
              </p>
              <Button asChild size="lg" variant="secondary" className="mt-6">
                <Link href={cta}>
                  {user ? "ไปที่แดชบอร์ด" : "เข้าสู่ระบบ"}
                  <ArrowRight />
                </Link>
              </Button>
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
