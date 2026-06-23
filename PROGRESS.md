# ทุกการทำงานต้องบันทึกลงในนี้

# SPK School Platform — บันทึกความคืบหน้า (Progress Log)

> อัปเดตล่าสุด: 2026-06-21 · สถานะ: **Phase 1 เสร็จสมบูรณ์** — ผ่าน `tsc`, `next build`, และ smoke-test ทุกหน้า/ทุกบทบาท ✅

แอปพลิเคชันบริหารจัดการโรงเรียน (School Management Web App) ตามสเปกใน
[docs/PROMPT.md](docs/PROMPT.md) และ [docs/DESIGN.md](docs/DESIGN.md)

---

## 1. Tech Stack ที่ใช้จริง

| ส่วน | เทคโนโลยี |
|------|-----------|
| Framework | **Next.js 16** (App Router) + React 19 + TypeScript (monolith) |
| Styling | **Tailwind CSS v4** + ธีม Purple /Yellow + Light/Dark (`next-themes`) |
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

### 2026-06-23 — หน้าแจ้งเตือน: infinite scroll ทีละ 10 + กระดิ่ง navbar เลื่อนได้
- **โหลดทีละ 10 (infinite scroll)**: หน้าประวัติแจ้งเตือนโหลดหน้าแรก 10 รายการฝั่ง server แล้วโหลดเพิ่มอัตโนมัติเมื่อเลื่อนถึงท้ายลิสต์ (IntersectionObserver, rootMargin 200px) มีปุ่ม "โหลดเพิ่ม" สำรอง + spinner "กำลังโหลด…"
  - service: เพิ่ม `skip` ใน `getNotifications` + `getNotificationsPage()` (over-fetch +1 เพื่อรู้ `hasMore` โดยไม่ต้อง count ซ้ำ) ([notification.service.ts](src/server/services/notification.service.ts))
  - action: `loadNotificationsAction(skip)` + ค่าคงที่ `NOTIFICATIONS_PAGE_SIZE = 10` ([notification.actions.ts](src/server/actions/notification.actions.ts))
  - view ส่งหน้าแรก + `hasMore` เข้า feed ([notifications-view.tsx](src/components/notifications/notifications-view.tsx)); feed เขียนใหม่เป็น client infinite-scroll พร้อม de-dupe กัน id ซ้ำ + guard กันยิงซ้อน ([notification-feed.tsx](src/components/notifications/notification-feed.tsx))
- **กระดิ่ง navbar เลื่อนได้จริง**: เปลี่ยนจาก Radix `ScrollArea` (ที่ `max-h` ไม่ค่อย constrain viewport) เป็น native `div.max-h-[380px] overflow-y-auto overscroll-contain` ([notification-bell.tsx](src/components/notifications/notification-bell.tsx))
- **ตรวจสอบ**: `tsc` ✅ · ไม่แตะข้อมูลจริง

### 2026-06-23 — ตอบสนองไวขึ้น (optimistic UI) + loading skeleton + landing สวย + ลบ demo/dead code
- **Optimistic UI (แบบ Facebook)**: ติ๊กงาน/To-do ([student-todos.tsx](src/components/assignments/student-todos.tsx)) เด้งทันทีไม่รอ server — ยกสถานะ done ขึ้น parent เป็น override map, ติ๊กแล้วอัปเดต UI + progress bar ทันที แล้วยิง action เบื้องหลัง, ถ้า throw ค่อย rollback + toast (ปุ่มไม่ disable, มี active:scale-90) · หน้าแจ้งเตือน ([notification-feed.tsx](src/components/notifications/notification-feed.tsx)) เป็น optimistic อยู่แล้ว
- **Loading skeleton**: เพิ่ม [(app)/loading.tsx](src/app/(app)/loading.tsx) — โครงหน้า (header + stat cards + ตาราง) เด้งทันทีทุกครั้งที่เปลี่ยนหน้าในระบบ ทำให้รู้สึกว่าเว็บตอบสนองตลอด
- **Landing page ใหม่** ([page.tsx](src/app/page.tsx)): hero gradient + headline ไล่สี, การ์ดแยกตามบทบาท (ผู้ดูแล/ครู/นักเรียน), features 6 ช่อง (รวมฝากคาบ/มอบหมายงาน), CTA banner, ปุ่ม "ดูฟีเจอร์ทั้งหมด" (anchor)
- **Login**: ลบกล่อง "บัญชีทดลอง (Demo)" ออก ([login/page.tsx](src/app/(auth)/login/page.tsx))
- **ลบ dead code** (ยืนยัน 0 การอ้างอิงทั้ง src): `getTeacherDaySlots`, `getScheduleSlot` (schedule.service), `getPendingIncomingCount` (swap.service), `listStudents` (admin.service), `nextPeriodNo` + import `nextClassSlot` (timetable.ts), `titleCase`, `formatTime` (utils.ts)
- **ตรวจสอบ**: `tsc` ✅ · `next build` ✅ · ไม่แตะข้อมูลจริง

### 2026-06-23 — แก้ wizard แลกคาบ: ซ่อนครูที่ไม่มีคาบให้แลกได้จริง
- **ปัญหา**: ขั้นเลือกครู (โหมดแลกคาบ) โชว์ครูที่สอนห้องนั้นทุกคน แม้คาบของครูในห้องนั้นตรงกับเวลาที่ผู้ขอติดสอนทุกคาบ → เลือกไปก็ไม่มีคาบให้แลก แต่ชื่อยังขึ้น
- **แก้**: [swap-wizard.tsx](src/components/swap/swap-wizard.tsx) `eligibleTeachers` (โหมด swap) เพิ่มเงื่อนไขต้องมีคาบในห้องเดียวกัน **ที่ผู้ขอว่างในเวลานั้น** อย่างน้อย 1 คาบ (ใช้ `myBusy`) — ตรงกับ predicate ขั้นเลือกคาบ (step 3) และ validation ฝั่ง server (`assertSwapTeachersFree`) · โหมดฝากคาบไม่กระทบ (โชว์เฉพาะครูที่ว่างอยู่แล้ว ซึ่งฝากได้จริง)
- **ตรวจสอบ**: `tsc` ✅ · ยืนยันลำดับประกาศ `myBusy` (บรรทัด 100) มาก่อน `eligibleTeachers` (110) · ไม่แตะข้อมูลจริง

### 2026-06-23 — ครูทุกคนประกาศได้ + แก้บัค sidebar highlight ซ้อน 2 จุด
- **ครูทุกคนสามารถประกาศได้**: แยก logic สร้างประกาศ (+ fan-out แจ้งเตือนตาม audience) เป็น service กลาง `createAnnouncement(authorId, input)` ([admin.service.ts](src/server/services/admin.service.ts)) ใช้ร่วมกันทั้งแอดมิน+ครู · เพิ่ม `createTeacherAnnouncementAction` (requireTeacher) · ทำ [AnnouncementComposer](src/components/admin/announcement-composer.tsx) ให้รับ prop `action` (reuse ได้) · หน้าใหม่ [/teacher/announcements](src/app/(app)/teacher/announcements/page.tsx) + เมนูครู "ประกาศ" · ครูเลือก audience ได้ (ทุกคน/ครู/นักเรียน)
- **แก้บัค sidebar highlight 2 จุด**: เดิม logic ถือว่าเมนูที่ href เป็น prefix ของ path ก็ active → `/teacher/schedule` กับ `/teacher/schedule/manage` สว่างพร้อมกัน · แก้ [sidebar-nav.tsx](src/components/layout/sidebar-nav.tsx) ให้ active เฉพาะเมนูที่ href **ตรง/ยาวที่สุด** (most specific) อันเดียว
- **ตรวจสอบ**: `tsc` ✅ · `next build` (36 routes, +/teacher/announcements) ✅ · ไม่แตะข้อมูลจริง

### 2026-06-23 — Search bar ทุกหน้าจัดการข้อมูล + ครูแก้ไขได้ทุกวิชา
- **Search bar ทุกหน้าที่แก้ไขข้อมูลได้**: เพิ่ม [SearchBox](src/components/ui/search-box.tsx) (client) + helper `matchesQuery` ([utils.ts](src/lib/utils.ts), ค้นแบบหลายคำ AND, case-insensitive) — กรองในตารางทันทีฝั่ง client · ใส่ใน: แอดมิน ครู/วิชา/ห้อง/ตารางสอน/ผู้ดูแลระบบ (นักเรียนมี search เดิมแบบ server อยู่แล้ว) และฝั่งครู จัดการวิชา/จัดตารางสอน/นักเรียนในที่ปรึกษา (แยกตาราง 3 หน้าออกเป็น client component: [teacher-subject-table](src/components/teacher/teacher-subject-table.tsx), [own-schedule-table](src/components/teacher/own-schedule-table.tsx), [advisory-student-table](src/components/teacher/advisory-student-table.tsx))
- **ครูแก้ไขได้ทุกวิชา** (เดิมเฉพาะวิชาตัวเอง): [/teacher/subjects](src/app/(app)/teacher/subjects/page.tsx) เปลี่ยนชื่อเป็น "จัดการวิชา" แสดง+แก้ไข+ลบ **ทุกวิชาในระบบ** · service ตัดเงื่อนไข ownerTeacherId ออก (เหลือเช็คมีอยู่จริง + กันลบวิชาที่ยังถูกใช้) · ตอนจัดตารางเลือกได้ทุกวิชา (`assertSubjectAllowed` เช็คแค่มีอยู่จริง) · `ownerTeacherId` ยังบันทึกตอนสร้างแต่ไม่ใช้กั้นสิทธิ์แล้ว
- **ตรวจสอบ**: `tsc` ✅ · `next build` (35 routes) ✅ · ไม่แตะข้อมูลจริง

### 2026-06-23 — สิทธิ์/บทบาท: แอดมินจัดการแอดมิน, ครู self-service (วิชา/ตาราง), ครูที่ปรึกษา + แก้บัคบังคับรหัสผ่าน + มือถือ
- **#1 แก้บัค "แก้ไขข้อมูลแล้วบังคับเปลี่ยนรหัสผ่าน"**: ต้นเหตุ `Object.fromEntries(formData)` ส่ง `password: ""` แล้ว `passwordSchema.optional()` ปฏิเสธสตริงว่าง → เพิ่ม `optionalPasswordSchema` (preprocess "" → undefined) ใช้กับ teacher/student/admin — เว้นว่าง = คงรหัสเดิม
- **#2 แอดมินสร้าง/จัดการแอดมินได้**: หน้า [/admin/admins](src/app/(app)/admin/admins/page.tsx) + service `listAdmins/createAdmin/updateAdmin/deleteAdmin` (กันลบตัวเอง + กันลบแอดมินคนสุดท้าย) + แก้รหัสผ่านแอดมินได้ · เมนู "ผู้ดูแลระบบ" (icon ShieldCheck)
- **#3 เปลี่ยนอีเมลแอดมิน** → `admin@suntisuk.ac.th` (อัปเดต 1 แถว, non-destructive)
- **#5 ครูจัดการวิชา/ตารางของตัวเอง**: เพิ่ม `Subject.ownerTeacherId` (null = วิชากลางของแอดมิน) · หน้า [/teacher/subjects](src/app/(app)/teacher/subjects/page.tsx) แก้ได้เฉพาะวิชาที่ตนสร้าง · หน้า [/teacher/schedule/manage](src/app/(app)/teacher/schedule/manage/page.tsx) เพิ่ม/แก้/ลบคาบสอน **เฉพาะคาบของตนเอง** (teacherId ฝั่ง server เสมอ, `ownScheduleSchema` ไม่มี teacherId, เช็คครูไม่ชนคาบ) · เลือกได้เฉพาะวิชาตน+วิชากลาง
- **#6 ครูที่ปรึกษา**: `Teacher.advisorClassId @unique` (1:1 ครู↔ห้อง) ตั้งในฟอร์มครู (ฝั่งแอดมิน) · หน้า [/teacher/advisory](src/app/(app)/teacher/advisory/page.tsx) เพิ่ม/แก้/ลบนักเรียน **เฉพาะห้องที่ตนเป็นที่ปรึกษา** (classId ตรึงไว้, ย้ายนักเรียนออกไม่ได้) · ตารางครู (แอดมิน) โชว์คอลัมน์ครูที่ปรึกษา + กันตั้งห้องซ้ำ
- **ไฟล์ใหม่**: services `teacher-self.service.ts` · actions `admin-user.actions.ts`, `teacher-self.actions.ts` · UI ครู `own-subject-dialogs`, `own-schedule-dialogs`, `advisory-student-dialogs` + ตาราง/หน้า · เมนูครูเพิ่ม จัดตารางสอน/วิชาของฉัน/นักเรียนในที่ปรึกษา
- **UI ตามคำขอเพิ่ม**: เอา StatCard "คาบเรียนวันนี้/ต่อสัปดาห์" (นักเรียน) และ "คาบสอนวันนี้/ต่อสัปดาห์" (ครู) ออก เหลือเฉพาะที่จำเป็น (ตารางคงอยู่) · **ตารางมือถือใหม่** [timetable-mobile.tsx](src/components/timetable/timetable-mobile.tsx): มุมมองรายวันแบบ stacked (กดขยายวัน, วันนี้เปิดอัตโนมัติ, ไฮไลต์คาบปัจจุบัน, ไม่ต้องเลื่อนแนวนอน) แสดงบนจอเล็ก ส่วน md+ ใช้ตารางเดิม (โหมดเลือกคาบใน wizard ยังใช้ตารางกว้าง)
- **ตรวจสอบ (ไม่แตะข้อมูลจริง)**: `tsc` ✅ · `next build` (35 routes, +/admin/admins, +/teacher/{subjects,schedule/manage,advisory}) ✅ · unit-test validations 8 เคส (blank password→undefined, รหัสสั้นยังถูกปฏิเสธ, ownSchedule ไม่มี teacherId ฯลฯ) + นับ DB read-only ผ่าน ✅ · ข้อมูลครบ: นักเรียน 2 / ครู 31 / วิชา 123 / ห้อง 21 / ตาราง 484 · อีเมลแอดมิน = admin@suntisuk.ac.th ✅
- **หมายเหตุ**: ไม่ได้รัน create/update จริงที่เขียนข้อมูล/แจ้งเตือนผู้ใช้จริง — เทสต์เฉพาะ schema/build + อ่าน DB · **ต้อง restart dev server** (Prisma client มีฟิลด์ใหม่ ownerTeacherId/advisorClassId)

