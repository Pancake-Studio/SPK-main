import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, ShieldCheck, CalendarDays, ArrowLeftRight, TriangleAlert } from "lucide-react";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { APP_NAME, SCHOOL_NAME, ROLE_HOME, type Role } from "@/lib/constants";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

const HIGHLIGHTS = [
  { icon: CalendarDays, text: "ดูตารางสอน/ตารางเรียนแบบเรียลไทม์" },
  { icon: ArrowLeftRight, text: "ระบบแลกคาบสอนระหว่างครู" },
  { icon: ShieldCheck, text: "ปลอดภัยด้วยสิทธิ์การเข้าถึงตามบทบาท" },
];

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "suntisuk.ac.th";
const GOOGLE_CONFIGURED = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

const AUTH_ERRORS: Record<string, string> = {
  CredentialsSignin: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  OAuthCallback: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่",
  OAuthAccountNotLinked: "บัญชี Google นี้ยังไม่ได้เชื่อมกับระบบ",
  Default: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่",
  google_domain: `อนุญาตให้เข้าสู่ระบบด้วย Google เฉพาะอีเมล @${ALLOWED_DOMAIN} เท่านั้น`,
  google_notfound: "ไม่พบบัญชีนี้ในระบบ กรุณาติดต่อผู้ดูแลระบบ",
  google_inactive: "บัญชีนี้ถูกระงับการใช้งาน",
  google_error: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Only redirect a *validated* signed-in user. A stale/expired cookie falls
  // through to the form so the user can actually sign back in.
  let session = null;
  try {
    session = await auth();
  } catch {
    // stale/expired JWT → ignore and show login form
  }
  if (session?.user) redirect(ROLE_HOME[session.user.role as Role] ?? "/");

  const googleEnabled = GOOGLE_CONFIGURED;
  const domain = ALLOWED_DOMAIN;
  const authError = error ? (AUTH_ERRORS[error] ?? AUTH_ERRORS.Default) : null;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel (desktop) */}
      <div className="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Logo className="[&_*]:text-primary-foreground" />
        <div className="space-y-6">
          <h2 className="max-w-md text-3xl font-bold leading-tight">
            แพลตฟอร์มดิจิทัลกลางของโรงเรียน
          </h2>
          <p className="max-w-md text-primary-foreground/80">
            รวมตารางเรียน การแลกคาบสอน การแจ้งเตือน และการประกาศไว้ในที่เดียว
            ใช้งานง่ายทั้งสำหรับผู้ดูแลระบบ ครู และนักเรียน
          </p>
          <ul className="space-y-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h.text} className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-white/15">
                  <h.icon className="size-5" />
                </span>
                <span className="text-sm text-primary-foreground/90">{h.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} {SCHOOL_NAME}
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-4 lg:justify-end">
          <div className="lg:hidden">
            <Logo />
          </div>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-12">
          <div className="w-full max-w-sm">
            <div className="mb-8 space-y-2 text-center lg:text-left">
              <span className="inline-grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground lg:hidden">
                <GraduationCap className="size-6" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight">เข้าสู่ระบบ {APP_NAME}</h1>
              <p className="text-sm text-muted-foreground">
                กรอกอีเมลและรหัสผ่านของคุณเพื่อเข้าใช้งาน
              </p>
            </div>

            {authError && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {googleEnabled && (
              <div className="mb-6 space-y-4">
                <GoogleSignInButton domain={domain} />
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">หรือ</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              </div>
            )}

            <LoginForm />

            <div className="mt-6 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">บัญชีทดลอง (Demo)</p>
              <p>ผู้ดูแล: admin@spk.ac.th / admin123</p>
              <p>ครู: somchai@spk.ac.th / password123</p>
              <p>นักเรียน: s0001@spk.ac.th / password123</p>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              <Link href="/" className="hover:text-foreground hover:underline">
                ← กลับสู่หน้าหลัก
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
