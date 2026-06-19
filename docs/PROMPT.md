ฉันต้องการพัฒนาเว็บแอปพลิเคชันสำหรับโรงเรียน (School Management Web Application) ที่ใช้งานได้จริงภายในโรงเรียน โดยระบบนี้จะเป็นแพลตฟอร์มหลักของโรงเรียนสำหรับทั้งคุณครู นักเรียน และผู้ดูแลระบบ (Admin) ใช้สำหรับการจัดการตารางเรียน การสื่อสารภายในโรงเรียน การแจ้งเตือน และการบริหารจัดการข้อมูลต่าง ๆ อย่างเป็นระบบ ปลอดภัย และสามารถรองรับการขยายระบบในอนาคตได้

Tech stack หลักที่ต้องการให้ใช้คือ Next.js (App Router) พร้อม TypeScript เพื่อให้ codebase มี type safety และ maintain ได้ง่ายในระยะยาว โดยต้องการให้ architecture แยก concern อย่างชัดเจนระหว่าง frontend, backend, database, services และ infrastructure เพื่อให้ระบบสามารถ scale ได้ในระดับ production จริง

Frontend ต้องใช้ Next.js เป็นหลัก โดยต้องเน้นการใช้ Server Components และ Server Side Rendering (SSR) สำหรับหน้าที่ต้องใช้ข้อมูลแบบ real-time หรือ sensitive เช่น dashboard, ตารางเรียน, ระบบแลกคาบ, notification center และข้อมูลผู้ใช้งาน เพราะ SSR จะช่วยเพิ่มทั้ง security, SEO (สำหรับ public pages) และความเสถียรของการโหลดข้อมูล ส่วนหน้าที่ไม่ได้เปลี่ยนบ่อย เช่น หน้าเกี่ยวกับโรงเรียน ข่าวประชาสัมพันธ์ ข้อมูลติดต่อ หรือหน้า landing page ควรใช้ Static Site Generation (SSG) เพื่อประหยัด resource ของ server และเพิ่ม performance

แนวคิด rendering ที่ต้องการ:

* Sensitive pages → SSR
* Mostly static pages → SSG
* Interactive components → Client Components เท่าที่จำเป็นเท่านั้น

UI Framework ที่แนะนำให้ใช้และเข้ากันได้ดีกับ Next.js:

1. Tailwind CSS — ใช้สำหรับ utility-first styling ที่ maintain ง่าย
2. shadcn/ui — เป็น component system ที่ modern, clean และ customizable สูง
3. Radix UI — ใช้สำหรับ accessible primitives เช่น Dialog, Dropdown, Popover, Toast
4. Framer Motion — ใช้สำหรับ animation ที่ minimal และ smooth
5. Lucide Icons — icon system ที่ clean และ consistent
6. TanStack Table — เหมาะกับตารางข้อมูลจำนวนมาก เช่น ตารางเรียน รายชื่อนักเรียน
7. TanStack Query หรือ React Query — ใช้สำหรับ client-side cache เมื่อจำเป็น
8. React Hook Form + Zod — ใช้จัดการ forms และ validation

ต้องการ UI ที่ดูเป็นทางการและเหมาะกับโรงเรียน ไม่ flashy ไม่ดูเหมือน AI-generated template และไม่ใช้ gradient เยอะเกินไป

Design direction:

* Modern institutional design
* Clean spacing
* Professional layout
* Typography อ่านง่าย
* Formal but friendly

Color palette:

* White
* Gray
* Navy Blue
* Accent color ตามสีประจำโรงเรียน

Animation:

* Minimal
* Fast
* Functional
* ไม่ distracting

Backend ต้องเป็น production-grade backend รองรับ concurrent users จำนวนมาก โดยสามารถเลือกใช้:

* Next.js API Routes + Server Actions
  หรือ
* แยก backend service ด้วย Node.js + NestJS (preferred หากระบบใหญ่)

ต้องออกแบบ architecture แบบ service-based:

* Auth Service
* Schedule Service
* Notification Service
* Swap Service
* Admin Service

Database ต้องใช้ PostgreSQL เป็น relational database หลัก เพราะระบบโรงเรียนมี relational data เยอะ เช่น นักเรียน ห้องเรียน วิชา ครู ตารางเรียน และ request ต่าง ๆ

ต้องใช้ Prisma ORM เป็น ORM หลักในการเชื่อมต่อ database กับ backend เนื่องจาก Prisma มี type safety สูง ใช้งานร่วมกับ TypeScript ได้ดี และ migration management ชัดเจนมาก

Prisma ต้องใช้สำหรับ:

* Schema definition
* Database migrations
* Query abstraction
* Relations
* Type-safe CRUD

ตัวอย่าง Prisma models ที่ควรมี:

User

* id
* email
* passwordHash
* role
* createdAt

Teacher

* id
* userId
* teacherCode
* department

Student

* id
* userId
* studentCode
* classId

Class

* id
* className
* gradeLevel

Subject

* id
* subjectName
* subjectCode

Schedule

* id
* teacherId
* classId
* subjectId
* day
* period

SwapRequest

* id
* requesterId
* targetTeacherId
* sourceScheduleId
* targetScheduleId
* status
* createdAt

Notification

* id
* userId
* title
* message
* isRead

ระบบ Authentication ต้องปลอดภัยสูง

Requirements:

* Role-based authentication
* JWT หรือ session auth
* Refresh token
* HttpOnly cookies
* CSRF protection
* Secure headers
* Password hashing ด้วย Argon2 หรือ bcrypt