### 2026-06-23 — ตารางสอนห้องกลุ่ม (/3) auto-expand ไปยังห้องย่อย (/3.1, /3.2)
- **เหตุผล/คำสั่งผู้ใช้**: ห้องเรียนกลุ่ม เช่น `ม.5/3` หมายถึงนักเรียนทุกห้องย่อย (`ม.5/3.1`, `ม.5/3.2` ...) เรียนรวมกัน ต้องการให้ระบบ auto-expand คาบของห้องกลุ่มไปยังทุกห้องย่อยโดยอัตโนมัติ
- **แก้ไข**:
  - [src/server/services/admin.service.ts](src/server/services/admin.service.ts): เพิ่ม `expandClassGroupIds()` + ปรับ `syncSchedules()` ให้ขยายแถวที่ชื่อห้องเป็นกลุ่ม (ไม่มี `.x`) ไปสร้าง/อัปเดตตารางให้ทุกห้องย่อยที่มีอยู่จริง
  - `getImportLookups()` คืนค่า `classes`/`classById` เพิ่งใช้หา group
  - สร้างสคริปต์ [scripts/expand-group-schedules.mjs](scripts/expand-group-schedules.mjs) สำหรับขยายข้อมูลตารางเรียนเดิมใน DB ครั้งเดียว
- **ผลลัพธ์ใน DB จริง**: ขยายคาบของ `ม.4/3`, `ม.5/3`, `ม.6/3` ไปยังห้องย่อยแล้ว (สร้าง 110 แถวใหม่ ข้าม 419 แถวที่มีอยู่แล้ว)
- **ตรวจสอบ**: `npx tsc --noEmit` ✅ · `npm run build` ผ่าน ✅

### 2026-06-23 — แก้รายชื่อนักเรียนในหน้าสั่งงานรายบุคคลเลื่อนไม่ได้
- **ปัญหา**: ผู้ใช้รายงานว่าเลือกนักเรียนรายบุคคลใน dialog สั่งงานแล้วรายชื่อเลื่อนไม่ได้
- **แก้ไข**: [src/components/assignments/assignment-create-dialog.tsx](src/components/assignments/assignment-create-dialog.tsx) — เปลี่ยนรายชื่อนักเรียนจาก `div` ที่ใช้ `max-h-44 overflow-y-auto` เป็น `<ScrollArea className="h-44">` (Radix ScrollArea) ซึ่งรองรับการเลื่อนทั้ง mouse wheel และ touch ได้ดีกว่า
- **ตรวจสอบ**: `npx tsc --noEmit` ✅ · `npm run build` ผ่าน ✅

### 2026-06-23 — ทำให้เปลี่ยนหน้าเร็วขึ้น (non-blocking shell + prefetch sidebar)
- **เหตุผล/คำสั่งผู้ใช้**: ต้องการให้เปลี่ยนหน้าทันทีเมื่อกด sidebar แล้วเนื้อหาโหลดทีหลัง ไม่ต้องรอข้อมูล
- **แก้ไข**:
  - [src/app/(app)/layout.tsx](src/app/(app)/layout.tsx): เลิก `await` ข้อมูลการแจ้งเตือนใน root layout แทนด้วย `<Suspense>` ผ่าน `NotificationBellLoader` — shell แสดงทันที ส่วนกระดิ่งโหลดทีหลัง
  - [src/components/notifications/notification-bell-loader.tsx](src/components/notifications/notification-bell-loader.tsx): async server component ดึง notifications/unread พร้อม skeleton fallback
  - [src/components/layout/app-shell.tsx](src/components/layout/app-shell.tsx): รับ prop `bell` เป็น React node แทนการรับข้อมูลสำเร็จรูป
  - [src/components/layout/sidebar-nav.tsx](src/components/layout/sidebar-nav.tsx): เพิ่ม `prefetch` ให้ Link ทุกเมนูใน sidebar เพื่อให้ Next.js โหลด route ล่วงหน้า กดแล้วเปลี่ยนหน้าทันที
- **ตรวจสอบ**: `npx tsc --noEmit` ✅ · `npm run build` ผ่าน ✅

### 2026-06-23 — แก้/ป้องกันอาการกด sidebar/หน้าเว็บไม่ได้บางครั้ง (service worker migration)
- **ปัญหา**: ผู้ใช้รายงานว่าบางครั้งกดเปลี่ยนหน้าใน sidebar ไม่ได้ หรือกดอะไรในหน้าไม่ได้เลย อาการคล้ายบัค service worker ที่เคยแก้ไว้ (SW เก่ายัง control หน้าอยู่ / RSC fetch ถูกยุ่ง)
- **แก้ไข**:
  - [public/sw.js](public/sw.js): bump `sw-version` → 5 และเพิ่ม bail สำหรับ React Server Component fetches (`RSC: 1` หรือ `Accept: text/x-component`) ให้ SW ไม่ยุ่งกับ soft navigation ของ Next.js
  - [src/components/pwa/service-worker-register.tsx](src/components/pwa/service-worker-register.tsx): ฟัง `controllerchange` ถ้า SW เปลี่ยน controller กลางเซสชันให้ reload หนึ่งครั้ง (sessionStorage กัน loop) เพื่อขับไล่ SW เก่าที่ยัง control หน้าอยู่
- **ขั้นตอนผู้ใช้**: ถ้ายังเจออาการ ให้ **Unregister Service Worker** ใน DevTools → Application → Service Workers → แล้วกด Reload (หรือบนมือถือปิดแท็บ/แอปแล้วเข้าใหม่) เพื่อให้ SW v5 ควบคุมหน้าตั้งแต่ต้น
- **ตรวจสอบ**: `npx tsc --noEmit` ✅ · `npm run build` ผ่าน ✅

### 2026-06-22 — ปรับกระดิ่งแจ้งเตือน navbar แสดง 10 รายการ + ลิงก์ไปประวัติ
- **เหตุผล/คำสั่งผู้ใช้**: กระดิ่ง navbar ควร fetch แค่ 10 การแจ้งเตือนล่าสุด และมีปุ่ม "ดูเพิ่มเติม" เพื่อไปหน้าประวัติการแจ้งเตือน
- **แก้ไข**:
  - [src/app/(app)/layout.tsx](src/app/(app)/layout.tsx): เปลี่ยน `getNotifications(user.id, { take: 20 })` → `take: 10`
  - [src/components/notifications/notification-bell.tsx](src/components/notifications/notification-bell.tsx): รับ prop `role`, ตัดรายการที่แสดง/เก็บสถานะเหลือ 10 รายการ, เพิ่ม footer ลิงก์ `/{role}/notifications`
  - [src/components/layout/app-shell.tsx](src/components/layout/app-shell.tsx): ส่ง `role` เข้า `NotificationBell`
  - สร้างหน้า [src/app/(app)/admin/notifications/page.tsx](src/app/(app)/admin/notifications/page.tsx) เพื่อให้แอดมินก็มีหน้าประวัติแจ้งเตือนได้
- **ตรวจสอบ**: `npx tsc --noEmit` ✅ · `npm run build` ผ่าน (route `/admin/notifications` เพิ่มขึ้น) ✅

### 2026-06-22 — แก้ build พัง: "Only async functions are allowed to be exported in a 'use server' file"
- **ปัญหา**: `npm run build` ล้มด้วยข้อความ `Export markNotificationReadAction doesn't exist in target module` + stack trace ชี้ `src/server/actions/notification.actions.ts:13` · สาเหตุจริงคือ `export const NOTIFICATIONS_PAGE_SIZE = 10` อยู่ในไฟล์ `"use server"` ซึ่ง Next.js 16/Turbopack อนุญาตให้ export แค่ async functions เท่านั้น
- **แก้ไข**: ย้าย `NOTIFICATIONS_PAGE_SIZE` ไปอยู่ใน [src/lib/constants.ts](src/lib/constants.ts) · [src/server/actions/notification.actions.ts](src/server/actions/notification.actions.ts) import กลับมาใช้และ export แต่ async functions · [src/components/notifications/notifications-view.tsx](src/components/notifications/notifications-view.tsx) import ค่าจาก constants แทน
- **ตรวจสอบ**: `npx tsc --noEmit` ✅ · `npm run build` ผ่าน 33 routes ✅

### 2026-06-22 — แก้ Excel Sync ตารางสอนข้ามทุกแถว (teacherCode ขาดเลข 0 นำ)
- **ปัญหา**: ผู้ใช้อัปโหลด `schedules.xlsx` แล้วระบบรายงานข้ามหมด (skipped 484/484) · ตรวจสอบพบว่าไฟล์มี `teacherCode` เป็นเลข เช่น `101`, `202` แต่ฐานข้อมูลเก็บรหัสครูเป็น 4 หลัก `0101`, `0202` · การ lookup `teacherByCode` จึงพลาดทุกแถว
- **แก้ไข**: [src/server/services/admin.service.ts](src/server/services/admin.service.ts) `syncSchedules` — ถ้าหา `teacherCode` ตรง ๆ ไม่เจอ ให้ลอง fallback เป็นรหัสที่เติมเลข 0 นำจนครบ 4 หลัก (เฉพาะค่าที่เป็นตัวเลข) ก่อนข้ามแถว
- **ตรวจสอบ**: `npx tsc --noEmit` ✅ · ทดสอบ mapping กับไฟล์ `schedules.xlsx` + ฐานข้อมูลปัจจุบัน: 484 แถว match ครบ ✅

### 2026-06-22 — ยกเครื่องระบบแลกคาบ + ฝากคาบ (เฉพาะสัปดาห์เดียว, ไม่ถาวร, overlay ไม่แตะข้อมูลจริง)
- **เหตุผล/คำสั่งผู้ใช้**: "ทำต่อให้เสร็จ ไม่ต้องถาวร แค่สัปดาห์เดียว" — ปิดงานชุดใหญ่ที่ค้าง: #5 แลกคาบเฉพาะสัปดาห์ + เลือกวันที่, #6 ฝากคาบ, #3 server validation สองทาง
- **หลักการสำคัญ — Non-destructive overlay**: เลิกแก้ตาราง `Schedule` จริงตอนอนุมัติ (เดิม approve จะ swap `day/period` ถาวร) → เปลี่ยนเป็น **overlay คำนวณตอนอ่าน** ใช้ผลเฉพาะ "สัปดาห์ที่เลือก" เท่านั้น สัปดาห์ถัดไปกลับเป็นปกติอัตโนมัติ ฐานข้อมูลไม่ถูกแตะ
- **Schema** ([prisma/schema.prisma](prisma/schema.prisma)): `SwapRequest.weekStart String?` (จันทร์ของสัปดาห์ที่มีผล) + โมเดลใหม่ `Delegation` (ฝากคาบ: weekStart/scheduleId/from/to/status ACTIVE|DECLINED|CANCELLED) — `db push` ผ่านแบบ **ไม่ต้อง --accept-data-loss** (เพิ่มคอลัมน์ nullable + ตารางใหม่ ปลอดภัย)
- **Domain ใหม่** [src/lib/weekly-overlay.ts](src/lib/weekly-overlay.ts): `applySwaps` (ย้าย day/period ของสองคาบ + mark "สลับคาบ") / `applyDelegations` (มุมมองห้อง=โชว์ครูคุมแทน, เจ้าของ="ฝากออก", ผู้รับ="รับฝากคาบ") — pure functions + `SlotMark` ใน [timetable.ts](src/lib/timetable.ts)
- **Engine** [src/server/services/effective-schedule.service.ts](src/server/services/effective-schedule.service.ts): `getClassEffective` / `getTeacherEffective` — ดึง overlay ของสัปดาห์ปัจจุบันมาประกอบเป็นตาราง + marks (teacher view inject คาบคู่สลับ + คาบที่รับฝาก)
- **#3 both-free**: [swap.service.ts](src/server/services/swap.service.ts) `assertSwapTeachersFree` — ตรวจ **ทั้งสองครูต้องว่าง** ที่คาบปลายทางของกันและกัน (ตอนสร้าง + ตอนอนุมัติ) · กันสัปดาห์อดีต · approve/revert ไม่แตะ Schedule แล้ว · ลบ `getSwapMarks`/`exchangeDayPeriod`
- **#6 ฝากคาบ** [delegation.service.ts](src/server/services/delegation.service.ts) + [delegation.actions.ts](src/server/actions/delegation.actions.ts): สร้าง (เช็คครูปลายทางว่าง) / ยกเลิก (เจ้าของ) / ปฏิเสธ (ผู้รับ) + แจ้งเตือนครู+นักเรียนในห้อง
- **Wizard** [swap-wizard.tsx](src/components/swap/swap-wizard.tsx): รองรับ 2 โหมด — `swap` (5 ขั้น: สัปดาห์→คาบเรา→ครู→คาบครู→ยืนยัน) / `delegate` (4 ขั้น: สัปดาห์→คาบเรา→ครูที่ว่าง→ยืนยัน) · ขั้นแรกเลือกวันที่/สัปดาห์ · กรองครูตามเงื่อนไขทั้งสองทาง
- **UI/หน้าใหม่**: [/teacher/delegations](src/app/(app)/teacher/delegations/page.tsx) (แท็บ รับฝาก/ฝากไป) + [/teacher/delegations/new](src/app/(app)/teacher/delegations/new/page.tsx) + [delegation-list.tsx](src/components/swap/delegation-list.tsx) · ปุ่ม "ฝากคาบ" ในหน้าตารางสอน · เมนู "ฝากคาบสอน" (icon Share2) · grid แสดง badge ม่วง=ฝากคาบ / เหลือง=สลับ · หน้าตารางครู/นักเรียน + แดชบอร์ดนักเรียนใช้ effective schedule
- **ตรวจสอบ (ไม่แตะข้อมูลจริง)**: `tsc` ✅ · `next build` (33 routes, +delegations ×2) ✅ · unit-test pure overlay 12 เคสผ่านหมด (swap/delegation ทุกมุมมอง + ฐานไม่ถูก mutate) ✅ · นับ DB read-only: นักเรียน 2 / ตาราง 458 / swap 0 / delegation 0 — ข้อมูลครบ ไม่มี swap ตกค้างที่เคย mutate ตาราง ✅
- **หมายเหตุ**: ไม่ได้รัน createSwap/createDelegation จริง (จะ push แจ้งเตือนผู้ใช้จริง) — เทสต์เฉพาะ logic บริสุทธิ์ + build/type · **ต้อง restart dev server** เพราะ Prisma client มีโมเดลใหม่

