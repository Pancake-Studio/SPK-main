// Recover deleted Schedule rows from a SQLite file's freelist and (optionally)
// re-insert the ones missing from the live DB. Default = DRY RUN (verify only).
// Run with `apply` as 2nd arg to actually restore (backs up dev.db first).
//
//   node scripts/recover-apply.cjs <source.db>           # dry run
//   node scripts/recover-apply.cjs <source.db> apply     # restore
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const db = new PrismaClient();

const CUID = /^c[a-z0-9]{24}$/;
const DAYS = new Set(["MON", "TUE", "WED", "THU", "FRI"]);
const SIZES = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 6, 6: 8 };

function readInt(buf, off, serial) {
  if (serial === 8) return 0;
  if (serial === 9) return 1;
  const n = SIZES[serial];
  if (!n) return null;
  let v = 0;
  for (let i = 0; i < n; i++) v = v * 256 + buf[off + i];
  return v;
}

function scan(file, known) {
  const buf = fs.readFileSync(file);
  const found = new Map();
  const sig = Buffer.from([0x3f, 0x3f, 0x3f, 0x3f, 0x13]);
  let from = 0;
  for (;;) {
    const p = buf.indexOf(sig, from);
    if (p < 0) break;
    from = p + 1;
    const hdrLen = buf[p - 1];
    if (hdrLen < 9 || hdrLen > 12) continue;
    const v = p - 1 + hdrLen;
    if (v + 103 > buf.length) continue;
    const id = buf.toString("latin1", v, v + 25);
    const classId = buf.toString("latin1", v + 25, v + 50);
    const subjectId = buf.toString("latin1", v + 50, v + 75);
    const teacherId = buf.toString("latin1", v + 75, v + 100);
    const day = buf.toString("latin1", v + 100, v + 103);
    if (![id, classId, subjectId, teacherId].every((x) => CUID.test(x))) continue;
    if (!DAYS.has(day)) continue;
    if (!known.classes.has(classId) || !known.subjects.has(subjectId) || !known.teachers.has(teacherId)) continue;
    const period = readInt(buf, v + 103, buf[p + 5]);
    if (period == null || period < 1 || period > 12) continue;
    const className = known.classes.get(classId).className;
    const key = `${className}|${day}|${period}`;
    if (!found.has(key)) found.set(key, { classId, className, subjectId, teacherId, day, period });
  }
  return found;
}

(async () => {
  const [src, mode] = [process.argv[2], process.argv[3]];
  const [classes, subjects, teachers, existing] = await Promise.all([
    db.class.findMany({ select: { id: true, className: true } }),
    db.subject.findMany({ select: { id: true, subjectCode: true, subjectName: true } }),
    db.teacher.findMany({ select: { id: true, user: { select: { name: true } } } }),
    db.schedule.findMany({ include: { class: true } }),
  ]);
  const known = {
    classes: new Map(classes.map((c) => [c.id, c])),
    subjects: new Map(subjects.map((s) => [s.id, s])),
    teachers: new Map(teachers.map((t) => [t.id, t.user.name])),
  };
  const existingKeys = new Set(existing.map((s) => `${s.class.className}|${s.day}|${s.period}`));
  // Umbrella parents (ม.4/3, ม.5/3, ม.6/3) — their shared periods already live in
  // the .1/.2 sub-rooms, so restoring them would duplicate teacher slots. Skip.
  const umbrellaParents = new Set(
    classes.filter((c) => classes.some((o) => o.className.startsWith(c.className + "."))).map((c) => c.className),
  );
  // Teacher occupancy from surviving rows (to detect conflicts with recovered).
  const teacherBusy = new Map(); // teacherId|day|period -> className
  for (const s of existing) teacherBusy.set(`${s.teacherId}|${s.day}|${s.period}`, s.class.className);

  const found = scan(src, known);
  const recoverable = [...found.values()].filter(
    (r) => !existingKeys.has(`${r.className}|${r.day}|${r.period}`) && !umbrellaParents.has(r.className),
  );

  console.log(`source: ${src}`);
  console.log(`ข้ามชั้นแม่ (คาบรวมอยู่ในห้องย่อยแล้ว): ${[...umbrellaParents].join(", ")}`);
  console.log(`คาบที่จะกู้ (ห้องปกติ ไม่อยู่ใน DB ปัจจุบัน): ${recoverable.length}`);

  // Conflict check: a teacher can't be in two rooms at the same day+period.
  const conflicts = [];
  const tb = new Map(teacherBusy);
  for (const r of recoverable) {
    const k = `${r.teacherId}|${r.day}|${r.period}`;
    if (tb.has(k)) conflicts.push({ r, other: tb.get(k) });
    else tb.set(k, r.className);
  }
  console.log(`ครูชนเวลา (กับของเดิม/กันเอง): ${conflicts.length}`);
  for (const c of conflicts.slice(0, 12))
    console.log(`  ! ${known.teachers.get(c.r.teacherId)} ${c.r.day}#${c.r.period}: ${c.r.className} vs ${c.other}`);

  // Sample a couple of rooms for eyeballing.
  for (const sample of ["ม.5/1", "ม.1/1"]) {
    const rows = recoverable.filter((r) => r.className === sample).sort((a, b) => a.day.localeCompare(b.day) || a.period - b.period);
    console.log(`\n--- ตัวอย่าง ${sample} (${rows.length} คาบ) ---`);
    for (const r of rows)
      console.log(`  ${r.day}#${r.period}  ${known.subjects.get(r.subjectId).subjectCode} (${known.teachers.get(r.teacherId)})`);
  }

  if (mode !== "apply") {
    console.log("\n[DRY RUN] ยังไม่เขียน DB — รันซ้ำด้วยอาร์กิวเมนต์ apply เพื่อกู้จริง");
    await db.$disconnect();
    return;
  }

  // Fresh backup, then insert (skip any key that now exists).
  const dbPath = path.join(__dirname, "..", "prisma", "dev.db");
  const bak = `${dbPath}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  fs.copyFileSync(dbPath, bak);
  console.log(`\n✓ backup: ${path.basename(bak)}`);

  let inserted = 0;
  for (const r of recoverable) {
    if (existingKeys.has(`${r.className}|${r.day}|${r.period}`)) continue;
    try {
      await db.schedule.create({ data: { classId: r.classId, subjectId: r.subjectId, teacherId: r.teacherId, day: r.day, period: r.period } });
      inserted++;
    } catch (e) {
      console.log(`  skip ${r.className} ${r.day}#${r.period}: ${e.code || e.message}`);
    }
  }
  console.log(`✓ กู้คืน ${inserted} คาบ`);
  const total = await db.schedule.count();
  console.log(`รวมตารางตอนนี้: ${total}`);
  await db.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