Roles:

* Admin
* Teacher
* Student

Authorization ต้องเป็น RBAC (Role-Based Access Control)

ตัวอย่าง:

* Teacher เข้าถึงได้เฉพาะ schedule ของตัวเอง
* Student ดูได้เฉพาะห้องของตัวเอง
* Admin จัดการได้ทั้งหมด

Security requirements:

* API key สำหรับ internal services
* Rate limiting
* SQL injection protection
* XSS prevention
* Zod validation
* Audit logging
* Error boundary
* Request sanitization

ระบบต้องมี notification แบบ real-time

Technology ที่แนะนำ:

* WebSocket
  หรือ
* Socket.IO

สำหรับ mobile push notification:
แนะนำใช้ Firebase Cloud Messaging (FCM)

Notification types:

* Swap request
* Swap approved
* Swap rejected
* Schedule changed
* School announcements
* Emergency alert

Main Feature 1 (Core Feature): Teacher Period Swap System

นี่คือ feature หลักของระบบ

ครูแต่ละคนสามารถ login เข้า dashboard และเห็นตารางสอนของตัวเองในรูปแบบ timetable

ตัวอย่าง:
Period 1 → Monday → Math M.4/1
Period 2 → Tuesday → Physics M.5/2

ครูสามารถกดเลือกคาบที่ต้องการแลก และกด Request Swap

เมื่อกดแล้วระบบต้องเปิด modal/form สำหรับกรอก:

* Current teaching slot
* Teacher ที่ต้องการแลก
* Target period
* Reason (optional)

เมื่อส่ง request:

1. บันทึกลง database
2. สร้าง notification
3. Push ไปหา teacher เป้าหมาย
4. Update real-time dashboard

ครูอีกฝ่ายจะเห็น notification ทันที:
“Teacher A wants to swap Period 3 with your Period 5”

Actions:

* Approve
* Reject

หาก Approve:

* Update schedules
* Update timetable
* Save logs
* Notify requester
* Notify students

Logs ต้องเก็บ:

* Who requested
* Who approved
* Previous schedule
* New schedule
* Timestamp

หาก Reject:

* เปลี่ยน status เป็น rejected
* แจ้ง requester

Main Feature 2: Student Schedule Viewer

นักเรียนต้องสามารถ login และเห็น dashboard ส่วนตัว

ข้อมูลที่ต้องเห็น:

1. ตารางเรียนวันนี้
2. ตารางเรียนทั้งสัปดาห์
3. คาบปัจจุบัน
4. คาบถัดไป
5. การเปลี่ยนแปลงตารางล่าสุด

Dashboard example:
Current Class:
Mathematics

Teacher:
Mr. Somchai

Room:
Building A Room 402

Next Class:
Physics

Weekly timetable ต้องแสดงในรูปแบบ responsive:
Desktop → Full grid
Mobile → Card layout

เมื่อเกิดการแลกคาบ:
นักเรียนทุกคนในห้องนั้นต้องได้รับ notification

Example:
Schedule updated:
Period 3 teacher changed from Mr. A to Mr. B

Main Feature 3: Admin Panel

Admin ต้องมี dashboard สำหรับจัดการระบบทั้งหมด

Features:

* Manage teachers
* Manage students
* Manage classes
* Manage subjects
* Manage schedules
* Import timetable via CSV/Excel
* Monitor swap requests
* Broadcast announcements

Admin analytics:

* Number of teachers
* Number of students
* Pending swap requests
* Daily activity

File handling:
ใช้ upload system สำหรับ:

* CSV
* Excel

Recommended libraries:

* PapaParse
* XLSX

Performance requirements:

* Initial load < 2 sec
* Notification delay < 3 sec
* Efficient DB queries
* Optimized rendering
* Lazy loading where needed

Caching:
ใช้ Redis สำหรับ:

* Session storage
* Caching
* Rate limiting
* Temporary queue

Infrastructure:
Frontend:
Deploy on Vercel

Backend:

* VPS
  หรือ
* Docker containers

Database:
Managed PostgreSQL

DevOps:

* Docker
* CI/CD
* GitHub Actions
* Environment variables management
* Secret rotation

Testing:

* Unit test
* Integration test
* E2E test

Testing stack:

* Vitest
* Jest
* Playwright

Code quality:

* ESLint
* Prettier
* Husky
* Commit lint

Architecture style:

* Modular
* Scalable
* Maintainable
* Production ready
* Secure by default

Recommended Final Stack:

Frontend:

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui
* Radix UI
* Framer Motion

Backend:

* Next.js Server Actions / NestJS
* Node.js

Database:

* PostgreSQL
* Prisma ORM

Realtime:

* WebSocket / Socket.IO
* Firebase Cloud Messaging

Caching:

* Redis

Validation:

* Zod
* React Hook Form

Testing:

* Playwright
* Vitest
* Jest

เป้าหมายของระบบนี้คือทำให้โรงเรียนมี digital platform ที่รวมทุกอย่างไว้ในที่เดียว ใช้งานง่ายสำหรับครูและนักเรียน รองรับมือถือ มีความปลอดภัยสูง และสามารถขยายต่อไปเป็นระบบโรงเรียนเต็มรูปแบบได้ เช่น ระบบเช็กชื่อ ระบบผลการเรียน ระบบส่งใบลา ระบบชำระเงิน และ parent portal ในอนาคต