### 2026-06-22 — หน้าแลกคาบเป็น wizard เต็มหน้า (เลิก modal ที่ตารางล้น)
- **เหตุผล**: ผู้ใช้รายงานว่า modal ขอแลกคาบแคบ ตารางล้น เลื่อนยาก — อยากได้แบบทีละหน้า (เหมือน wizard Windows / login Google)
- **ทำ**: สร้าง [swap-wizard.tsx](src/components/swap/swap-wizard.tsx) — **full-page stepper 4 ขั้น** (เลือกคาบของคุณ → เลือกครู → เลือกคาบของครู → ยืนยัน) มีปุ่มถัดไป/ย้อนกลับ + แถบ step indicator, ตารางเต็มความกว้างหน้า ไม่อึดอัด · หน้าใหม่ [/teacher/swaps/new](src/app/(app)/teacher/swaps/new/page.tsx) · ปุ่ม "ขอแลกคาบสอน" ในหน้า /teacher/schedule + /teacher/swaps เปลี่ยนเป็นลิงก์ไปหน้า wizard
- **ปรับ logic บางส่วน (เกริ่น #3)**: ขั้นเลือกครู แสดงเฉพาะครูที่สอนห้องนั้น **และว่างในคาบต้นทาง** (กรองครูที่แลกไม่ได้ออก)
- **ลบไฟล์ที่ไม่ใช้แล้ว**: `swap-request-dialog.tsx` (modal เดิม), `week-cards.tsx` (มือถือใช้ grid transpose แทนแล้ว)
- **ตรวจสอบ**: `tsc` ✅ · `next build` (29 routes, +/teacher/swaps/new) ✅ · /teacher/swaps/new ไม่ล็อกอิน → 307 ไป login ปกติ ✅
- **ยังเหลือ (swap overhaul)**: #5 แลกเฉพาะ 1 สัปดาห์ + เลือกวันที่, #6 ฝากคาบ, #3 ส่วน server validation + เงื่อนไขสองทาง (A ต้องว่างคาบของ B ด้วย) — ต้องเพิ่ม DB model per-week

### 2026-06-22 — แก้ไขข้อมูลไม่บังคับเปลี่ยนรหัส + ออกแบบตารางใหม่ + fix preview ไฟล์ (ชุดที่ 1 ของลิสต์ใหญ่)
- **#1 แก้ไม่บังคับเปลี่ยนรหัส**: คอมโพเนนต์ใหม่ [readonly-field.tsx](src/components/admin/readonly-field.tsx) (โชว์ค่า disabled + hidden input ส่งค่าเดิม) — ใช้กับ รหัสครู/รหัสนักเรียน/รหัสวิชา ในฟอร์มแก้ไข → แก้ฟิลด์อื่นได้โดยรหัสไม่เปลี่ยน
- **#2 ตารางใหม่ (transpose)**: เขียน [timetable-grid.tsx](src/components/timetable/timetable-grid.tsx) ใหม่ — **วัน=แถว, คาบ=คอลัมน์**, เส้นตารางทุกเซลล์ชัด (border-collapse), คาบว่างแสดง "คาบว่าง" (prop `emptyCell="free"|"blank"`), คอลัมน์คาบพัก/โฮมรูมแสดงเป็นหัวคอลัมน์, แถววันนี้/คาบปัจจุบันไฮไลต์, รองรับ dayRemap (สลับวัน) · หน้านักเรียนใช้ grid เดียวทุกขนาดจอ (เลื่อนแนวนอนบนมือถือ → เห็นคาบว่างครบ) เลิกใช้ WeekCards
- **#4 (บางส่วน)**: หน้าขอแลกคาบส่งช่องว่างเป็น `emptyCell="blank"` (ไม่โชว์คำว่า "ว่าง")
- **#7 preview ไฟล์**: [attachment-list.tsx](src/components/attachments/attachment-list.tsx) — รูปไม่ล้นกรอบ/จอแล้ว (`max-w-full max-h-[75vh] object-contain` + กล่อง `w-[95vw]`), PDF ใช้ `<object>`+iframe สูง `h-[80vh]` เลื่อนดูครบทุกหน้า, responsive
- **ตรวจสอบ**: `tsc` ✅ · `next build` (28 routes) ✅
- **ยังไม่ทำ (ก้อนใหญ่ถัดไป — ยกเครื่องระบบแลกคาบ)**: #3 ตรรกะแลกคาบใหม่ (ทั้งสองฝ่ายต้องว่างคาบของอีกฝ่าย + ซ่อนครูที่แลกไม่ได้), #5 แลกเฉพาะ 1 สัปดาห์ (เลือกวันที่ก่อนทำรายการ → ระบบหาสัปดาห์), #6 ระบบฝากคาบ (มอบคาบให้ครูที่ว่างมาคุมแทนโดยไม่แลก + ขึ้นป้ายในตารางครู/นักเรียน), #4 รื้อ layout หน้าแลกคาบ — ต้องเพิ่ม DB model ใหม่ (per-week per-period swap/delegation) + คำนวณตารางผลลัพธ์รายสัปดาห์

### 2026-06-22 — เลขที่นักเรียน (เรียง+กันซ้ำในห้อง) + performance (pagination/lazy/cache)
- **เลขที่**: เพิ่ม `Student.rollNumber Int?` + `@@unique([classId, rollNumber])` ([schema.prisma](prisma/schema.prisma), db push --accept-data-loss, ข้อมูลจริงไม่หาย) — กันซ้ำในห้องระดับ DB (NULL ยังซ้ำได้) · validation `studentSchema` +rollNumber (preprocess ""→undefined, coerce, >0) · service: เก็บตอน create/update + `assertRollFree()` แจ้ง "เลขที่ X มีอยู่แล้วในห้องนี้" + เรียงทุก list ตาม (class, rollNumber, code) + คอลัมน์ export/import · action `studentDupMessage()` โชว์ข้อความซ้ำที่เข้าใจง่าย
- **UI เลขที่**: ช่อง "เลขที่" ในฟอร์มเพิ่ม/แก้นักเรียน, คอลัมน์ "เลขที่" ในตาราง ([student-table.tsx](src/components/admin/student-table.tsx)), แสดง+เรียงเลขที่ในตัวเลือกผู้รับงาน ([assignment-create-dialog.tsx](src/components/assignments/assignment-create-dialog.tsx)) + รายชื่อส่งงาน ([teacher-assignments-board.tsx](src/components/assignments/teacher-assignments-board.tsx))
- **Performance**: หน้านักเรียนเปลี่ยนเป็น **server-side pagination + search** — `listStudentsPaged({page,pageSize,q})` (count+skip/take) + คอมโพเนนต์ใช้ซ้ำ [list-controls.tsx](src/components/admin/list-controls.tsx) (`ListSearch`/`PaginationBar` ผ่าน searchParams) · **lazy-load** รูปไฟล์แนบ (`loading="lazy"`+`decoding="async"`) · **cache** ไฟล์ผ่าน header `Cache-Control: private, max-age=3600` (มีอยู่แล้วใน /api/files/[id])
- **ตรวจสอบ**: `tsc` ✅ · `next build` (28 routes) ✅ · ทดสอบ DB: สร้างเลขที่ 99 → สร้างซ้ำในห้องเดิมถูกปฏิเสธ P2002, เรียงตามเลขที่ถูก, ลบ test สะอาด (ข้อมูลจริงไม่แตะ) ✅ · prod server: /admin/students = 200 มีคอลัมน์เลขที่+ค้นหา+pagination, `?q=&page=2` = 200 ✅
- หมายเหตุ: เลขที่ที่ยังไม่ตั้ง (NULL) จะเรียงขึ้นก่อน (nulls-first ของ SQLite) — ตั้งครบแล้วเรียงสวย · **ต้อง restart dev server** (Prisma client เก่าใน memory)

### 2026-06-22 — (พัก) เริ่มฟีเจอร์ "เลขที่นักเรียน" + ผู้ใช้สั่ง /compact
- ยังไม่ได้แก้โค้ด — วางแผนใน todo list เสร็จแล้วหยุดที่จุดสะอาดเพื่อให้ระบบย่อ context
- **แผนถัดไป**: เพิ่ม `Student.rollNumber Int?` + `@@unique([classId, rollNumber])` (กันซ้ำในห้อง) → validation `studentSchema` +rollNumber → service เก็บ+เช็คซ้ำ+เรียงตามเลขที่+คอลัมน์ import/export → UI ฟอร์มเพิ่ม/แก้นักเรียน + คอลัมน์ตาราง + แสดง/เรียงเลขที่ในตัวเลือกผู้รับงาน/รายชื่อส่งงาน

### 2026-06-22 — ดูไฟล์แนบเป็น card/modal ในแอป (แทนการเปิด URL ไฟล์)
- **เหตุผล**: เดิมกดดูรูป/ไฟล์เปิด `/api/files/[id]` ในแท็บใหม่ → บนมือถือ/PWA เด้งออกไปแล้วกดย้อนกลับไม่ได้
- **แก้**: เปลี่ยน [attachment-list.tsx](src/components/attachments/attachment-list.tsx) เป็น client component + lightbox (Radix Dialog) — รูปแสดง `<img>` แบบ contain, PDF แสดงใน `<iframe>`, ปิดด้วยปุ่ม ×/แตะนอก/ESC (ไม่มี navigation = back ไม่พัง) + ปุ่มดาวน์โหลด · เพิ่ม `onRemove` ใช้แทนบล็อกลบไฟล์เดิมใน [student-todos.tsx](src/components/assignments/student-todos.tsx)
- **ตรวจสอบ**: `tsc` ✅ · `next build` (28 routes) ✅

### 2026-06-22 — ระบบมอบหมายงาน + To-do (ครู↔นักเรียน) พร้อมแนบไฟล์
- **เหตุผล**: ครูต้องมอบหมายงานให้นักเรียนเป็น to-do (แนบรูป/PDF, หัวข้อ+รายละเอียด, กำหนดส่ง) ทั้งห้องหรือรายคน; นักเรียนติ๊กเสร็จ/อัปโหลดไฟล์ส่ง + สร้าง to-do ของตัวเอง + บาร์ %ความคืบหน้า + เรียงลำดับได้
- **DB** ([schema.prisma](prisma/schema.prisma)) 4 model: `Assignment` (งานที่ครูสั่ง), `AssignmentSubmission` (สถานะ+ไฟล์ส่งของนักเรียนแต่ละคน, unique[assignment,student]), `PersonalTodo` (to-do ส่วนตัวนักเรียน), `Attachment` (เก็บ **bytes ใน DB** — พกพา SQLite↔Postgres, ทำงานหลัง proxy) · `db push` แล้ว
- **ไฟล์**: route handler [POST /api/files](src/app/api/files/route.ts) (อัปโหลด, จำกัด ≤10MB + เฉพาะ image/PDF, เลี่ยงลิมิต 1MB ของ server action) + [GET /api/files/[id]](src/app/api/files/[id]/route.ts) (เสิร์ฟพร้อม **access control**: เจ้าของ/ครูเจ้าของงาน/นักเรียนที่ได้รับงาน) · service [attachment.service.ts](src/server/services/attachment.service.ts) · helper [lib/attachment.ts](src/lib/attachment.ts)
- **Service/Action**: [assignment.service.ts](src/server/services/assignment.service.ts) (สร้างงาน+materialise submission ต่อคน, แจ้งเตือนนักเรียน type `ASSIGNMENT`, progress ต่อห้อง) + [todo.service.ts](src/server/services/todo.service.ts) (รวม assigned+personal, toggle, submit, CRUD personal) + actions [assignment.actions.ts](src/server/actions/assignment.actions.ts)/[todo.actions.ts](src/server/actions/todo.actions.ts)
- **UI ครู** [/teacher/assignments](src/app/(app)/teacher/assignments/page.tsx): แยกตามห้อง, การ์ดงาน+บาร์ความคืบหน้า+ดูรายชื่อ/ไฟล์ที่ส่ง, dialog สร้างงาน (ทั้งห้อง/เลือกรายคน + แนบไฟล์ + กำหนดส่ง) · **UI นักเรียน** [/student/todos](src/app/(app)/student/todos/page.tsx): บาร์ %รวม, เรียงตาม (ใหม่สุด/เก่าสุด/ใกล้กำหนดส่ง), ติ๊กเสร็จ, อัปโหลดส่งงาน, สร้าง/แก้/ลบ to-do ตัวเอง · เพิ่มเมนู nav ทั้งสองฝั่ง (icon ClipboardList) + ไอคอนแจ้งเตือน ASSIGNMENT
- **ตรวจสอบ**: `tsc` ✅ · `next build` (28 routes, +/teacher/assignments +/student/todos +/api/files) ✅ · ทดสอบไฟล์ครบลูป (upload→download bytes ตรง, .txt ถูกปฏิเสธ 400, ไม่ล็อกอิน 401, ลบ orphan สะอาด) ✅ · query อ่านของทั้งสองหน้ารันบน DB จริงไม่ error ✅
- หมายเหตุ: ไม่ได้รัน createAssignment จริง (จะยิง push เข้านักเรียนจริงทุกคน) · **ต้อง restart dev server** (Prisma client เก่าใน memory ไม่รู้จัก model ใหม่ → หน้าใหม่จะ 500 จนกว่าจะ restart)

### 2026-06-22 — แจ้งเตือนเมื่อสลับคาบทั้งวัน
- **เหตุผล**: เมื่อแอดมินสลับคาบทั้งวัน (เช่น จันทร์ ↔ อังคาร) ต้องแจ้งเตือนผู้เกี่ยวข้อง
- **ทำ**: เพิ่ม `notifyDaySwap()` ใน [day-swap.service.ts](src/server/services/day-swap.service.ts) เรียกหลัง `createDaySwap` → ส่งแจ้งเตือน type `SCHEDULE_CHANGED` ให้ครู + นักเรียนทั้งโรงเรียน (school-wide เพราะกระทบทุกห้อง) ผ่าน `notifyUsers` (ได้ทั้ง SSE realtime + web push อัตโนมัติ) · ข้อความ: "สัปดาห์ 22 มิ.ย. – 26 มิ.ย.: สลับตารางทั้งวัน จันทร์ ↔ อังคาร (หมายเหตุ)" · ครู→/teacher/schedule, นักเรียน→/student/schedule
- **ตรวจสอบ**: `tsc` ✅ · `next build` (26 routes) ✅ · ทดสอบ format ข้อความถูกต้อง ✅ · ไม่ได้รัน createDaySwap จริงเพราะจะยิง push เข้าอุปกรณ์ผู้ใช้จริงทุกคน (เลี่ยง side effect)

### 2026-06-22 — แก้บัค "เข้าเว็บแล้วกดอะไรไม่ได้ ต้องรีเฟรชก่อน" (service worker)
- **อาการ**: เข้าเว็บครั้งแรกแล้วคลิกไม่ได้ทั้งหน้า ต้องรีเฟรชจึงใช้ได้ + log เจอ `Failed to fetch RSC payload … Load failed`
- **สาเหตุ**: [public/sw.js](public/sw.js) เรียก `self.clients.claim()` ตอน activate → SW เข้าควบคุมหน้าที่เปิดอยู่ "กลางคัน" ระหว่าง Next.js App Router กำลัง hydrate → controller เปลี่ยนระหว่างทาง ทำให้ router/อีเวนต์ค้าง จนกดไม่ได้; พอรีเฟรช SW คุมหน้าตั้งแต่แรกจึงปกติ
- **แก้**: เอา `clients.claim()` ออก (push ไม่ต้องใช้ — ผูกกับ registration/subscription ไม่ใช่การคุมหน้า), คง `skipWaiting` ไว้ (อัปเดตลงรอบโหลดถัดไป), เพิ่ม bail สำหรับ `request.mode === "navigate"` กันชัวร์ไม่ให้ SW ยุ่งกับ navigation/RSC, bump sw-version → 4
- **ตรวจสอบ**: `node --check public/sw.js` ✅ · `next build` ✅ — *ทดสอบ browser จริงไม่ได้ในที่นี้ แต่แก้ตรงสาเหตุที่ตรงกับอาการ (เกิดเฉพาะโหลดแรก/รีเฟรชหาย) + หลักฐานใน log*
- **⚠️ ต้อง redeploy + ผู้ใช้เข้าเว็บอีกครั้งหนึ่ง** ให้ SW v4 มาแทน v3 (เครื่องที่ติด v3 อยู่จะหายหลังโหลดถัดไปที่ v4 คุมหน้า)

### 2026-06-22 — สลับคาบทั้งวัน เฉพาะสัปดาห์ที่เลือก (เช่น จันทร์ ↔ อังคาร)
- **เหตุผล**: ต้องการสลับตารางทั้งวันของสองวันชั่วคราว เฉพาะสัปดาห์ที่เลือก (ไม่ถาวร) มีผลทุกห้องเรียน — คนละอย่างกับแลกคาบของครู (รายคาบ) และ bell override (เวลา); อันนี้คือ "วันไหนใช้ตารางของวันไหน"
- **DB**: model ใหม่ `DaySwap` ([schema.prisma](prisma/schema.prisma)) — `{ weekStart (จันทร์ของสัปดาห์), dayA, dayB, note }` · `db push` แล้ว (ไม่ทำลายข้อมูล)
- **Logic (client-safe)**: [src/lib/day-swap.ts](src/lib/day-swap.ts) — `weekStartOf`, `weekdayOf`, `effectiveDayFor`, `buildDayRemap`, `weekRangeLabel` (เลขวันที่แบบ local ไม่เพี้ยน timezone)
- **Service/Actions**: [day-swap.service.ts](src/server/services/day-swap.service.ts) (`getWeekSwaps`, `getDayRemap`, `listUpcomingDaySwaps`, create กันวันซ้ำในสัปดาห์เดียว, delete) + [day-swap.actions.ts](src/server/actions/day-swap.actions.ts)
- **Admin UI**: [day-swap-manager.tsx](src/components/admin/day-swap-manager.tsx) บนหน้า `/admin/periods` — เลือกสัปดาห์ (input date → คำนวณช่วงจันทร์–ศุกร์) + เลือก 2 วัน + หมายเหตุ + รายการสลับที่จะถึง (ลบได้)
- **มีผลกับมุมมองจริง**: dashboard ครู/นักเรียน (ตารางวันนี้/คาบถัดไป/นับคาบวันนี้ ใช้ `effectiveDay`) + ตารางสัปดาห์ (grid/WeekCards รับ `dayRemap` → คอลัมน์วันที่สลับโชว์ตารางอีกวัน + badge "สลับ · ใช้ตาราง…") + แบนเนอร์ [day-swap-banner.tsx](src/components/timetable/day-swap-banner.tsx) บอก "วันนี้เรียนตามตารางวัน X"
- **ตรวจสอบ**: `tsc` ✅ · `next build` (26 routes) ✅ · unit: MON↔TUE remap (จ→อ, อ→จ, พ ไม่เปลี่ยน, เสาร์-อาทิตย์ = null) ✅ · DB round-trip create→read→delete ✅ · prod server สะอาด: login admin → /admin/periods = 200 เห็นส่วน "สลับคาบทั้งวัน" + รายการ swap (ช่วงสัปดาห์+note) ✅
- **⚠️ ผู้ใช้ต้อง restart dev server**: dev server ที่รันค้างอยู่ (เริ่มก่อน `prisma generate` รอบ DaySwap) ใช้ Prisma client เก่าใน memory → `/admin/periods` ขึ้น 500 จนกว่าจะ restart (ทดสอบบน server ใหม่แล้ว 200 ปกติ)

### 2026-06-22 — เพิ่มคำนำหน้า (title) ให้นักเรียน
- **เหตุผล**: นักเรียนยังไม่มีฟิลด์คำนำหน้า (ครูมี `Teacher.title` อยู่แล้ว) — ทำให้เหมือนกัน
- **DB**: เพิ่ม `title String?` ใน model `Student` ([schema.prisma](prisma/schema.prisma)) · `db push` แล้ว (ไม่ทำลายข้อมูล)
- **แก้ตามแพตเทิร์นครูทุกจุด**: `studentSchema` +title ([validations.ts](src/lib/validations.ts)) · `createStudent`/`updateStudent`/`exportStudents`(+คอลัมน์)/`syncStudents`(+parse) ([admin.service.ts](src/server/services/admin.service.ts)) · ฟอร์ม add/edit นักเรียน (FormField "คำนำหน้า") · `StudentRow`+ตาราง (แสดงคำนำหน้านำหน้าชื่อ) · หน้า students map title · คอลัมน์ import/export ใน data-sync
- **ตรวจสอบ**: `tsc` ✅ · `next build` (26 routes) ✅ · login admin → /admin/students = 200 ✅ · round-trip DB (set "เด็กชาย" → อ่านได้ → revert) ✅ (ไม่แตะข้อมูลจริง)
- หมายเหตุ: นักเรียนจริงตอนนี้คำนำหน้าฝังอยู่ในชื่อ (เช่น "นายกิตติศักดิ์ …") — ไม่ได้ auto-migrate แยกออก (เสี่ยง parse ผิด), ฟิลด์ใหม่ไว้กรอกแยกต่อไป

### 2026-06-22 — ระบบเวลาเรียน/คาบ (แก้เวลา + เทมเพลต + สลับลำดับทั้งโรงเรียน)
- **เหตุผล**: เดิมเวลาคาบ hardcode ใน `PERIODS` (constants.ts) ไม่มี Home Room/พัก/พักเที่ยง และแก้ไม่ได้ ผู้ใช้ต้องการแก้เวลา, บันทึกเป็นเทมเพลต (ใช้เฉพาะวันชั่วคราว), และสลับตำแหน่งคาบให้ทุกห้องพร้อมกัน (รวมคาบพัก) — เดสก์ท็อปลากวาง, มือถือใช้ปุ่มลูกศร
- **โครงสร้างเวลาใหม่** (08:10–16:10): Home Room 08:10–08:20, คาบ 1–2, พัก 10 น., คาบ 3–4, พักเที่ยง, คาบ 5–8 — เก็บใน `DEFAULT_BELL_SLOTS` ([src/lib/bell-schedule.ts](src/lib/bell-schedule.ts))
- **DB**: 3 model ใหม่ใน [schema.prisma](prisma/schema.prisma) — `BellSchedule` (เทมเพลต, มี isDefault), `BellSlot` (แถว: HOMEROOM/CLASS/BREAK/LUNCH + เวลา + periodNumber), `ScheduleOverride` (ผูกวันที่→เทมเพลต) · `db push` แล้ว
- **กลไกสลับ**: ลาก/เลื่อนแถว → `rechainSlots()` คำนวณเวลาต่อเนื่องใหม่จากแถวแรก (วิชาผูกกับ periodNumber ย้ายตามช่วงเวลา, คาบพักความยาวต่างกันก็เลื่อนได้ถูก) — มีผลทุกห้องเพราะ `Schedule.period` อ้าง periodNumber
- **Service/Actions**: [bell-schedule.service.ts](src/server/services/bell-schedule.service.ts) (CRUD เทมเพลต, `ensureDefaultSchedule` self-heal, `getEffectiveSlots(date)`, override) + [bell-schedule.actions.ts](src/server/actions/bell-schedule.actions.ts)
- **UI ใหม่**: หน้า [/admin/periods](src/app/(app)/admin/periods/page.tsx) + [bell-schedule-editor.tsx](src/components/admin/bell-schedule-editor.tsx) (framer-motion `Reorder` ลากวาง + ปุ่ม ↑↓ + แก้เวลา/เลขคาบ + เลือก/สร้าง/ตั้งเป็นหลัก/ลบเทมเพลต) + [schedule-override-manager.tsx](src/components/admin/schedule-override-manager.tsx) (ผูกวันที่) + เมนู nav "เวลาเรียน / คาบ"
- **แสดงคาบพักเป็นแถว**: [timetable-grid.tsx](src/components/timetable/timetable-grid.tsx) (band เต็มแถว), now-next/today-schedule/week-cards + dialogs/validations รับ `bellSlots` (default = ตารางหลัก) — ทุกหน้าครู/นักเรียน/แอดมินส่ง slots จริงเข้าไป
- **ตรวจสอบ**: `tsc --noEmit` ✅ · `next build` (26 routes, +/admin/periods) ✅ · สร้าง default schedule 11 แถวตรงเวลาที่กำหนด ✅ · login admin → GET /admin/periods = 200 แสดง Home Room/พักเที่ยง/08:10/15:20/ตารางหลัก/override ครบ ✅
- **⚠️ สำคัญ**: `dev.db` เป็น**ข้อมูลจริงของผู้ใช้** (ครู kandee@suntisuk.ac.th) ไม่ใช่ seed เดโม — **ห้ามรัน `db:seed`/`db:reset`** (ลบข้อมูลจริง) · default bell schedule สร้างแบบไม่ทำลายข้อมูลผ่าน `ensureDefaultSchedule`
- **ยังไม่ทำ**: ยังไม่ได้ทดสอบลากวางจริงบนเบราว์เซอร์ (verify เฉพาะ SSR/ข้อมูล), ยังไม่แจ้งเตือนครู/นักเรียนเมื่อ override วันนั้น

### 2026-06-22 — เพิ่มกฎสลับคาบอัตโนมัติสำหรับครู
- **เหตุผล**: ครู a ต้องสลับกับครู b ตามเงื่อนไขว่า b ว่างในช่วงสภาพเริ่มต้น
- **ขั้นตอน**: เพิ่มฟังก์ชัน `isTeacherAvailable(teacherId, day, period)` ใน `schedule.service.ts` เพื่อตรวจสอบว่าครูว่าง
- **ผล**: ฟังก์ชันเสียบในหน้าจอจัดการคาบ (หน้า Admin → Schedule) ช่วยเลือกคาบที่เป็นไปได้โดยอัตโนมัติ
- **ตรวจสอบ**: `npm run build` ผ่าน, `npx tsc --noEmit` ผ่าน

> กติกา: ทุกครั้งที่มีการแก้ไข/เพิ่มงาน ให้ **เพิ่มรายการใหม่ไว้บนสุด** ของหัวข้อนี้
> (วันที่ · สรุปสิ่งที่ทำ · ไฟล์/ส่วนที่แตะ · ผลการตรวจสอบ)

### 2026-06-21 — แก้ 404 ตอนคลิกแจ้งเตือนประกาศ (สร้างหน้า /announcements/[id])
- **ปัญหา:** คลิกแจ้งเตือนประกาศเด้งไป `/announcements/{id}` แล้ว 404 — notification ตั้ง `linkUrl` เป็น path นี้ ([admin.actions.ts:512](src/server/actions/admin.actions.ts#L512)) แต่ route ไม่มี (มีแค่ `/admin/announcements`)
- **แก้:** สร้าง [src/app/(app)/announcements/[id]/page.tsx](src/app/(app)/announcements/%5Bid%5D/page.tsx) — หน้า detail ใช้ร่วมทุก role (อยู่ใน group `(app)` จึงผ่าน `requireUser()` ของ layout). มี access control ตาม audience: STUDENTS→นักเรียน, TEACHERS→ครู, ALL→ทุกคน, ADMIN เห็นหมด; นอก audience คืน `notFound()`. render body ด้วย `SafeHtml` (รองรับ rich text). เพิ่ม `/announcements` ใน `PROTECTED_PREFIXES` + matcher ของ [src/proxy.ts](src/proxy.ts)
- **ผลตรวจสอบ:** `npx tsc --noEmit` ผ่าน, `npm run build` สำเร็จ — route `ƒ /announcements/[id]` ขึ้น

### 2026-06-21 — หยุดแจ้งเตือนหลัง logout
- **ปัญหา:** หลัง logout ยังได้รับ push บนเครื่องนั้น เพราะ subscription ไม่ถูกลบ (server ยังส่งให้ device เดิม)
- **แก้:** [src/components/layout/user-menu.tsx](src/components/layout/user-menu.tsx) เพิ่มฟังก์ชัน `logout()` — ก่อน `signOut()` จะ `getSubscription()` ของเครื่องนี้ แล้วเรียก `unsubscribePushAction(endpoint)` (ลบใน DB ขณะยัง auth อยู่) + `sub.unsubscribe()` (ลบใน browser). ลบเฉพาะเครื่องนี้ ไม่กระทบ device อื่นที่ยัง login. ใส่ timeout 2s กัน `serviceWorker.ready` ค้าง และ best-effort ไม่บล็อก logout
- **ผลตรวจสอบ:** `npx tsc --noEmit` ผ่าน

### 2026-06-21 — สรุปสาเหตุจริงของ Android push (403 VAPID) + auth proxy/cookie/secret fixes
- **Android push — สาเหตุจริง (ยืนยันด้วยการส่งตรง):** subscription ของ Android ถูกสร้างด้วย **VAPID key เก่า** (มีการ rotate key มาก่อน) → FCM ตอบ **403 "the VAPID credentials ... do not correspond to the credentials used to create the subscriptions"**. ที่เห็น "success" คือ sub ของ iPhone ในบัญชีเดียวกันรับแทน. **ไม่ใช่ปัญหา service worker cache** ตามที่เดาไว้ในรายการก่อนหน้า (sw.js ยังเป็น v2 ปกติ ใช้งานได้)
- **แก้ (โค้ด 2 จุด):**
  - [src/server/services/push.service.ts](src/server/services/push.service.ts): ขยายเงื่อนไข prune ให้รวม `403` ที่ body มีคำว่า vapid/credentials/"do not correspond" (เดิม prune แค่ 400 VapidPkHashMismatch / 404 / 410) → sub ตาย ๆ จะถูกลบอัตโนมัติ
  - [src/components/pwa/use-push.ts](src/components/pwa/use-push.ts): เพิ่ม `subscriptionMatchesKey()` — เทียบ `applicationServerKey` ของ subscription เดิมกับ VAPID key ปัจจุบัน ถ้าไม่ตรงให้ `unsubscribe()` แล้วสมัครใหม่ด้วย key ปัจจุบัน (เดิมใช้ `getSubscription()` ซ้ำกับ key เก่าตลอด)
- **ขั้นตอนผู้ใช้:** เปิด Settings → การแจ้งเตือน บน Android อีกครั้ง (โค้ดจะ unsubscribe ตัวเก่า + สมัครใหม่ให้เอง) แล้วกดส่งทดสอบ. sub เก่าใน DB จะถูก prune ตอน send ครั้งถัดไป (หรือลบเองได้)
- **module factory error:** เป็น stale Turbopack dev chunk ในแท็บเบราว์เซอร์ (ไม่ใช่บั๊ก) — hard reload (Ctrl+Shift+R) หรือลบ `.next` แล้วรีสตาร์ท. sw.js fetch handler ว่าง ไม่ได้แคช `_next` chunks จึงไม่ใช่ต้นเหตุ
- **Auth (ต่อจากย้าย NextAuth):**
  - rename `middleware.ts` → [src/proxy.ts](src/proxy.ts) (ฟังก์ชัน `middleware`→`proxy`) แก้ deprecation warning ของ Next 16
  - เปลี่ยนชื่อ cookie ใน [src/lib/constants.ts](src/lib/constants.ts): `SESSION_COOKIE` `spk_session`→`spk_auth` แก้ `JWTSessionError: Invalid Compact JWE` (cookie เก่ารูปแบบ custom-session ชนชื่อ)
  - แก้ [.env](.env): ลบ `AUTH_SECRET` ซ้ำ (มี 2 บรรทัด ทำให้ secret ไม่คงที่ → `no matching decryption secret`), รวมเหลือค่าเดียว, เพิ่ม `AUTH_URL`
- **ผลตรวจสอบ:** `npx tsc --noEmit` ผ่าน, `npm run build` สำเร็จ (route proxy ขึ้น), ยืนยัน 403 VAPID ด้วยสคริปต์ส่งตรงไป Android sub
- **ค้าง:** `AUTH_SECRET` ยังเป็น dev placeholder — ต้อง gen ค่าจริงก่อน deploy; redirect URI ใน Google Console ต้องเป็น `…/api/auth/callback/google`

### 2026-06-21 — (เดิม/ทบทวนแล้วไม่ตรงสาเหตุ) แก้ module factory error + ซ่อม Android push notifications
> หมายเหตุ: รายการนี้เดาว่าเป็นปัญหา service worker cache ซึ่ง**ไม่ใช่สาเหตุจริง** ของ Android push — ดูรายการบนสุด (403 VAPID key เก่า)
- **ปัญหา:**
  1. Browser error: `Module ... was instantiated ... but the module factory is not available` ที่ `notification-feed.tsx` เมื่อ import server action
  2. แจ้งเตือนไม่เด้งบน Android
- **สาเหตุ:**
  1. Service worker `public/sw.js` มี fetch handler เปล่า `() => {}` ซึ่งใน Next.js dev mode อาจดัก `_next` chunks ทำให้ HMR โหลด module ไม่สำเร็จ + `.next` cache มีทั้ง `build/` และ `dev/` (รัน `next build` ทับ dev cache)
  2. SW รุ่นเก่าอาจยังค้างอยู่บน Android device หรือ browser ไม่ fetch `sw.js` ใหม่เพราะ HTTP cache
- **แก้:**
  - [public/sw.js](public/sw.js): 
    - fetch handler ข้าม `_next` และ `__webpack_hmr` เส้นทาง (dev-safe)
    - push handler เพิ่ม `console.log` + fallback notification ถ้า `showNotification` ล้มเหลว (กรณี icon/badge ไม่ถูกต้องบน Android)
    - notificationclick เพิ่ม error handling + logging
    - bump `sw-version: 3`
  - [src/components/pwa/service-worker-register.tsx](src/components/pwa/service-worker-register.tsx): 
    - เพิ่ม `{ updateViaCache: "none" }` บังคับ browser ไม่ cache `sw.js`
    - เรียก `reg.update()` ทันทีหลัง register (force check update)
    - ฟัง `updatefound` + log ตอน SW อัปเดต
  - ลบ `.next/` cache (`rm -rf .next`) เพื่อเคลียร์ build/dev cache ที่ปนกัน
- **ไฟล์ที่แตะ:** `public/sw.js`, `src/components/pwa/service-worker-register.tsx`, `.next/`
- **ขั้นตอนผู้ใช้:**
  1. รีสตาร์ท `npm run dev` (cache ใหม่สด)
  2. บน Android: เปิด Chrome DevTools (Remote Debugging) → Application → Service Workers → กด **Unregister** แล้วรีโหลดหน้า (SW จะ register ใหม่ v3)
  3. ไปที่ Settings → การแจ้งเตือน → กด "เปิดการแจ้งเตือน" → "ส่งการแจ้งเตือนทดสอบ"
  4. ถ้ายังไม่เด้ง: ตรวจสอบว่าเข้าผ่าน HTTPS proxy (`https://nallyz-dev.fe-grp.com`) ไม่ใช่ `http://...` และ Chrome มีสิทธิ์แจ้งเตือนใน Settings ของ Android

### 2026-06-21 — ตรวจสอบ build หลังย้าย auth + แก้ env ให้ตรงกับ Auth.js v5
- **เป้าหมาย:** ยืนยันว่าการย้ายไป NextAuth คอมไพล์ผ่าน และแก้ error `MissingSecret` ตอนรัน dev
- **สิ่งที่ทำ:**
  - รัน `npx tsc --noEmit` (ผ่าน), `npx prisma generate` (ผ่าน), `npx prisma db push` (DB in sync), `npm run build` (สำเร็จ — route `/api/auth/[...nextauth]` ขึ้น, route google เดิมหายแล้ว)
  - แก้ [.env](.env): เปลี่ยนชื่อ env ให้ตรงกับ Auth.js v5 — `SESSION_SECRET` → `AUTH_SECRET`, `GOOGLE_CLIENT_ID` → `AUTH_GOOGLE_ID`, `GOOGLE_CLIENT_SECRET` → `AUTH_GOOGLE_SECRET`, เพิ่ม `AUTH_TRUST_HOST="true"` (custom domain หลัง proxy)
- **ไฟล์ที่แตะ:** [.env](.env)
- **ผลตรวจสอบ:** tsc/build ผ่าน. แก้ `MissingSecret` แล้ว — ต้อง **restart dev server** ให้โหลด env ใหม่
- **ตามต่อ (manual):** อัปเดต redirect URI ใน Google Cloud Console เป็น `…/api/auth/callback/google`; smoke test login/logout/Google/RBAC; ตัดสินใจเรื่อง audit log LOGIN/LOGOUT (ย้ายไป Auth.js `events` หรือไม่)

### 2026-06-21 — ย้าย auth ทั้งหมดไป NextAuth (Auth.js) v5
- **เป้าหมาย:** แทนที่ custom session ด้วย NextAuth พร้อม Credentials (email/password) + Google provider โดยรักษา RBAC และ helper API (`requireUser`, `requireAdmin` ฯลฯ) เดิม
- **สิ่งที่ทำ:**
  - ติดตั้ง `next-auth@beta` + `@auth/prisma-adapter`
  - สร้าง [src/auth.ts](src/auth.ts) กำหนด providers, callbacks (signIn/jwt/session), cookie name `spk_session`, pages
  - สร้าง API route [src/app/api/auth/[...nextauth]/route.ts](src/app/api/auth/[...nextauth]/route.ts)
  - ปรับ [prisma/schema.prisma](prisma/schema.prisma): เพิ่ม `emailVerified`, ทำ `passwordHash` optional, ลบ `Session` custom, เพิ่ม `Account`/`Session`/`VerificationToken` ของ Auth.js
  - รีไรต์ [src/lib/auth/index.ts](src/lib/auth/index.ts) ให้ใช้ `auth()` จาก NextAuth แทน session custom
  - แก้ [src/components/auth/login-form.tsx](src/components/auth/login-form.tsx) ใช้ `signIn("credentials")` แทน server action
  - แก้ [src/app/(auth)/login/page.tsx](src/app/(auth)/login/page.tsx) ใช้ `auth()` redirect, แมป error ใหม่
  - แก้ปุ่ม Google ให้เรียก `signIn("google")`
  - แก้ [src/components/layout/user-menu.tsx](src/components/layout/user-menu.tsx) ใช้ `signOut()` จาก NextAuth
  - ลบไฟล์ที่ไม่ใช้: `src/lib/auth/session.ts`, `src/lib/auth/google.ts`, `src/app/api/auth/google/*`, `logoutAction`, `loginAction`
  - อัปเดต `.env.example`
- **ไฟล์ที่แตะหลัก:** `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `prisma/schema.prisma`, `src/lib/auth/index.ts`, `src/components/auth/login-form.tsx`, `src/app/(auth)/login/page.tsx`, `src/components/layout/user-menu.tsx`, `src/server/actions/auth.actions.ts`, `src/lib/constants.ts`, `.env.example`
- **ผลการตรวจสอบ:**
  - `npx tsc --noEmit` ✅
  - `npx prisma db push --force-reset` + `npm run db:seed` ✅
  - `npm run build` 24 routes ✅
- **ขั้นตอนผู้ใช้:** ตั้งค่า `.env` ใหม่ (`AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`) → รีเซ็ต DB (`npx prisma migrate reset --force`) → `npm run db:seed` → รีสตาร์ท dev

### 2026-06-21 — แก้ push error `VapidPkHashMismatch`
- **ปัญหา:** ส่ง push แล้วได้ `status=400 body={"reason":"VapidPkHashMismatch"}` — subscription ถูกสร้างด้วย VAPID public key เก่า ไม่ตรงกับ key ปัจจุบันบนเซิร์ฟเวอร์
- **แก้:**
  - `push.service.ts` จับ `400 + VapidPkHashMismatch` แล้ว **ลบ subscription นั้นออก** เหมือน 404/410 (ให้ client สมัครใหม่ได้)
  - เพิ่มตัวนับ `mismatch` ใน `PushResult` ส่งกลับไป UI
  - `push-settings.tsx` แสดงข้อความเฉพาะ: “VAPID key เปลี่ยน — กดเปิดการแจ้งเตือนอีกครั้งเพื่อสมัครใหม่”
- **ไฟล์ที่แตะ:** [src/server/services/push.service.ts](src/server/services/push.service.ts), [src/components/pwa/push-settings.tsx](src/components/pwa/push-settings.tsx)
- **ผลการตรวจสอบ:** `npx tsc --noEmit` ✅ · `npm run build` 24 routes ✅
- **ขั้นตอนผู้ใช้:** ตรวจสอบว่า `.env` มี `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` คู่กัน (สร้างใหม่ทั้งคู่ถ้าจำเป็น) → รีสตาร์ท dev/rebuild → กด “เปิดการแจ้งเตือน” ใหม่

### 2026-06-21 — เพิ่ม Excel Sync สำหรับครู/นักเรียน/ห้อง/วิชา/ตารางสอน
- **ฟีเจอร์:** เพิ่มเมนู **"Sync Excel"** ใน sidebar แอดมิน ไปยังหน้า `/admin/data-sync` สามารถดาวน์โหลดข้อมูลปัจจุบันเป็น `.xlsx` แล้วอัปโหลดกลับมา sync ได้
- **รูปแบบการ sync:** Replace-all ตามไฟล์ — upsert ตาม natural key และลบข้อมูลที่ไม่มีในไฟล์ออก
- **ไฟล์ Excel ที่ export:** แถวบนสุดเป็น header ชื่อคอลัมน์ (className, teacherCode ฯลฯ) + ล็อคแถว header + ใส่ autofilter
- **Natural keys:** ครู=`teacherCode`, นักเรียน=`studentCode`, ห้องเรียน=`className`, วิชา=`subjectCode`, ตารางสอน=`className+day+period`
- **ไฟล์ที่แตะ:**
  - [src/lib/nav.ts](src/lib/nav.ts) + [src/components/layout/sidebar-nav.tsx](src/components/layout/sidebar-nav.tsx) — เมนูและไอคอน
  - [src/app/(app)/admin/data-sync/page.tsx](src/app/(app)/admin/data-sync/page.tsx) — หน้าใหม่
  - [src/components/admin/data-sync-page.tsx](src/components/admin/data-sync-page.tsx) — UI Tabs สำหรับ 5 entity พร้อม upload/download
  - [src/components/admin/data-sync-button.tsx](src/components/admin/data-sync-button.tsx) — ปุ่มลัดจากหน้าจัดการ entity
  - หน้า [admin/teachers](src/app/(app)/admin/teachers/page.tsx), [admin/students](src/app/(app)/admin/students/page.tsx), [admin/classes](src/app/(app)/admin/classes/page.tsx), [admin/subjects](src/app/(app)/admin/subjects/page.tsx), [admin/schedule](src/app/(app)/admin/schedule/page.tsx) — เพิ่มปุ่ม Sync Excel ใน PageHeader
  - [src/server/services/admin.service.ts](src/server/services/admin.service.ts) — `export*`/`sync*` services
  - [src/server/actions/admin.actions.ts](src/server/actions/admin.actions.ts) — `export*Action`/`sync*Action`
- **ผลการตรวจสอบ:** `npx tsc --noEmit` ผ่าน ✅ · `npm run build` 24 routes ✅
- **หมายเหตุ:** ยังไม่ได้เชื่อม Google Sheets ในขั้นตอนนี้ เนื่องจากเลือก Excel upload/download; สามารถต่อ Google Sheets API ภายหลังได้

### 2026-06-21 — แก้ console error "Registration failed - push service error" บน Brave
- **ปัญหา:** กด “เปิดการแจ้งเตือน” บน Brave แล้ว console แสดง `[push] subscribe error: "Registration failed - push service error" AbortError`
- **สาเหตุ:** Brave บล็อก/ไม่สามารถเชื่อมต่อ push service ได้ (เกิดจากนโยบาย privacy/shield ของเบราว์เซอร์ ไม่ใช่บั๊กในโค้ด) — error นี้เป็น `AbortError` จาก `pushManager.subscribe()`
- **แก้ไข:**
  - จับ error “push service error”/AbortError แยกเป็น reason `push-service-error` แทนการ fallback เป็น `error` ทั่วไป ([src/components/pwa/use-push.ts](src/components/pwa/use-push.ts))
  - เปลี่ยนการ log กรณีนี้จาก `console.error` เป็น `console.warn` เพื่อไม่ให้ console ขึ้น error ที่ไม่ใช่บั๊กแอป
  - เพิ่มการตรวจจับ Brave (`navigator.brave.isBrave()` / UA fallback) ใน hook เพื่อให้ UI แสดงคำแนะนำเฉพาะ
  - แสดง toast/ข้อความชี้เป้า: ปิด Brave Shields สำหรับเว็บนี้ หรือเปิด “Use Google services for push messaging” ใน `brave://settings/privacy` ([src/components/pwa/push-settings.tsx](src/components/pwa/push-settings.tsx), [src/components/pwa/push-manager.tsx](src/components/pwa/push-manager.tsx))
- **ไฟล์ที่แตะ:** [src/components/pwa/use-push.ts](src/components/pwa/use-push.ts), [src/components/pwa/push-settings.tsx](src/components/pwa/push-settings.tsx), [src/components/pwa/push-manager.tsx](src/components/pwa/push-manager.tsx)
- **ผลการตรวจสอบ:** `npx tsc --noEmit` ผ่าน ✅

### 2026-06-21 — วินิจฉัยข้อผิดพลาด "Registration failed - push service error"
- **ปัญหา:** Console แสดง error "Registration failed - push service error" เมื่อกดเปิดการแจ้งเตือน บน push-settings
- **วินิจฉัยเบื้องต้น:** 
  - Service worker file (`public/sw.js`) มีอยู่และตั้งค่าถูก (install/activate/push handlers ครบ)
  - Error เกิดจาก `pushManager.subscribe()` ล้มเหลว ไม่ใช่จากการตรวจเช็ค secure/supported
  - ข้อมูลที่ต้องได้รับจากผู้ใช้: 
    1. URL ของแอป (HTTPS/localhost?)
    2. ค่า `NEXT_PUBLIC_VAPID_PUBLIC_KEY` ตั้งค่าแล้วหรือ
    3. VAPID key format (base64url 65 bytes?)
- **ไฟล์ที่ตรวจสอบ:** [src/components/pwa/use-push.ts](src/components/pwa/use-push.ts) (hooks + logic), [src/components/pwa/push-settings.tsx](src/components/pwa/push-settings.tsx) (UI), [public/sw.js](public/sw.js) (service worker), [src/server/actions/push.actions.ts](src/server/actions/push.actions.ts) (server actions)
- **ผลการตรวจสอบ:** โค้ด compile ได้ (`tsc` ✅), service worker ถูกต้อง ✅ — **ต้องรับข้อมูลเพิ่มเติมจากผู้ใช้** ก่อนสามารถแก้ไขได้

### 2026-06-21 — แอดมินจัดการตารางสอน: เพิ่มปุ่มแก้ไขและลบหลายรายการพร้อมกัน
- **ปุ่มแก้ไขคาบสอนแต่ละแถว:** เพิ่มปุ่มปากกาบนตาราง [src/components/admin/schedules-table.tsx](src/components/admin/schedules-table.tsx) และ dialog แก้ไข [src/components/admin/edit-schedule-dialog.tsx](src/components/admin/edit-schedule-dialog.tsx) สำหรับแก้ไข ห้อง/วิชา/ครู/วัน/คาบ/ห้องเรียนได้
- **เลือกหลายรายการ + ลบทีเดียว:** ตารางตารางสอนเปลี่ยนเป็น client table ที่รองรับ checkbox ต่อแถว, เลือกทั้งหมด, แถบ bulk action และลบแบบกลุ่มพร้อมกัน โดยใช้ action ใหม่ใน [src/server/actions/admin.actions.ts](src/server/actions/admin.actions.ts) และ service ใน [src/server/services/admin.service.ts](src/server/services/admin.service.ts)
- **เชื่อมหน้าแอดมิน:** [src/app/(app)/admin/schedule/page.tsx](src/app/(app)/admin/schedule/page.tsx) ใช้ตารางใหม่และส่งข้อมูล occupied slots เข้า dialog เพื่อป้องกันคาบซ้ำในห้อง/วันเดียวกัน
- **แก้ typing ที่เกี่ยวข้องกับการแก้ไขครู:** ปรับ [src/components/admin/teacher-table.tsx](src/components/admin/teacher-table.tsx) และ [src/app/(app)/admin/teachers/page.tsx](src/app/(app)/admin/teachers/page.tsx) เพื่อให้ dialog แก้ไขครู compile ได้อย่างถูกต้อง
- **ตรวจสอบ:** `npx tsc --noEmit` ผ่าน ✅

### 2026-06-21 — กันคาบชนตอนเพิ่มตาราง + ตารางครูแสดงทั้งสองคาบที่สลับ (พร้อมไฮไลท์)
- **กันเลือกคาบที่ถูกใช้แล้ว (เพิ่มคาบสอน):** [add-schedule-dialog.tsx](src/components/admin/dialogs/add-schedule-dialog.tsx) เป็น interactive — เลือกห้อง+วัน แล้ว dropdown "คาบ" จะ **disable คาบที่ห้องนั้นใช้ไปแล้ว** (ติด label "ไม่ว่าง"); ส่ง `occupied` (`${classId}__${day}`→periods[]) จาก [admin/schedule page](src/app/(app)/admin/schedule/page.tsx). [select-field.tsx](src/components/admin/select-field.tsx) เพิ่ม controlled value/onChange + per-option disabled + hint. (backend ยังมี unique `(classId,day,period)` กันซ้ำชั้นสุดท้าย)
- **🔑 ตารางครูแสดงทั้งสองคาบที่สลับ (ตามที่ผู้ใช้ย้ำ):** เดิม (day,period)-swap ทำให้คาบเดิมของครูในตารางตัวเอง "ว่าง" (เพราะคาบนั้นครูอีกฝ่ายสอนแล้ว) → ผู้ใช้มองว่าผิด. เพิ่ม `getTeacherScheduleWithSwaps(teacherId)` ([schedule.service.ts](src/server/services/schedule.service.ts)) = คาบของตัวเอง + **คาบคู่สลับ (counterpart)** จาก swap ที่ active (APPROVED/CANCEL_REQUESTED) ที่ครูคนนั้นมีส่วนร่วม → [teacher/schedule page](src/app/(app)/teacher/schedule/page.tsx) ใช้อันนี้แสดงผล (ไฮไลท์ทั้งคู่ผ่าน getSwapMarks) ส่วน mySlots ของ dialog ใช้ `getTeacherSchedule` (เฉพาะคาบตัวเอง). dashboard now-next ใช้ของเดิม (เฉพาะที่ตัวเองสอนจริง)
- **ตรวจสอบ:** `tsc` สะอาด ✅ · **รันจริงตรงตัวอย่างผู้ใช้** (M.4/1): A=Math@MONP1, B=Biology@MONP6 → หลังสลับ ตาราง A = Math@P6 + Biology(ของ B)@P1, ตาราง B = Biology@P1 + Math(ของ A)@P6, ไฮไลท์ทั้งคู่ ✅ (ไม่รัน `next build` เพื่อไม่ชน dev ของผู้ใช้ — dev จะ HMR เอง, รีโหลดหน้า)

### 2026-06-21 — แอดมินตารางสอน: เลือกหลายรายการ (ติ๊ก) + ลบทีเดียว
- หน้า [admin/schedule](src/app/(app)/admin/schedule/page.tsx) เปลี่ยนตารางเป็น client component [schedules-table.tsx](src/components/admin/schedules-table.tsx): เพิ่มคอลัมน์ checkbox ต่อแถว + checkbox "เลือกทั้งหมด" (header, รองรับ indeterminate) + แถบ bulk action เมื่อเลือก ≥1 ("เลือกแล้ว n รายการ" + "ลบที่เลือก (n)" + "ยกเลิกการเลือก"). คงปุ่มลบรายตัวไว้
- Backend: `deleteSchedules(ids[])` ([admin.service.ts](src/server/services/admin.service.ts)) ลบ SwapRequest ที่อ้างถึงก่อน แล้ว `deleteMany` ใน $transaction; action `deleteSchedulesAction(ids[])` ([admin.actions.ts](src/server/actions/admin.actions.ts)) + revalidate
- **ตรวจสอบ:** `tsc` สะอาด ✅ · `next build` 23 routes ✅ (⚠️ ต้องรีสตาร์ท dev เพื่อเห็นผล)

### 2026-06-21 — #1 ยกเลิกการสลับที่อนุมัติแล้ว (revert workflow) + แก้บั๊กลบคาบติด FK
- **#1 ยกเลิกการสลับที่อนุมัติแล้ว:** เพิ่ม status `CANCEL_REQUESTED`/`REVERTED` + ฟิลด์ `cancelRequestedById/cancelDecidedById/cancelRespondedAt` ใน SwapRequest (db push + generate). ใน [swap.service.ts](src/server/services/swap.service.ts): `requestSwapCancellation` (ครูฝ่ายใดฝ่ายหนึ่งขอ → แจ้งครูอีกฝ่าย), `approveSwapCancellation` (อีกฝ่ายอนุมัติ → **สลับ (day,period) กลับ** ด้วย helper `exchangeDayPeriod` → ตารางครู+นักเรียนกลับเป็นเดิม + แจ้งนักเรียนทั้งห้อง), `rejectSwapCancellation` (กลับเป็น APPROVED). แจ้งเตือนครบ push+in-app+history ผ่าน `createNotification` (เพิ่ม type `SWAP_CANCEL_REQUEST`/`SWAP_CANCELLED` + ไอคอน)
- **ไฮไลต์:** `getSwapMarks` filter `status in [APPROVED, CANCEL_REQUESTED]` → REVERTED ไม่โชว์ไฮไลต์ (ตามสเปก "ลบ/มาร์คว่ายกเลิก")
- **UI:** [swap-list.tsx](src/components/swap/swap-list.tsx) รับ `viewerTeacherId` → ปุ่ม "ขอยกเลิกการสลับ" (คาบ APPROVED ที่ตนเกี่ยวข้อง), ปุ่ม "อนุมัติ/ไม่อนุมัติการยกเลิก" (ครูอีกฝ่าย), ข้อความ "รออีกฝ่ายอนุมัติ" (ฝ่ายขอ); StatusBadge เพิ่ม 2 สถานะ. actions ใหม่ [swap.actions.ts](src/server/actions/swap.actions.ts) `requestSwapCancelAction`/`decideSwapCancelAction`. ส่ง `viewerTeacherId` จากหน้า [teacher/swaps](src/app/(app)/teacher/swaps/page.tsx); `mapSwapToClient`/`ClientSwap` เพิ่ม requesterId/targetTeacherId/cancelRequestedById
- **แก้บั๊กที่ผู้ใช้เจอ:** ลบคาบในแอดมินติด FK (`Schedule.delete` P2003 เพราะมี SwapRequest อ้างถึง) → [admin.service.ts](src/server/services/admin.service.ts) `deleteSchedule` ลบ SwapRequest ที่อ้าง source/target ก่อน (logs cascade) แล้วค่อยลบคาบ ใน $transaction. **เสริม:** ทำแบบเดียวกันกับ `deleteClass`/`deleteSubject`/`deleteTeacher` (กัน P2003 ชุดเดียวกัน) — ผู้ใช้ยังเจอ error ซ้ำเพราะ dev server เก่า (chunk `_1xtz2zw` เดิม) **ต้องรีสตาร์ท `npm run dev`**
- **ตรวจสอบ:** `tsc` สะอาด ✅ · `next build` 23 routes ✅ · **รันจริง lifecycle เต็ม**: approve→สลับ, requestCancel→`CANCEL_REQUESTED` (ไฮไลต์ยังอยู่), approveCancel→ตารางกลับเดิม + status `REVERTED` ✅ · ยืนยัน filter ตัด REVERTED ออกจากไฮไลต์ (marks ที่เหลือมาจาก swap APPROVED ค้างของเทสต์เก่า — ลบทิ้งแล้ว 5 รายการ) ✅
- ⚠️ ผู้ใช้ต้อง **รีสตาร์ท `npm run dev`** (เจอ "failed-to-find-server-action" เพราะ action ใหม่/บันเดิลเก่า). เทสต์รุ่นแรกของ swap-engine ที่ cleanup ไม่สำเร็จ ทิ้ง swap ค้างไว้ — เคลียร์แล้ว; ถ้าต้องการ baseline สะอาด รัน `npm run db:seed` (ล้าง login/push ของ demo ด้วย)
- ⏭️ เหลือ: #4+#8 จัดการวิชา (โหมด "จัดการ session" คง Subject catalog), #9 พักกลางวัน + ตั้งเวลาคาบ global (SchoolSettings)

### 2026-06-21 — Swap engine v2: ย้ายทั้ง session + ห้องเดียวกันเท่านั้น + แสดงรหัสวิชา (สเปกชุดที่ 2 #2/#3/#5/#6/#7)
- **เปลี่ยนกฎจาก "ระดับชั้นเดียวกัน" → "ห้องเรียนเดียวกันเป๊ะ" (#2):** [swap.service.ts](src/server/services/swap.service.ts) `createSwapRequest` เช็ค `source.classId === target.classId` (เดิมเช็ค gradeLevel). Frontend [swap-request-dialog.tsx](src/components/swap/swap-request-dialog.tsx) กรอง `selectableSlot` ด้วย classId + แสดงเฉพาะครูที่สอนห้องนั้น (`eligibleTeachers`)
- **🔑 แก้บั๊กร้ายแรง (#3/#6/#7 + Core Rule): สลับทั้ง session ไม่ใช่แค่ teacherId.** `approveSwapRequest` เปลี่ยนจาก "สลับ teacherId ของ 2 แถว" → **สลับ (day, period) ของ 2 แถว** ในห้องเดียวกัน ด้วย $transaction + พักชั่วคราว (`__SWAP_<id>`) กัน unique `(classId,day,period)` ชน. ผลคือ teacher/subject/subjectCode/room/classId เดินทางไปกับแถวของตัวเองอัตโนมัติ → **ไม่มีช่องว่าง ไม่มีวิชา/ห้องค้าง**. เดิม teacherId-swap ทำให้คาบต้นทางหายจากตารางครู + วิชาไม่ย้าย (ตรงกับอาการที่ผู้ใช้รายงาน)
- **รหัสวิชา (#5):** `slotLabel` ใส่ `subjectCode` (→ แจ้งเตือน + รายละเอียดคำขอผ่าน `mapSwapToClient`), แสดง subjectCode ใน [timetable-grid.tsx](src/components/timetable/timetable-grid.tsx) + [week-cards.tsx](src/components/timetable/week-cards.tsx) (ครู+นักเรียน)
- **ไฮไลต์ใหม่ตามโมเดลใหม่:** `getSwapMarks`/`SwapMark` เปลี่ยนเป็นตำแหน่งเดิม (originalDay/originalPeriod) — แถวหนึ่งหลังสลับอยู่ที่ตำแหน่งเดิมของคู่ → tooltip "สลับคาบ: เดิมอยู่ [วัน] คาบ [n]"
- **ตรวจสอบ:** `tsc` สะอาด ✅ · `next build` ผ่าน 23 routes ✅ · **รันจริง create+approve กับ M.4/1**: MATH MON P2 ↔ PHYS MON P1 → หลังสลับ MATH=MON P1, PHYS=MON P2, subject/room/class/teacher ครบ ไม่มีช่องว่าง ✅ · swap mark คืน original ถูกต้อง ✅ · ข้าม class ถูก reject ✅ (กฎ same-classroom). คืนค่าข้อมูลเดิมหลังเทสต์แล้ว
- ⏭️ **คิวที่เหลือจากสเปกชุด 2+3:** #1 ยกเลิกการสลับที่อนุมัติแล้ว (workflow ขออนุมัติย้อนกลับ), #4 Teacher→หลายวิชา (one-to-many) + #8 จัดการวิชา (เพิ่ม/แก้ พร้อมครู+ห้อง) — **ต้องตัดสินใจเรื่องโมเดล Subject** (ตอนนี้ Subject เป็น catalog ส่วนครู/ห้องอยู่ที่ Schedule; สเปกอยากให้ Subject ถือครู+ห้อง), #9 พักกลางวัน + ตั้งเวลาคาบ/ระยะเวลาแบบ global (ต้องมี SchoolSettings model)

### 2026-06-21 — Swap correctness: บังคับแลกข้ามชั้นไม่ได้ (#4) + ตัวเลือกคาบแบบกริด (#3) + ไฮไลต์คาบที่สลับ (#7/#9)
- บริบท: ผู้ใช้ส่งสเปกใหญ่ (10 ข้อ). วิเคราะห์แล้ว ~60% มีอยู่แล้ว. ตัดสินใจร่วมกับผู้ใช้: **คงสแตกเดิม** (SQLite/SSE/Web Push ไม่ย้าย Postgres/Socket.IO/FCM), **อีเมลใช้ dev-log transport แบบเสียบปลั๊กได้** (ไว้ทำตอน #1/#2), **เริ่มที่ swap correctness ก่อน**
- **#4 แลกเฉพาะระดับชั้นเดียวกัน (เช่น ม.5/1 ↔ ม.5/2, ห้าม ม.5/1 ↔ ม.4/1):**
  - Backend (กันแม้ client ถูก bypass): [swap.service.ts](src/server/services/swap.service.ts) `createSwapRequest` เพิ่มเช็ค `source.class.gradeLevel === target.class.gradeLevel` ไม่ตรง → โยน `SwapError`
  - เพิ่ม `gradeLevel` เข้า `TimetableSlot` ([timetable.ts](src/lib/timetable.ts)) + mapper `toSlot` ([schedule.service.ts](src/server/services/schedule.service.ts))
- **#3 เลือกคาบแบบกริดคลิกได้ (เลิกใช้ dropdown):** เขียน [swap-request-dialog.tsx](src/components/swap/swap-request-dialog.tsx) ใหม่ — ขั้น 1 คลิกเลือกคาบตัวเองจาก `TimetableGrid` (interactive), ขั้น 2 แสดงเฉพาะคาบครูอื่น **ระดับชั้นเดียวกัน** เป็นการ์ดคลิกได้ (กรองด้วย gradeLevel ฝั่ง client), ถ้าไม่มี → ข้อความบอกชัด
- **#7/#9 ไฮไลต์คาบที่สลับ + tooltip:** เพิ่ม `getSwapMarks(scheduleIds)` ([swap.service.ts](src/server/services/swap.service.ts)) สร้าง map จาก swap ที่ APPROVED (คาบต้นทาง→ครูเดิม=ผู้ขอ, คาบเป้าหมาย→ครูเดิม=ครูปลายทาง). `TimetableGrid` ([timetable-grid.tsx](src/components/timetable/timetable-grid.tsx)) + `WeekCards` ([week-cards.tsx](src/components/timetable/week-cards.tsx)) รับ `swapMarks` → ป้าย "สลับคาบ" สีเหลือง + ring + `title` tooltip (ครูเดิม→ครูปัจจุบัน + วันที่). เดินสายในหน้า [teacher/schedule](src/app/(app)/teacher/schedule/page.tsx) + [student/schedule](src/app/(app)/student/schedule/page.tsx) พร้อม legend
- **ตรวจสอบ:** `tsc` สะอาด ✅ · `next build` ผ่าน 23 routes ✅ · ข้อมูลจริงมีระดับ M.4/M.5/M.6 (ครูตัวอย่างมีคาบระดับเดียวกัน 54, ต่างระดับ 78) ✅ · **รันจริงผ่าน service: createSwapRequest ข้ามชั้น M.4↔M.5 ถูก reject** ตามข้อความกฎ ✅
- **ปรับ flow ตามที่ผู้ใช้ขอ (เลือกครูก่อน → โชว์ตารางครูคนนั้นทั้งสัปดาห์ให้เลือกคาบ):** เปลี่ยนฝั่งเป้าหมายจาก "การ์ดรวมทุกครู" เป็น **Select เลือกครู → แสดง `TimetableGrid` ตารางเต็มของครูคนนั้น** ([swap-request-dialog.tsx](src/components/swap/swap-request-dialog.tsx)). คาบระดับเดียวกัน = คลิกได้, คาบต่างระดับ = แสดงแต่จาง/กดไม่ได้ + tooltip (เพิ่ม props `selectableSlot`/`blockedHint` ใน [timetable-grid.tsx](src/components/timetable/timetable-grid.tsx)); ถ้าครูไม่มีคาบระดับนั้น → ขึ้นข้อความบอก. กฎ same-grade ยังบังคับทั้ง UI + backend. **ตรวจสอบ:** `tsc` สะอาด ✅
- ⏭️ ที่เหลือตามสเปก: **#1** backup email + email verification, **#2** forgot password (รออีเมล dev-log transport), และเอกสารสถาปัตยกรรมเต็ม (architecture/diagram/scalability)

### 2026-06-21 — ทำ Web Push → Service Worker ให้ทำงานข้ามแพลตฟอร์ม (Windows/iOS/Android) + ซ่อมบิลด์
- ✅ **ผลสรุป: ผู้ใช้ยืนยันการแจ้งเตือนทำงานแล้ว** (รวมบนอุปกรณ์ผ่านโดเมน proxy). ปิด dev server บนพอร์ต 3000 ตามที่ผู้ใช้ขอ (port 3000 = down, ไม่มี process)
- **อาการที่ผู้ใช้แจ้ง:** การแจ้งเตือนเด้งเฉพาะ `localhost:3000` บน Microsoft Edge เท่านั้น
- **วินิจฉัย (root cause หลายชั้น):**
  1. **บิลด์พัง:** [next.config.ts](next.config.ts) ห่อด้วย `next-pwa` (`swSrc: "src/sw.js"`) — next-pwa เลิก maintain แล้ว ฉีด **webpack** config ที่ชนกับ Turbopack ของ Next 16 → `next build` ล้ม (`WorkerError: Call retries were exceeded`) และ next-pwa จะ **เขียนทับ** `public/sw.js` (ตัว hand-written) + ลงทะเบียน SW ซ้ำกับ [ServiceWorkerRegister](src/components/pwa/service-worker-register.tsx). นี่คือเหตุผลที่ไฟล์ `src/sw.js` มีอยู่ (เป็น swSrc ของ next-pwa)
  2. **ไอคอนเป็น SVG ล้วน:** Chrome/Edge/Android **ไม่เรนเดอร์** ไอคอนแจ้งเตือนที่เป็น SVG, `badge` ของ Android ต้องเป็น PNG โมโนโครม, iOS ต้องมี `apple-touch-icon` PNG จึงติดตั้ง PWA ได้ (iOS push ต้องติดตั้งลง home screen ก่อน) → แจ้งเตือนเด้งแต่ดูเหมือนพัง/ไอคอนหาย
  3. **เหตุที่เด้งแค่ localhost:** `localhost` เป็น secure context **เฉพาะบนเครื่อง dev** — อุปกรณ์อื่น (มือถือ/พีซีอื่น) ต้องเข้าผ่านโดเมน reverse-proxy `https://nallyz-dev.fe-grp.com` แล้วสมัคร (subscribe) บนโดเมนนั้น (origin นี้ถูก allow ใน next.config serverActions อยู่แล้ว)
- **แก้:**
  - ลบ `next-pwa` ออกจาก [next.config.ts](next.config.ts) + [package.json](package.json) → PWA เป็นแบบ manual ล้วน (SW static ที่ [public/sw.js](public/sw.js) + register เอง + manifest จาก [app/manifest.ts](src/app/manifest.ts)); ลบไฟล์ขยะ `src/sw.js`
  - สร้างไอคอน PNG จาก SVG ด้วย sharp ([scripts/gen-icons.mjs](scripts/gen-icons.mjs) — รันซ้ำได้): `icon-192-ro.png`, `icon-512-ro.png`, `icon-512-full.png`, `icon-512-full-apple.png` (พื้นทึบ #7C3AED), `badge.png` (กลีฟขาวพื้นโปร่ง) + [public/badge.svg](public/badge.svg)
  - เดินสายไอคอน: [manifest.ts](src/app/manifest.ts) (PNG 192/512/maskable + svg fallback), [layout.tsx](src/app/layout.tsx) (`icon-512-full-apple.png` 180 + png icons), [public/sw.js](public/sw.js) (`icon:/icon-192-ro.png`, `badge:/badge.png`, bump `sw-version: 2` เพื่อบังคับ SW อัปเดตที่ไคลเอนต์)
  - **ซ่อม type-check ที่บล็อกบิลด์:** `@types/minimatch@6.0.0` เป็น stub ว่าง (ไม่มี `index.d.ts`, ถูกดึงผ่าน `@types/glob`, มาจากการ reinstall ด้วย bun) → `TS2688`. แก้โดย pin เป็น `5.1.2` (ตัวสุดท้ายที่มี types จริง) ทั้งใน devDependencies และ `overrides` ของ [package.json](package.json)
- **ตรวจสอบ:**
  - `next build` (Turbopack) — **ผ่าน, 23 routes** ✅ (เดิมล้มด้วย WorkerError)
  - ส่ง push จริงผ่าน [scripts/pushtest.mjs](scripts/pushtest.mjs) (`--dns-result-order=ipv4first`) → **statusCode 201 ทั้ง 2 subscription** (WNS/Edge) ✅
  - เสิร์ฟจริงบน dev server: `/sw.js /manifest.webmanifest /icon-192-ro.png /icon-512-ro.png /icon-512-full-apple.png /badge.png /icon-512-full.png` = **200 + content-type ถูกต้อง** (PNG = image/png), manifest อ้าง PNG, sw.js เป็น v2 ✅
- **สิ่งที่ผู้ใช้ต้องทำเพื่อทดสอบบนมือถือ:** เปิด `https://nallyz-dev.fe-grp.com` บนเครื่องนั้น (อย่าใช้ localhost) → Settings → "เปิดการแจ้งเตือน" → "ส่งการแจ้งเตือนทดสอบ". **iOS:** ต้อง "Add to Home Screen" แล้วเปิดจากไอคอนก่อน (iOS 16.4+) จึงสมัคร push ได้. แนะนำรีสตาร์ท `npm run dev` ให้รับ next.config ใหม่
- **ตามต่อ — แก้ ChunkLoadError (`Unexpected end of input`):** `.next` cache เสีย เพราะรัน `next build` (โปรดักชัน) ทับ `.next` ตัวเดียวกับที่ `next dev` กำลังใช้ + bun reinstall เปลี่ยน node_modules ใต้เซิร์ฟเวอร์ที่รันอยู่ → chunk ถูกตัดครึ่ง. แก้: kill dev → `rm -rf .next` → `npm run dev` ใหม่. **ตรวจสอบ:** server ขึ้นสะอาด (Ready 6.3s, มี IPv4 marker), `/`=200, `/sw.js`+ไอคอน=200, `/settings`,`/dashboard`=307 (redirect login ตามคาด), log ไม่มี error ✅. บทเรียน: อย่ารัน `next build` ขณะ `next dev` ใช้ `.next` เดียวกัน
- **ตามต่อ — แก้ hydration mismatch ที่หน้า Settings:** ปุ่ม "เปิดการแจ้งเตือน"/"ส่งทดสอบ" มี attribute `disabled` ไม่ตรง (server `disabled=""` vs client `disabled={false}`) เพราะ `usePush` คำนวณ `supported` จาก `window` **ตอน render** → SSR=false, client=true. แก้โดย gate `supported` ด้วย flag `mounted` ([use-push.ts](src/components/pwa/use-push.ts)) → server + client-render-แรก ได้ false เท่ากัน (ปุ่ม disabled ตรงกัน) แล้วค่อย flip เป็นค่าจริงหลัง mount. **ตรวจสอบ:** `tsc` สะอาด ✅
- **ตามต่อ — iPhone ไม่เด้งขออนุญาตแจ้งเตือน:** บน iOS API Web Push (`Notification`/`PushManager`) มี **เฉพาะตอนเปิดเป็น PWA ที่ติดตั้งแล้ว** — ในแท็บ Safari ปกติ API ไม่มี เลยขอ permission ไม่ได้ (ปุ่มถูก disable). เพิ่มการตรวจจับ iOS-ยังไม่ติดตั้ง ([use-push.ts](src/components/pwa/use-push.ts) `iosNeedsInstall` = iOS/iPadOS + ไม่ใช่ standalone + ยัง unsupported) แล้วโชว์แบนเนอร์/ข้อความสอน "แชร์ → เพิ่มไปยังหน้าจอโฮม → เปิดจากไอคอน" ใน [push-manager.tsx](src/components/pwa/push-manager.tsx) (แดชบอร์ด) + [push-settings.tsx](src/components/pwa/push-settings.tsx) (เดิมแท็บ Safari ไม่โชว์อะไรเลย). **ตรวจสอบ:** `tsc` สะอาด ✅ · ยืนยัน lucide-react export `Share`/`Plus` มีจริง ✅

### 2026-06-19 — เคลียร์ console warning ของ Recharts (width(-1)/height(-1))
- อาการ: `[browser] The width(-1) and height(-1) of chart should be greater than 0 ...` (ซ้ำ ๆ)
- สาเหตุ: `ResponsiveContainer` ของ Recharts วัดขนาด parent ตอนเรนเดอร์รอบแรก ก่อน layout มีขนาดจริง → ได้ -1 (กราฟแสดงได้ปกติ แต่ขึ้น warning รก console)
- แก้: [swap-chart.tsx](src/components/admin/swap-chart.tsx) — เรนเดอร์ `<ResponsiveContainer>` เฉพาะหลัง mount (gate ด้วย state) โดยคง `<div className="h-64 w-full">` เป็น placeholder จองที่ไว้ (ไม่เกิด layout shift / hydration-safe)
- **ตรวจสอบ:** `tsc` (เฉพาะ source) สะอาด ✅ — error เดียวที่เหลือคือไฟล์ generated `.next/dev/types/routes.d.ts` ที่ถูกตัดตอนตอน kill dev server จะถูกสร้างใหม่เมื่อรันอีกครั้ง

### 2026-06-19 — แก้บั๊กมือถือ "กดอะไรไม่ได้หลัง login" (hydration mismatch จาก timeAgo)
- อาการ: บนมือถือ หลัง login กดปุ่มอะไรไม่ได้เลย
- วินิจฉัยจาก dev log: `[browser] Uncaught Error: Hydration failed ... server rendered text didn't match` — diff `14 วินาทีที่ผ่านมา` (server) vs `13 วินาทีที่ผ่านมา` (client) ที่ [notification-feed.tsx](src/components/notifications/notification-feed.tsx)
- **Root cause:** `timeAgo()` ([lib/utils.ts](src/lib/utils.ts)) คำนวณเวลาแบบ "กี่วินาทีที่แล้ว" จาก `Date.now()` → SSR กับ client เรนเดอร์ห่างกันชั่วขณะ → ข้อความไม่ตรง → React โยน hydration error → **dev error overlay เต็มจอ บังคลิกทั้งหน้า**. มือถือเป็นบ่อยกว่าเพราะ latency SSR→hydration นานกว่า (ข้ามเส้นวินาที) ส่วน desktop localhost เร็วกว่ามักอยู่วินาทีเดียวกัน. กระทบทุกหน้าเพราะ `NotificationBell` ใน header ก็ใช้ `timeAgo`
- แก้: เพิ่มคอมโพเนนต์ [src/components/time-ago.tsx](src/components/time-ago.tsx) (`<TimeAgo>`) — เรนเดอร์ค่า server ด้วย `suppressHydrationWarning` แล้ว re-render หลัง mount + refresh ทุก 30s. แทนที่ `timeAgo(...)` ใน 3 client component: notification-feed, [notification-bell.tsx](src/components/notifications/notification-bell.tsx), [swap-list.tsx](src/components/swap/swap-list.tsx). (หน้า admin/announcements เป็น server component → ปลอดภัยอยู่แล้ว ไม่แตะ)
- ตรวจ client components อื่นที่ใช้ `new Date()`: timetable now-next/timetable-grid ใช้ `useState<Date|null>(null)` + set ใน effect → ปลอดภัย
- **ตรวจสอบ:** `tsc` ✅ · รีสตาร์ท dev สะอาด (ไม่มี edge error, มี IPv4 marker) ✅ · ดึง session มาเปิด `/student/notifications` = 200 เรนเดอร์เป็น `<span>` ของ `<TimeAgo>` (เลิกใช้ `<p>` เดิม), log ไม่มี hydration error ✅

### 2026-06-19 — แทน next-themes ด้วย ThemeProvider เอง (เลิก React-19 script warning)
- อาการ: Console error `Encountered a script tag while rendering React component` ที่ [theme-provider.tsx](src/components/theme-provider.tsx) (next-themes 0.4.6 = ล่าสุดแล้ว แต่ inject `<script>` จาก client component → React 19 เตือน)
- แก้: เขียน ThemeProvider เองแบบเล็ก ๆ ([theme-provider.tsx](src/components/theme-provider.tsx)) + script กัน FOUC ฝั่ง server ([src/lib/theme.ts](src/lib/theme.ts) `themeInitScript`) ใส่ใน [layout.tsx](src/app/layout.tsx) (server-rendered → ไม่โดน warning). `useTheme()` API เดิม (theme/resolvedTheme/setTheme) → [theme-toggle.tsx](src/components/layout/theme-toggle.tsx) + [sonner.tsx](src/components/ui/sonner.tsx) เปลี่ยน import มาจาก `@/components/theme-provider`
- รองรับ system theme + ฟัง `prefers-color-scheme` + sync ข้ามแท็บ + เก็บใน localStorage key `theme` (เข้ากันได้กับของเดิม)
- **ตรวจสอบ:** `tsc` ✅ · build/boot ไม่มี error ✅ (warning หายตอน client โหลด — ผู้ใช้ยืนยันใน console)

### 2026-06-19 — เจอ root cause push ไม่เด้ง: WSL2 IPv6 timeout → บังคับ IPv4
- อาการ: "ไม่เห็นแจ้งเตือนที่คอมเลย" — log โชว์ `[push] send failed status=?` (ไม่มี HTTP status)
- วินิจฉัย: ดึง subscription จาก DB มายิงเองด้วย [scripts/pushtest.mjs](scripts/pushtest.mjs) → `AggregateError [ETIMEDOUT]` ตอน connect `wns2-bl2p.notify.windows.com` (เบราว์เซอร์ที่ใช้คือ **Edge/WNS**). `curl` เข้าโฮสต์นี้ได้ 404 แต่ Node timeout
- **Root cause:** Node "Happy Eyeballs" ลองต่อ **IPv6 ก่อน** แต่ IPv6 ของ WSL2 route ไม่ได้ → ค้างจน timeout เงียบ ๆ (กระทบทั้ง Web Push และ Google OAuth token/JWKS ฝั่ง server)
- ยืนยัน: รัน script ด้วย `--dns-result-order=ipv4first --no-network-family-autoselection` → **ส่งสำเร็จ statusCode 201** (เด้งจริงบนเครื่อง)
- แก้: เพิ่ม [src/instrumentation.ts](src/instrumentation.ts) + [src/instrumentation-node.ts](src/instrumentation-node.ts) — ตอน boot (nodejs runtime) เรียก `dns.setDefaultResultOrder("ipv4first")` + `net.setDefaultAutoSelectFamily(false)` (แยกไฟล์ node ออกมา import เฉพาะ runtime nodejs เพื่อไม่ให้ Edge build พัง)
- **ตรวจสอบ:** `tsc` ✅ · รีสตาร์ท dev: log โชว์ `Compiling instrumentation Node.js` + `[instrumentation] ... forcing IPv4` ไม่มี edge-runtime error ✅ · script ยิงจริง = 201 ✅
- หมายเหตุ: instrumentation โหลดตอน boot → **ต้องรีสตาร์ท `npm run dev`** (รีสตาร์ทให้แล้ว). ถ้าได้ 201 แล้วยังไม่เห็น → ตั้งค่า Windows Notifications / Edge อนุญาต localhost

### 2026-06-19 — แก้บั๊ก "กดปุ่มเข้าสู่ระบบไม่ได้" (ติดกับดัก /login)
- อาการ: หน้าแรกโชว์ปุ่ม "เข้าสู่ระบบ" แต่กดแล้วไม่ไปไหน, log มีแต่ `GET /` ซ้ำ ๆ ไม่มี `GET /login`
- สาเหตุ (root cause): [middleware.ts](src/middleware.ts) เด้ง `/login` → `/` โดยเช็คแค่ **การมีอยู่ของ cookie** (เช็ค DB บน edge ไม่ได้). ถ้ามี `spk_session` cookie ที่หมดอายุ/ใช้ไม่ได้ (พบบ่อยหลังรัน `db:seed` ซึ่งล้างตาราง Session) → หน้าแรกเรียก `getCurrentUser()` (เช็ค DB จริง) ได้ null จึงโชว์ปุ่ม login แต่พอกด → middleware เห็น cookie ค้าง → เด้งกลับ `/` วน → เข้า /login ไม่ได้เลย
- แก้: ลบ logic เด้ง `/login` ออกจาก middleware + เอา `/login` ออกจาก matcher → ย้ายการเด้ง "ล็อกอินอยู่แล้ว" ไปไว้ใน [login/page.tsx](src/app/(auth)/login/page.tsx) ที่ `getCurrentUser()` เช็ค DB จริง (cookie ค้าง = null → โชว์ฟอร์ม, ผู้ใช้จริง → เด้งไป `ROLE_HOME`)
- **ตรวจสอบ:** `tsc` ✅ · รีสตาร์ท dev + curl: `stale-cookie /login` = **200** (เดิม 307→/) , `no-cookie /login` = 200, `/` = 200 ✅
- หมายเหตุ: middleware ถูก bundle ตอนเซิร์ฟเวอร์เริ่ม → **ต้องรีสตาร์ท `npm run dev`** ถึงจะมีผล (รีสตาร์ทให้แล้ว)

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
