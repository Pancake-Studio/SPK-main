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
  - สร้างไอคอน PNG จาก SVG ด้วย sharp ([scripts/gen-icons.mjs](scripts/gen-icons.mjs) — รันซ้ำได้): `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (พื้นทึบ #7C3AED), `badge.png` (กลีฟขาวพื้นโปร่ง) + [public/badge.svg](public/badge.svg)
  - เดินสายไอคอน: [manifest.ts](src/app/manifest.ts) (PNG 192/512/maskable + svg fallback), [layout.tsx](src/app/layout.tsx) (`apple-touch-icon.png` 180 + png icons), [public/sw.js](public/sw.js) (`icon:/icon-192.png`, `badge:/badge.png`, bump `sw-version: 2` เพื่อบังคับ SW อัปเดตที่ไคลเอนต์)
  - **ซ่อม type-check ที่บล็อกบิลด์:** `@types/minimatch@6.0.0` เป็น stub ว่าง (ไม่มี `index.d.ts`, ถูกดึงผ่าน `@types/glob`, มาจากการ reinstall ด้วย bun) → `TS2688`. แก้โดย pin เป็น `5.1.2` (ตัวสุดท้ายที่มี types จริง) ทั้งใน devDependencies และ `overrides` ของ [package.json](package.json)
- **ตรวจสอบ:**
  - `next build` (Turbopack) — **ผ่าน, 23 routes** ✅ (เดิมล้มด้วย WorkerError)
  - ส่ง push จริงผ่าน [scripts/pushtest.mjs](scripts/pushtest.mjs) (`--dns-result-order=ipv4first`) → **statusCode 201 ทั้ง 2 subscription** (WNS/Edge) ✅
  - เสิร์ฟจริงบน dev server: `/sw.js /manifest.webmanifest /icon-192.png /icon-512.png /apple-touch-icon.png /badge.png /icon-maskable-512.png` = **200 + content-type ถูกต้อง** (PNG = image/png), manifest อ้าง PNG, sw.js เป็น v2 ✅
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
