# School Productivity Kits

แพลตฟอร์มดิจิทัลกลางสำหรับโรงเรียน — จัดการตารางสอน/ตารางเรียน, ระบบแลกคาบสอนของครู,
การแจ้งเตือนแบบเรียลไทม์, ประกาศ และแผงควบคุมผู้ดูแลระบบ สำหรับ **Admin / ครู / นักเรียน**

สเปกฉบับเต็มอยู่ใน [docs/PROMPT.md](docs/PROMPT.md) และ [docs/DESIGN.md](docs/DESIGN.md)
ความคืบหน้าและการตัดสินใจเชิงเทคนิคอยู่ใน [PROGRESS.md](PROGRESS.md)

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 (ธีม Purple/Yellow + Light/Dark)
· Radix UI · Framer Motion · Prisma 6 (SQLite dev / PostgreSQL prod) · Zod 4 · bcryptjs · SSE realtime

## เริ่มต้นใช้งาน

```bash
npm install
cp .env.example .env          # (มี .env ให้แล้วสำหรับ dev)
npx prisma db push            # สร้างฐานข้อมูล SQLite ที่ prisma/dev.db
npm run db:seed               # ใส่ข้อมูลตัวอย่าง
npm run dev                   # http://localhost:3000
```

เปิด [http://localhost:3000](http://localhost:3000)

### บัญชีทดลอง

| บทบาท | อีเมล | รหัสผ่าน |
|-------|-------|----------|
| Admin | `admin@spk.ac.th` | `admin123` |
| ครู | `somchai@spk.ac.th` | `password123` |
| นักเรียน | `s0001@spk.ac.th` | `password123` |

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
|--------|--------|
| `npm run dev` | รัน dev server |
| `npm run build` | สร้าง production build |
| `npm run start` | รัน production build |
| `npm run db:studio` | เปิด Prisma Studio (ดู/แก้ข้อมูล) |
| `npm run db:seed` | รีเซ็ต + ใส่ข้อมูลตัวอย่าง |
| `npm run lint` | ตรวจ ESLint |

## ใช้ PostgreSQL สำหรับ production

1. ใน [prisma/schema.prisma](prisma/schema.prisma) เปลี่ยน `provider = "sqlite"` เป็น `"postgresql"`
2. ตั้ง `DATABASE_URL` เป็น connection string ของ Postgres
3. รัน `npx prisma migrate deploy` (หรือ `db push`) แล้ว `npm run db:seed`

schema ถูกออกแบบให้พกพาได้ (ใช้ string enums, ไม่มี scalar arrays) จึงสลับฐานข้อมูลได้โดยไม่ต้องแก้ models

## การแจ้งเตือนบนอุปกรณ์ (Web Push)

- ต้องมี VAPID keys ใน `.env` (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).
  สร้าง: `node -e "console.log(require('web-push').generateVAPIDKeys())"`
- **สำคัญ:** ค่า `NEXT_PUBLIC_*` ถูกฝังตอน build → ถ้าเพิ่งเพิ่มคีย์ ต้อง **รีสตาร์ท `npm run dev`** (หรือ rebuild)
- ใช้ได้บน **localhost หรือ HTTPS เท่านั้น** (เปิดผ่าน LAN-IP แบบ http จะไม่ทำงาน)
- ทดสอบ: เข้า **Settings → การแจ้งเตือน → "ส่งการแจ้งเตือนทดสอบ"** ควรเห็น notification เด้งบนเครื่อง.
  ปุ่มจะบอกผลจริง (0 อุปกรณ์ = ยังไม่ได้กด "เปิด" / error = คีย์ไม่ตรง ดู log เซิร์ฟเวอร์)
- iOS: ใช้ได้เฉพาะหลัง **ติดตั้งลงหน้าจอหลัก** (iOS 16.4+)

## โครงสร้างโดยย่อ

```
src/app/            หน้าเว็บ (App Router) — (app) = โซนล็อกอิน, (auth) = login, api/realtime = SSE
src/components/     ui/ (พื้นฐาน), layout/, timetable/, swap/, notifications/, admin/
src/lib/            utils, constants, auth, validations, timetable, nav, role
src/server/         services/ (business logic), actions/ (server actions), realtime.ts
prisma/             schema.prisma, seed.ts
```
