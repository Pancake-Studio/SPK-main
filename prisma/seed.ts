import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DAY_KEYS } from "../src/lib/constants";

const db = new PrismaClient();

const DEMO_PASSWORD = "password123";
const ADMIN_PASSWORD = "admin123";

async function main() {
  console.log("🌱 Seeding SPK School Platform…");

  // Clean slate (children first to satisfy FKs).
  await db.swapLog.deleteMany();
  await db.swapRequest.deleteMany();
  await db.notification.deleteMany();
  await db.announcement.deleteMany();
  await db.auditLog.deleteMany();
  await db.session.deleteMany();
  await db.schedule.deleteMany();
  await db.student.deleteMany();
  await db.teacher.deleteMany();
  await db.class.deleteMany();
  await db.subject.deleteMany();
  await db.user.deleteMany();

  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // --- Admin --------------------------------------------------------------
  await db.user.create({
    data: {
      email: "admin@spk.ac.th",
      passwordHash: adminHash,
      role: "ADMIN",
      name: "ผู้ดูแลระบบ (Admin)",
    },
  });

  // --- Subjects -----------------------------------------------------------
  const subjectData = [
    { subjectName: "Mathematics", subjectCode: "MATH", colorHex: "#7C3AED" },
    { subjectName: "Physics", subjectCode: "PHYS", colorHex: "#2563EB" },
    { subjectName: "Chemistry", subjectCode: "CHEM", colorHex: "#0EA5E9" },
    { subjectName: "Biology", subjectCode: "BIO", colorHex: "#16A34A" },
    { subjectName: "English", subjectCode: "ENG", colorHex: "#EA580C" },
    { subjectName: "Thai", subjectCode: "THAI", colorHex: "#DC2626" },
    { subjectName: "Social Studies", subjectCode: "SOC", colorHex: "#CA8A04" },
    { subjectName: "Computer Science", subjectCode: "COMP", colorHex: "#9333EA" },
  ];
  const subjects = [];
  for (const s of subjectData) {
    subjects.push(await db.subject.create({ data: s }));
  }

  // --- Classes ------------------------------------------------------------
  const classData = [
    { className: "M.4/1", gradeLevel: "M.4", room: "Building A 401" },
    { className: "M.4/2", gradeLevel: "M.4", room: "Building A 402" },
    { className: "M.5/1", gradeLevel: "M.5", room: "Building B 501" },
    { className: "M.5/2", gradeLevel: "M.5", room: "Building B 502" },
    { className: "M.6/1", gradeLevel: "M.6", room: "Building C 601" },
  ];
  const classes = [];
  for (const c of classData) {
    classes.push(await db.class.create({ data: c }));
  }

  // --- Teachers -----------------------------------------------------------
  const teacherData = [
    { name: "Somchai Jaidee", code: "T001", title: "Mr.", dept: "Mathematics", email: "somchai@spk.ac.th" },
    { name: "Malee Rakdee", code: "T002", title: "Mrs.", dept: "Science", email: "malee@spk.ac.th" },
    { name: "Anan Sukjai", code: "T003", title: "Mr.", dept: "Languages", email: "anan@spk.ac.th" },
    { name: "Wipa Boonmee", code: "T004", title: "Ms.", dept: "Science", email: "wipa@spk.ac.th" },
    { name: "Prasert Maneerat", code: "T005", title: "Mr.", dept: "Technology", email: "prasert@spk.ac.th" },
    { name: "Suda Chaisuk", code: "T006", title: "Mrs.", dept: "Languages", email: "suda@spk.ac.th" },
    { name: "Niran Pongsak", code: "T007", title: "Mr.", dept: "Social Studies", email: "niran@spk.ac.th" },
    { name: "Kanya Wattana", code: "T008", title: "Ms.", dept: "Science", email: "kanya@spk.ac.th" },
  ];
  const teachers = [];
  for (const t of teacherData) {
    const user = await db.user.create({
      data: {
        email: t.email,
        passwordHash: demoHash,
        role: "TEACHER",
        name: t.name,
        teacher: {
          create: {
            teacherCode: t.code,
            title: t.title,
            department: t.dept,
          },
        },
      },
      include: { teacher: true },
    });
    teachers.push(user.teacher!);
  }

  // --- Students -----------------------------------------------------------
  const firstNames = ["Nattapong", "Suchada", "Kittipong", "Pimchanok", "Thanawat", "Araya", "Chayan", "Ploy", "Worawit", "Siriporn"];
  let studentNo = 1;
  for (const cls of classes) {
    for (let i = 0; i < 4; i++) {
      const fn = firstNames[(studentNo - 1) % firstNames.length]!;
      const code = `S${String(studentNo).padStart(4, "0")}`;
      await db.user.create({
        data: {
          email: `${code.toLowerCase()}@spk.ac.th`,
          passwordHash: demoHash,
          role: "STUDENT",
          name: `${fn} ${cls.className.replace(/[./]/g, "")}`,
          student: {
            create: { studentCode: code, classId: cls.id },
          },
        },
      });
      studentNo++;
    }
  }

  // --- Schedules (timetable) ---------------------------------------------
  // Deterministic fill: each class gets periods 1–6, Mon–Fri, rotating through
  // subjects/teachers so every (class, day, period) is unique.
  const periodsPerDay = 6;
  for (let ci = 0; ci < classes.length; ci++) {
    const cls = classes[ci]!;
    let rot = ci; // offset per class so timetables differ
    for (const day of DAY_KEYS) {
      for (let p = 1; p <= periodsPerDay; p++) {
        const subject = subjects[rot % subjects.length]!;
        const teacher = teachers[rot % teachers.length]!;
        await db.schedule.create({
          data: {
            classId: cls.id,
            subjectId: subject.id,
            teacherId: teacher.id,
            day,
            period: p,
            room: cls.room,
          },
        });
        rot++;
      }
    }
  }

  // --- Announcements ------------------------------------------------------
  const admin = await db.user.findUniqueOrThrow({
    where: { email: "admin@spk.ac.th" },
  });
  await db.announcement.createMany({
    data: [
      {
        title: "ยินดีต้อนรับสู่ระบบ SPK Platform",
        body: "ระบบจัดการตารางเรียนและการแลกคาบสอนพร้อมใช้งานแล้ว ครูและนักเรียนสามารถเข้าสู่ระบบเพื่อดูตารางของตนเองได้",
        audience: "ALL",
        isUrgent: false,
        authorId: admin.id,
      },
      {
        title: "ประชุมครูประจำเดือน",
        body: "ขอเชิญคุณครูทุกท่านเข้าร่วมประชุมในวันศุกร์ที่จะถึงนี้ เวลา 15:30 น. ณ ห้องประชุมใหญ่",
        audience: "TEACHERS",
        isUrgent: false,
        authorId: admin.id,
      },
    ],
  });

  const teacherCount = teachers.length;
  const studentCount = await db.student.count();
  const scheduleCount = await db.schedule.count();

  console.log("✅ Seed complete.");
  console.log(`   Subjects: ${subjects.length}, Classes: ${classes.length}`);
  console.log(`   Teachers: ${teacherCount}, Students: ${studentCount}, Schedules: ${scheduleCount}`);
  console.log("\n🔑 Demo logins:");
  console.log(`   Admin   → admin@spk.ac.th / ${ADMIN_PASSWORD}`);
  console.log(`   Teacher → somchai@spk.ac.th / ${DEMO_PASSWORD}`);
  console.log(`   Student → s0001@spk.ac.th / ${DEMO_PASSWORD}`);
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await db.$disconnect();
    process.exit(1);
  });
