# SPK School Platform — บันทึกความคืบหน้า (Progress Log)

> อัปเดตล่าสุด: 2026-06-18 · สถานะ: **Phase 1 เสร็จสมบูรณ์** — ผ่าน `tsc`, `next build`, และ smoke-test ทุกหน้า/ทุกบทบาท ✅

แอปพลิเคชันบริหารจัดการโรงเรียน (School Management Web App) ตามสเปกใน
[docs/PROMPT.md](docs/PROMPT.md) และ [docs/DESIGN.md](docs/DESIGN.md)

---

## 1. Tech Stack ที่ใช้จริง

| ส่วน | เทคโนโลยี |
|------|-----------|
| Framework | **Next.js 16** (App Router) + React 19 + TypeScript (monolith) |
| Styling | **Tailwind CSS v4** + ธีม Purple/Yellow + Light/Dark (`next-themes`) |
| UI | shadcn-style components + **Radix UI** primitives + **Framer Motion** + **Lucide** |
| Database | **Prisma ORM 6** + **SQLite** (dev) / พร้อมสลับเป็น **PostgreSQL** (prod) |
| Validation | **Zod 4** + React Hook Form |
| Auth | Session-based (opaque token + HttpOnly cookie), **bcryptjs**, RBAC |
| Realtime | **Server-Sent Events (SSE)** + in-process event bus |
| Tables/Charts | TanStack Table, Recharts |
| Import | PapaParse (CSV), XLSX (Excel) |

> **หมายเหตุการตัดสินใจ:** เลือก Prisma 6 (ไม่ใช่ 7) เพราะ v7 บังคับใช้ driver adapter +
> native module (`better-sqlite3`) ซึ่งเสี่ยงต่อการ build บน WSL/Windows — v6 ใช้ engine
> ในตัว ไม่ต้อง native build และเข้ากับ Next.js ได้ลื่นกว่า ตอบโจทย์ "ใช้ Prisma Studio" ได้ทันที

---

## 2. สิ่งที่ทำเสร็จแล้ว ✅

### Foundation & Design System
- ตั้งโครงโปรเจกต์ Next.js + TS + Tailwind v4 + ESLint
- **Design tokens ครบ** (Purple/Yellow) รองรับ Light/Dark เต็มรูปแบบ — [src/app/globals.css](src/app/globals.css)
- ฟอนต์ Inter + Noto Sans Thai, ปุ่มสลับธีม (SSR-safe), Toaster (sonner)
- ระบบสี/ระยะห่าง/มุมโค้ง/เงา ตาม DESIGN.md (institutional, minimal)

### UI Component Library — [src/components/ui/](src/components/ui/)
Button, Card, Input, Textarea, Label, Badge, Avatar, Dialog, Dropdown Menu,
Select, Tooltip, Switch, Tabs, Checkbox, Scroll Area, Popover, Separator,
Skeleton, Table, Sonner (toast)

### Database — [prisma/schema.prisma](prisma/schema.prisma)
Models: **User, Session, Teacher, Student, Class, Subject, Schedule,
SwapRequest, SwapLog, Notification, Announcement, AuditLog**
- ออกแบบให้พกพาได้ (string enums, ไม่มี scalar array) → schema เดียวใช้ได้ทั้ง SQLite/Postgres
- **Seed สำเร็จแล้ว**: 8 วิชา, 5 ห้อง, 8 ครู, 20 นักเรียน, 150 คาบสอน — [prisma/seed.ts](prisma/seed.ts)

### Auth + RBAC — [src/lib/auth/](src/lib/auth/)
- Session แบบ opaque token (เก็บ SHA-256 ใน DB) + HttpOnly cookie + CSRF cookie
- bcrypt (cost 12), `requireUser` / `requireRole` / `requireAdmin|Teacher|Student`
- Middleware ([src/middleware.ts](src/middleware.ts)) gate เส้นทาง /admin /teacher /student
- Rate limiting (in-memory), audit logging (login/logout/swap)

### Service & Action Layer — [src/server/](src/server/)
- Services: `schedule`, `swap`, `notification`, `admin` (แยก concern ตามสเปก)
- Server Actions: `auth`, `swap`, `notification`, `admin` พร้อม Zod validation + error handling

### App Shell — [src/components/layout/](src/components/layout/)
- Sidebar (เมนูตามบทบาท) + Navbar (theme toggle, กระดิ่งแจ้งเตือน, user menu)
- Responsive: desktop sidebar คงที่ 280px, mobile = drawer (Framer Motion)
- เมนูตาม role ครบ (Admin/Teacher/Student) ตาม DESIGN.md

