// DRY-RUN ONLY — no DB writes. Resolves the user-provided .1/.2 name lists to
// real studentCodes (fuzzy, tolerant of spelling/spacing/title differences) and
// prints a plan for human review before any move is applied.
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const GROUPS = require("./split-groups.cjs");

const TITLES = ["เด็กชาย", "เด็กหญิง", "นางสาว", "นาง", "นาย"];
function norm(s) {
  let x = (s || "").trim();
  for (const t of TITLES) if (x.startsWith(t)) { x = x.slice(t.length); break; }
  return x.replace(/\s+/g, "");
}
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
  const allClasses = await db.class.findMany({ select: { id: true, className: true } });
  const subIdByName = new Map(allClasses.map((c) => [c.className, c.id]));

  for (const [parent, split] of Object.entries(GROUPS)) {
    console.log(`\n========== ${parent} ==========`);
    // Candidate students = currently in parent OR any sub-room of it.
    const students = await db.student.findMany({
      where: { OR: [{ class: { className: parent } }, { class: { className: { startsWith: parent + "." } } }] },
      include: { user: true, class: true },
    });
    // Flatten user entries with their target subclass.
    const entries = [];
    for (const [suffix, names] of Object.entries(split))
      for (const nm of names) entries.push({ target: parent + suffix, name: nm, key: norm(nm), used: false });

    const plan = [];
    for (const s of students) {
      const k = norm(s.user.name);
      let best = null;
      for (const e of entries) {
        if (e.used) continue;
        const d = lev(k, e.key);
        if (!best || d < best.d) best = { d, e };
      }
      if (best) best.e.used = true;
      plan.push({ s, best });
    }

    plan.sort((a, b) => (a.s.rollNumber ?? 0) - (b.s.rollNumber ?? 0));
    for (const { s, best } of plan) {
      const tag = !best ? "??" : best.d === 0 ? "OK " : best.d <= 3 ? `~${best.d} ` : `!! ${best.d}`;
      const tgt = best ? best.e.target : "—";
      const from = s.class.className;
      const moved = from !== tgt ? "  <== MOVE" : "  (same)";
      console.log(`[${tag}] ${s.studentCode.padEnd(7)} ${("รหัส " + (s.rollNumber ?? "-")).padEnd(0)}\t${(s.title ?? "") + s.user.name}\n        ${from} -> ${tgt}${moved}${best && best.d > 0 ? `   (matched: "${best.e.name}")` : ""}`);
    }
    const unused = entries.filter((e) => !e.used);
    if (unused.length) {
      console.log(`  -- ชื่อในลิสต์ที่จับคู่ไม่ได้ (ไม่มีในห้องนี้): ${unused.map((e) => e.name).join(", ")}`);
    }
    // rollNumber conflict check within each target subclass (existing + incoming).
    for (const suffix of Object.keys(split)) {
      const tgt = parent + suffix;
      const tgtId = subIdByName.get(tgt);
      if (!tgtId) { console.log(`  -- !! ไม่พบห้องปลายทาง ${tgt} ใน DB`); continue; }
      const existing = await db.student.findMany({ where: { classId: tgtId }, select: { rollNumber: true } });
      const rolls = new Map();
      for (const e of existing) if (e.rollNumber != null) rolls.set(e.rollNumber, (rolls.get(e.rollNumber) || 0) + 1);
      for (const { s, best } of plan) if (best && best.e.target === tgt && s.class.className !== tgt && s.rollNumber != null)
        rolls.set(s.rollNumber, (rolls.get(s.rollNumber) || 0) + 1);
      const dup = [...rolls.entries()].filter(([, n]) => n > 1).map(([r]) => r);
      if (dup.length) console.log(`  -- !! เลขที่ชนกันใน ${tgt}: ${dup.join(", ")}`);
    }
  }
  await db.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
