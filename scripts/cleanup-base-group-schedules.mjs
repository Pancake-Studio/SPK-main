import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" } },
});

function normalize(name) {
  return name.toUpperCase().trim();
}

async function main() {
  const classes = await db.class.findMany({ select: { id: true, className: true } });
  const byName = new Map(classes.map((c) => [normalize(c.className), c]));

  // Find base groups that have dotted sub-rooms (e.g. M.5/3 -> M.5/3.1, M.5/3.2).
  const baseGroupIds = [];
  for (const c of classes) {
    const name = normalize(c.className);
    if (!name.includes(".")) continue;
    const baseName = name.replace(/\.\d+$/, "");
    const base = byName.get(baseName);
    if (base && !baseGroupIds.includes(base.id)) {
      baseGroupIds.push(base.id);
    }
  }

  if (baseGroupIds.length === 0) {
    console.log("No base groups with sub-rooms found.");
    return;
  }

  // Only delete base-group schedule rows that are not referenced by swaps or delegations.
  const candidates = await db.schedule.findMany({
    where: {
      classId: { in: baseGroupIds },
      delegations: { none: {} },
      swapsAsSource: { none: {} },
      swapsAsTarget: { none: {} },
    },
    select: { id: true, class: { select: { className: true } } },
  });

  if (candidates.length === 0) {
    console.log("No deletable base-group schedule rows found (they may be referenced by swaps/delegations).");
    return;
  }

  const byClass = new Map();
  for (const s of candidates) {
    const name = s.class.className;
    byClass.set(name, (byClass.get(name) || 0) + 1);
  }

  const ids = candidates.map((s) => s.id);
  const { count } = await db.schedule.deleteMany({ where: { id: { in: ids } } });

  console.log(`Deleted ${count} base-group schedule rows:`);
  for (const [name, cnt] of byClass.entries()) {
    console.log(`  ${name}: ${cnt}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