### หน้า/ฟีเจอร์ (ครบทุกบทบาท)
- **Landing page** สาธารณะ ([src/app/page.tsx](src/app/page.tsx))
- **Login** + ฟอร์ม (useActionState, error states, บัญชี demo) — [src/app/(auth)/login/](src/app/(auth)/login/)
- **Timetable Grid** ตาม DESIGN §11: ไฮไลต์คาบปัจจุบัน (live), คาบว่าง, เลือกคาบได้ — [src/components/timetable/](src/components/timetable/)
- **ระบบแลกคาบ (core feature)**: Dialog ส่งคำขอ + รายการ incoming/outgoing + อนุมัติ/ปฏิเสธ/ยกเลิก + อัปเดตตารางอัตโนมัติ + แจ้งนักเรียนทั้งห้อง
- **Teacher**: dashboard, ตารางสอน, หน้าแลกคาบ (tabs), การแจ้งเตือน
- **Student**: dashboard (คาบปัจจุบัน/ถัดไป), ตารางเรียน (desktop grid / mobile cards), การแจ้งเตือน
- **Admin**: ภาพรวม + analytics (Recharts), จัดการครู/นักเรียน/ห้อง/วิชา/ตาราง, **นำเข้า CSV/Excel**, monitor การแลกคาบ, ประกาศ (broadcast)
- **Settings**: โปรไฟล์ + เปลี่ยนรหัสผ่าน
- **Realtime SSE** ([src/app/api/realtime/route.ts](src/app/api/realtime/route.ts)) + กระดิ่งแจ้งเตือนแบบสด

### ผลการตรวจสอบ (Verification) ✅
- `tsc --noEmit` — ผ่าน (type-safe ทั้งโปรเจกต์)
- `next build` — สำเร็จ, 22 routes
- DB push + seed — รันได้จริง (8 วิชา / 5 ห้อง / 8 ครู / 20 นักเรียน / 150 คาบ)
- Smoke-test ขณะรัน production server: ทุกหน้าของ Admin/Teacher/Student คืนค่า **200**,
  guest → redirect /login, RBAC (student เข้า /admin) → redirect, `/api/realtime` ไม่ล็อกอิน → 401,
  หน้าแสดงข้อมูลจริงจาก DB, **0 server errors**

---

## 3. ที่เหลือ / งานอนาคต 🚧

- [ ] เปลี่ยนชื่อ `src/middleware.ts` → `src/proxy.ts` (Next 16 deprecate ชื่อ middleware — ปัจจุบันยังทำงานได้ปกติ)
- [ ] แก้/เพิ่ม (update) entity ในแอดมิน (ตอนนี้มี create + delete; ยังไม่มี edit แบบเต็ม)
- [ ] Redis (session/cache/rate-limit), FCM push, WebSocket แทน SSE สำหรับ multi-instance
- [ ] ชุดทดสอบ Vitest/Playwright + CI/CD (GitHub Actions), Husky/commitlint
- [ ] หน้า public อื่น ๆ (ข่าว/เกี่ยวกับ/ติดต่อ) แบบ SSG

---

## 4. โครงสร้างโปรเจกต์ (ย่อ)

```
src/
├── app/
│   ├── (app)/            # เลย์เอาต์ที่ล็อกอินแล้ว (sidebar+navbar) → admin/teacher/student
│   ├── (auth)/login/     # หน้าเข้าสู่ระบบ
│   ├── api/realtime/     # SSE endpoint
│   ├── dashboard/        # ตัวกระจายเส้นทางตามบทบาท
│   ├── page.tsx          # Landing
│   ├── layout.tsx        # Root (ThemeProvider, fonts)
│   └── globals.css       # Design tokens
├── components/
│   ├── ui/               # คอมโพเนนต์พื้นฐาน
│   ├── layout/           # shell (sidebar, navbar, ...)
│   ├── timetable/        # ตารางเรียน + now/next
│   ├── swap/             # แลกคาบ (dialog, list)
│   └── notifications/    # กระดิ่ง + ไอคอน
├── lib/                  # utils, constants, auth, validations, timetable, nav
├── server/
│   ├── services/         # business logic
│   ├── actions/          # server actions
│   └── realtime.ts       # event bus
└── middleware.ts
prisma/ (schema.prisma, seed.ts, dev.db)
docs/  (PROMPT.md, DESIGN.md)
```

---

## 5. วิธีรัน

```bash
npm install
npx prisma db push          # สร้าง SQLite (prisma/dev.db)
npm run db:seed             # ใส่ข้อมูลตัวอย่าง
npm run dev                 # http://localhost:3000
npm run db:studio           # เปิด Prisma Studio ดู/แก้ข้อมูล
```

