// APPLY — backs up dev.db, then moves the 4/3 & 6/3 students into their .1/.2
// sub-rooms per the reviewed plan. 5/3 is already correct (no-op). Idempotent:
// only updates students whose target sub-room differs from their current class.
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const db = new PrismaClient();

const GROUPS = require("./split-groups.cjs");

const TITLES = ["เด็กชาย", "เด็กหญิง", "นางสาว", "นาง", "นาย"];
/** @param {string} s */
function norm(s) {
  let x = (s || "").trim();
  for (const t of TITLES) if (x.startsWith(t)) { x = x.slice(t.length); break; }
  return x.replace(/\s+/g, "");
}
/**
 * @param {string} a
 * @param {string} b
 */
function lev(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

(async () => {
  // 1) Backup the SQLite file.
  const dbPath = path.join(__dirname, "..", "prisma", "dev.db");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const bak = `${dbPath}.bak-${stamp}`;
  fs.copyFileSync(dbPath, bak);
  console.log(`✓ backup: ${path.basename(bak)}`);

  const allClasses = await db.class.findMany({ select: { id: true, className: true } });
  const idByName = new Map(allClasses.map((c) => [c.className, c.id]));

  const moves = []; // { studentId, code, name, from, to }
  for (const [parent, split] of Object.entries(GROUPS)) {
    const students = await db.student.findMany({
      where: { OR: [{ class: { className: parent } }, { class: { className: { startsWith: parent + "." } } }] },
      include: { user: true, class: true },
    });
    const entries = [];
    for (const [suffix, names] of Object.entries(split))
      for (const nm of names) entries.push({ target: parent + suffix, key: norm(nm), used: false });

    for (const s of students) {
      const k = norm(s.user.name);
      let best = null;
      for (const e of entries) {
        if (e.used) continue;
        const d = lev(k, e.key);
        if (!best || d < best.d) best = { d, e };
      }
      if (!best || best.d > 4) continue; // unmatched → leave as-is
      best.e.used = true;
      if (s.class.className !== best.e.target)
        moves.push({ studentId: s.id, code: s.studentCode, name: s.user.name, from: s.class.className, to: best.e.target });
    }
  }

  console.log(`\nจะย้าย ${moves.length} คน:`);
  for (const m of moves) console.log(`  ${m.code} ${m.name}: ${m.from} -> ${m.to}`);

  // 2) Apply in a single transaction.
  await db.$transaction(
    moves.map((m) => db.student.update({ where: { id: m.studentId }, data: { classId: idByName.get(m.to) } })),
  );
  console.log(`\n✓ ย้ายเสร็จ ${moves.length} คน`);

  // 3) Verify final counts.
  console.log("\n=== ผลลัพธ์ ===");
  for (const name of ["ม.4/3", "ม.4/3.1", "ม.4/3.2", "ม.5/3", "ม.5/3.1", "ม.5/3.2", "ม.6/3", "ม.6/3.1", "ม.6/3.2"]) {
    const c = await db.class.findUnique({ where: { className: name }, include: { _count: { select: { students: true, schedules: true } } } });
    if (c) console.log(`  ${name.padEnd(10)} students=${c._count.students}  schedules=${c._count.schedules}`);
  }
  await db.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
