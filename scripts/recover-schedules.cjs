// READ-ONLY forensic scan: find deleted Schedule rows still lingering in a
// SQLite file's freelist/freeblock pages and reconstruct them by mapping the
// cuid references against classes/subjects/teachers that still exist.
//
// A Schedule record's payload header begins (after the 1-byte header length):
//   3F 3F 3F 3F 13  =  text(25) text(25) text(25) text(25) text(3)
//   = id, classId, subjectId, teacherId, day("MON"/"TUE"/...)
// followed by period (int) etc. The 13 (=text length 3, the day) makes this
// signature quite specific to Schedule.
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const db = new PrismaClient();

const CUID = /^c[a-z0-9]{24}$/;
const DAYS = new Set(["MON", "TUE", "WED", "THU", "FRI"]);

/**
 * @param {Buffer} buf
 * @param {number} off
 * @param {number} serial
 */
function readInt(buf, off, serial) {
  // SQLite serial types for ints.
  /** @type {Record<number, number>} */
  const sizes = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 6, 6: 8 };
  if (serial === 8) return 0;
  if (serial === 9) return 1;
  const n = sizes[serial];
  if (!n) return null;
  let v = 0;
  for (let i = 0; i < n; i++) v = v * 256 + buf[off + i];
  return v;
}

/**
 * @param {string} file
 * @param {{
 *   classes: Map<string, string>,
 *   subjects: Map<string, string>,
 *   teachers: Map<string, string>
 * }} known
 */
function scan(file, known) {
  const buf = fs.readFileSync(file);
  /** @type {Map<string, {
   *   className: string,
   *   day: string,
   *   period: number,
   *   subject: string | undefined,
   *   teacher: string | undefined
   * }>} */
  const found = new Map(); // key className|day|period -> {..}
  const sig = Buffer.from([0x3f, 0x3f, 0x3f, 0x3f, 0x13]);
  let from = 0;
  for (;;) {
    const p = buf.indexOf(sig, from);
    if (p < 0) break;
    from = p + 1;
    const hdrLen = buf[p - 1]; // header-length varint (single byte for small headers)
    if (hdrLen < 9 || hdrLen > 12) continue;
    const valStart = p - 1 + hdrLen;
    if (valStart + 25 * 4 + 3 > buf.length) continue;
    const id = buf.toString("latin1", valStart, valStart + 25);
    const classId = buf.toString("latin1", valStart + 25, valStart + 50);
    const subjectId = buf.toString("latin1", valStart + 50, valStart + 75);
    const teacherId = buf.toString("latin1", valStart + 75, valStart + 100);
    const day = buf.toString("latin1", valStart + 100, valStart + 103);
    if (!CUID.test(id) || !CUID.test(classId) || !CUID.test(subjectId) || !CUID.test(teacherId)) continue;
    if (!DAYS.has(day)) continue;
    if (!known.classes.has(classId) || !known.subjects.has(subjectId) || !known.teachers.has(teacherId)) continue;
    // period: 6th serial type byte (after the 0x13 at p+4) is at p+5.
    const periodSerial = buf[p + 5];
    const period = readInt(buf, valStart + 103, periodSerial);
    if (period == null || period < 1 || period > 12) continue;
    const className = known.classes.get(classId);
    const key = `${className}|${day}|${period}`;
    if (!found.has(key))
      found.set(key, {
        className, day, period,
        subject: known.subjects.get(subjectId),
        teacher: known.teachers.get(teacherId),
      });
  }
  return found;
}

(async () => {
  const [classes, subjects, teachers, existing] = await Promise.all([
    db.class.findMany({ select: { id: true, className: true } }),
    db.subject.findMany({ select: { id: true, subjectCode: true, subjectName: true } }),
    db.teacher.findMany({ select: { id: true, user: { select: { name: true } } } }),
    db.schedule.findMany({ include: { class: true } }),
  ]);
  const known = {
    classes: new Map(classes.map((c) => [c.id, c.className])),
    subjects: new Map(subjects.map((s) => [s.id, `${s.subjectCode}/${s.subjectName}`])),
    teachers: new Map(teachers.map((t) => [t.id, t.user.name])),
  };
  const existingKeys = new Set(existing.map((s) => `${s.class.className}|${s.day}|${s.period}`));

  for (const file of process.argv.slice(2)) {
    const found = scan(file, known);
    const recoverable = [...found.values()].filter((r) => !existingKeys.has(`${r.className}|${r.day}|${r.period}`));
    console.log(`\n===== ${file} =====`);
    console.log(`พบ record Schedule ที่ map ได้ทั้งหมด: ${found.size} · ที่ไม่อยู่ใน DB ปัจจุบัน (น่าจะคือที่ถูกลบ): ${recoverable.length}`);
    /** @type {Record<string, typeof recoverable>} */
    const byClass = {};
    for (const r of recoverable) (byClass[r.className] ??= []).push(r);
    for (const cn of Object.keys(byClass).sort())
      console.log(`  ${cn.padEnd(10)} ${byClass[cn].length} คาบ`);
  }
  await db.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