### บัญชีทดลอง (Demo)
| บทบาท | อีเมล | รหัสผ่าน |
|-------|-------|----------|
| Admin | admin@spk.ac.th | admin123 |
| Teacher | somchai@spk.ac.th | password123 |
| Student | s0001@spk.ac.th | password123 |

---

## 6. Session Log (บันทึกทุกครั้งที่ทำงาน)

> กติกา: ทุกครั้งที่มีการแก้ไข/เพิ่มงาน ให้ **เพิ่มรายการใหม่ไว้บนสุด** ของหัวข้อนี้
> (วันที่ · สรุปสิ่งที่ทำ · ไฟล์/ส่วนที่แตะ · ผลการตรวจสอบ)

### 2026-06-19 — แก้ push ไม่เด้งบนเครื่อง (observability + self-test)
- ปัญหา: ทุก trigger แจ้งเตือน "คนอื่น" (ทดสอบคนเดียวเลยไม่เห็น) + error ถูกกลืนหมด ไม่มี log → วินิจฉัยไม่ได้
- [push.service.ts](src/server/services/push.service.ts): `sendPushToUser` คืน `{total,sent,failed,configured}` + `console.error` ทุก error ที่ไม่ใช่ 404/410 (เช่น 401/403 = VAPID ไม่ตรง) + `countUserSubscriptions`
- [notification.service.ts](src/server/services/notification.service.ts): `void` → **`after()`** (next/server) ส่ง push หลัง response อย่างเชื่อถือได้
- [push.actions.ts](src/server/actions/push.actions.ts): เพิ่ม **`sendTestPushAction`** (await + คืนผลจริง) + `getPushStatusAction`
- [use-push.ts](src/components/pwa/use-push.ts): hook รวม subscribe/sendTest/secure-context ใช้ร่วมกัน; [push-manager.tsx](src/components/pwa/push-manager.tsx) เด้ง toast error/success + guard `isSecureContext`
- **Settings → การแจ้งเตือน** ([push-settings.tsx](src/components/pwa/push-settings.tsx)): แสดงสถานะสิทธิ์ + จำนวนอุปกรณ์ + ปุ่ม "เปิดการแจ้งเตือน" / **"ส่งการแจ้งเตือนทดสอบ"** (verify ได้ทันที, บอก error จริง)
- **ตรวจสอบ:** `tsc` ✅ · `next build` (23 routes) ✅ · serve + authed `/settings` = 200 มีปุ่มทดสอบ, 0 errors ✅
- ⚠️ **ต้องรีสตาร์ท `npm run dev` / rebuild** หลังเพิ่ม VAPID keys ใน `.env` (ค่า `NEXT_PUBLIC_*` ถูกฝังตอน build) — ปุ่มทดสอบจะบอกชัดถ้าคีย์ไม่ตรง/ยังไม่สมัคร

### 2026-06-19 — PWA (ติดตั้งได้) + Web Push (แจ้งเตือนระดับอุปกรณ์)
- **PWA**: [src/app/manifest.ts](src/app/manifest.ts) (standalone, theme purple) + ไอคอน [public/icon.svg](public/icon.svg)/[icon-maskable.svg](public/icon-maskable.svg) + meta apple-web-app + register SW ([src/components/pwa/service-worker-register.tsx](src/components/pwa/service-worker-register.tsx)) → ติดตั้งบน desktop/มือถือได้
- **Service worker** [public/sw.js](public/sw.js): push + notificationclick (focus/เปิด url) + fetch passthrough (installability)
- **Web Push**: model `PushSubscription` (db push แล้ว), [push.service.ts](src/server/services/push.service.ts) (web-push + VAPID, prune 404/410), hook เข้า `notification.service.createNotification` → ส่ง push ทุก subscription; actions subscribe/unsubscribe
- **ขอ permission ทุก login ถ้ายังไม่อนุญาต**: [push-manager.tsx](src/components/pwa/push-manager.tsx) ใน (app) layout — auto-request (Chrome/Android) + banner ปุ่ม "เปิด" (iOS/ต้อง gesture), granted→subscribe อัตโนมัติ
- env ใหม่: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- **ตรวจสอบ:** `tsc` ✅ · `next build` (23 routes, +manifest) ✅ · serve: /manifest.webmanifest, /sw.js, /icon.svg = 200, head มี manifest+apple-touch-icon ✅
- ⚠️ ต้อง HTTPS ใน prod (localhost ยกเว้น) · iOS push ใช้ได้เฉพาะติดตั้งลง home screen (iOS 16.4+) · ไอคอนเป็น SVG (iOS apple-touch อยากได้ PNG — เพิ่มภายหลัง)

