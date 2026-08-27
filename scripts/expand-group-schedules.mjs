import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" } },
});

/** @param {string} name */
function normalize(name) {
  return name.toUpperCase().trim();
}

async function main() {
  const classes = await db.class.findMany({ select: { id: true, className: true } });
  const byName = new Map(classes.map((c) => [normalize(c.className), c]));

  // Find base groups that have dotted sub-rooms (e.g. M.5/3 -> M.5/3.1, M.5/3.2).
  const baseGroups = new Map(); // baseName -> { baseId?, subIds: [] }
  for (const c of classes) {
    const name = normalize(c.className);
    if (!name.includes(".")) continue;
    const baseName = name.replace(/\.\d+$/, "");
    if (!baseGroups.has(baseName)) baseGroups.set(baseName, { baseId: byName.get(baseName)?.id, subIds: [] });
    baseGroups.get(baseName).subIds.push(c.id);
  }

  let created = 0;
  let skipped = 0;

  for (const [baseName, { baseId, subIds }] of baseGroups.entries()) {
    if (!baseId || subIds.length === 0) continue;

    const baseSchedules = await db.schedule.findMany({
      where: { classId: baseId },
      select: { subjectId: true, teacherId: true, day: true, period: true, room: true },
    });

    if (baseSchedules.length === 0) continue;
    console.log(`Expanding ${baseName}: ${baseSchedules.length} base slots -> ${subIds.length} sub-rooms`);

    for (const slot of baseSchedules) {
      for (const subId of subIds) {
        const exists = await db.schedule.findFirst({
          where: {
            classId: subId,
            day: slot.day,
            period: slot.period,
          },
        });
        if (exists) {
          skipped++;
          continue;
        }
        await db.schedule.create({
          data: {
            classId: subId,
            subjectId: slot.subjectId,
            teacherId: slot.teacherId,
            day: slot.day,
            period: slot.period,
            room: slot.room,
          },
        });
        created++;
      }
    }
  }

  console.log(`Done. Created ${created} sub-room schedule rows, skipped ${skipped} (already existed).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