### 2026-06-19 — แก้ hydration error ThemeToggle
- `aria-label` พึ่ง `resolvedTheme` (undefined ฝั่ง server) → mismatch. Gate ด้วย `mounted` ให้คงที่ก่อน mount — [src/components/layout/theme-toggle.tsx](src/components/layout/theme-toggle.tsx)

### 2026-06-19 — เพิ่ม Google Sign-In (เฉพาะโดเมน @suntisuk.ac.th)
- OAuth 2.0 flow เขียนเอง (ไม่พึ่ง NextAuth) เข้ากับระบบ session เดิม:
  - [src/lib/auth/google.ts](src/lib/auth/google.ts) — สร้าง auth URL (`hd` hint), แลก code→token, verify id_token ด้วย `jose` + Google JWKS (เช็ค iss/aud/nonce)
  - [src/app/api/auth/google/route.ts](src/app/api/auth/google/route.ts) — start: ออก state+nonce (HttpOnly cookie) แล้ว redirect ไป Google
  - [src/app/api/auth/google/callback/route.ts](src/app/api/auth/google/callback/route.ts) — verify state → verify token → **บังคับโดเมน @suntisuk.ac.th + email_verified** → หา user ใน DB → `createSession` → redirect ตาม role
  - ถ้าไม่พบ user: error `google_notfound` (หรือ auto-provision ถ้าตั้ง `GOOGLE_AUTO_PROVISION_ROLE`)
- ปุ่ม "เข้าสู่ระบบด้วย Google" + ข้อความ error บนหน้า login ([src/app/(auth)/login/page.tsx](src/app/(auth)/login/page.tsx)), แสดงเฉพาะเมื่อ config ครบ
- env ใหม่: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAIL_DOMAIN`, `GOOGLE_AUTO_PROVISION_ROLE`
- **ตรวจสอบ:** `tsc` ✅ · `next build` (เพิ่ม 2 route) ✅ · smoke-test: start→307 ไป accounts.google.com (hd=suntisuk.ac.th, ตั้ง g_state), login มีปุ่ม, bad-state→`/login?error=google_state` ✅
- ⚠️ Google Console ต้องใส่ Authorized redirect URI = `<NEXT_PUBLIC_APP_URL>/api/auth/google/callback` (dev = `http://localhost:3000/...`)

### 2026-06-18 — เอกสาร + ตั้ง Stop hook บังคับอัปเดต log
- เพิ่มหัวข้อ "Session Log" นี้ใน `PROGRESS.md` พร้อมกติกา append รายการใหม่ไว้บนสุดทุกครั้ง
- ติดตั้ง Stop hook ใน [.claude/settings.json](.claude/settings.json): บล็อกการจบงานถ้า `PROGRESS.md`
  ไม่ถูกแก้ภายใน 20 นาที (loop-safe ด้วย `find -mmin`) — ผ่านความเห็นชอบจากผู้ใช้
- บันทึก memory ว่าใช้ภาษาไทย + ต้องอัปเดต PROGRESS.md ทุกครั้ง
- **ตรวจสอบ:** pipe-test คำสั่ง hook (สด→ปล่อยจบ, เก่า→บล็อก) ✅ · parse settings.json ด้วย node = valid ✅
- หมายเหตุ: ตอน session เริ่มยังไม่มีโฟลเดอร์ `.claude/` → ตัว watcher อาจยังไม่จับ hook จนกว่าจะเปิด `/hooks` หรือรีสตาร์ท

### 2026-06-18 — Phase 1 ตั้งต้นโปรเจกต์ทั้งหมด
- สร้างโปรเจกต์ Next.js 16 + TS + Tailwind v4 จากศูนย์, ติดตั้ง dependencies (Prisma 6, Radix, Zod 4, ฯลฯ)
- Design system (Purple/Yellow, light/dark), UI library ~20 ตัว, Prisma schema 12 models + seed
- Auth + RBAC (session, bcrypt, middleware), service/action layer, app shell
- หน้า Landing/Login/Settings + Teacher/Student/Admin ครบ + ระบบแลกคาบ + SSE realtime
- แก้บั๊ก `Button asChild` ส่ง child ซ้อนเข้า Radix Slot (landing 500)
- **ตรวจสอบ:** `tsc` ✅ · `next build` (22 routes) ✅ · smoke-test ทุกหน้า/ทุกบทบาท = 200, RBAC ✅, 0 errors
- เพิ่มเอกสาร: `PROGRESS.md`, `README.md`; ตั้งค่า `.gitignore` (เก็บ .env.example, ไม่เก็บ dev.db)
