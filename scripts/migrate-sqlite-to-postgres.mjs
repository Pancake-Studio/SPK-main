#!/usr/bin/env node
/**
 * One-way migration from the local SQLite dev.db to the configured PostgreSQL
 * DATABASE_URL. Run this BEFORE the app starts serving traffic from Postgres.
 *
 * Usage:
 *   node scripts/migrate-sqlite-to-postgres.mjs
 */

import { PrismaClient as PgClient } from "@prisma/client";
import { PrismaClient as SqliteClient } from "@prisma/sqlite-client";

const sqlite = new SqliteClient({ log: ["error"] });
const pg = new PgClient({ log: ["error"] });

/** @param {string} msg */
function log(msg) {
  // eslint-disable-next-line no-console
  console.log(`[migrate] ${msg}`);
}

async function migrate() {
  log("reading from SQLite...");

  // Read all source data preserving IDs and relationships.
  const data = {
    users: await sqlite.user.findMany(),
    classes: await sqlite.class.findMany(),
    subjects: await sqlite.subject.findMany(),
    bellSchedules: await sqlite.bellSchedule.findMany(),
    daySwaps: await sqlite.daySwap.findMany(),
    activityPeriods: await sqlite.activityPeriod.findMany(),

    teachers: await sqlite.teacher.findMany(),
    students: await sqlite.student.findMany(),
    announcements: await sqlite.announcement.findMany(),
    bellSlots: await sqlite.bellSlot.findMany(),
    scheduleOverrides: await sqlite.scheduleOverride.findMany(),
    assignments: await sqlite.assignment.findMany(),
    accounts: await sqlite.account.findMany(),
    sessions: await sqlite.session.findMany(),
    verificationTokens: await sqlite.verificationToken.findMany(),
    auditLogs: await sqlite.auditLog.findMany(),

    schedules: await sqlite.schedule.findMany(),
    assignmentSubmissions: await sqlite.assignmentSubmission.findMany(),
    personalTodos: await sqlite.personalTodo.findMany(),
    notifications: await sqlite.notification.findMany(),

    swapRequests: await sqlite.swapRequest.findMany(),
    delegations: await sqlite.delegation.findMany(),
    attachments: await sqlite.attachment.findMany(),

    swapLogs: await sqlite.swapLog.findMany(),
  };

  // Count total rows for summary.
  const total = Object.values(data).reduce((sum, rows) => sum + rows.length, 0);
  log(`read ${total} rows from SQLite`);

  log("clearing PostgreSQL (if any existing data)...");
  // Delete in reverse topological order to avoid FK errors.
  await pg.$transaction([
    pg.swapLog.deleteMany(),
    pg.attachment.deleteMany(),
    pg.delegation.deleteMany(),
    pg.swapRequest.deleteMany(),
    pg.notification.deleteMany(),
    pg.personalTodo.deleteMany(),
    pg.assignmentSubmission.deleteMany(),
    pg.schedule.deleteMany(),
    pg.auditLog.deleteMany(),
    pg.verificationToken.deleteMany(),
    pg.session.deleteMany(),
    pg.account.deleteMany(),
    pg.assignment.deleteMany(),
    pg.scheduleOverride.deleteMany(),
    pg.bellSlot.deleteMany(),
    pg.announcement.deleteMany(),
    pg.student.deleteMany(),
    pg.teacher.deleteMany(),
    pg.activityPeriod.deleteMany(),
    pg.daySwap.deleteMany(),
    pg.bellSchedule.deleteMany(),
    pg.subject.deleteMany(),
    pg.class.deleteMany(),
    pg.user.deleteMany(),
  ]);

  log("writing to PostgreSQL...");

  // Level 0: no FK dependencies.
  await pg.user.createMany({ data: data.users, skipDuplicates: true });
  await pg.class.createMany({ data: data.classes, skipDuplicates: true });
  await pg.subject.createMany({ data: data.subjects, skipDuplicates: true });
  await pg.bellSchedule.createMany({ data: data.bellSchedules, skipDuplicates: true });
  await pg.daySwap.createMany({ data: data.daySwaps, skipDuplicates: true });
  await pg.activityPeriod.createMany({ data: data.activityPeriods, skipDuplicates: true });

  // Level 1: depends on level 0.
  await pg.teacher.createMany({ data: data.teachers, skipDuplicates: true });
  await pg.student.createMany({ data: data.students, skipDuplicates: true });
  await pg.announcement.createMany({ data: data.announcements, skipDuplicates: true });
  await pg.bellSlot.createMany({ data: data.bellSlots, skipDuplicates: true });
  await pg.scheduleOverride.createMany({ data: data.scheduleOverrides, skipDuplicates: true });
  await pg.assignment.createMany({ data: data.assignments, skipDuplicates: true });
  await pg.account.createMany({ data: data.accounts, skipDuplicates: true });
  await pg.session.createMany({ data: data.sessions, skipDuplicates: true });
  await pg.verificationToken.createMany({ data: data.verificationTokens, skipDuplicates: true });
  await pg.auditLog.createMany({ data: data.auditLogs, skipDuplicates: true });

  // Level 2: depends on level 1.
  await pg.schedule.createMany({ data: data.schedules, skipDuplicates: true });
  await pg.assignmentSubmission.createMany({ data: data.assignmentSubmissions, skipDuplicates: true });
  await pg.personalTodo.createMany({ data: data.personalTodos, skipDuplicates: true });
  await pg.notification.createMany({ data: data.notifications, skipDuplicates: true });

  // Level 3: depends on level 2.
  await pg.swapRequest.createMany({ data: data.swapRequests, skipDuplicates: true });
  await pg.delegation.createMany({ data: data.delegations, skipDuplicates: true });
  await pg.attachment.createMany({ data: data.attachments, skipDuplicates: true });

  // Level 4: depends on level 3.
  await pg.swapLog.createMany({ data: data.swapLogs, skipDuplicates: true });

  // Verify counts match.
  const pgTotal = await Promise.all([
    pg.user.count(),
    pg.student.count(),
    pg.teacher.count(),
    pg.class.count(),
    pg.subject.count(),
    pg.schedule.count(),
    pg.assignment.count(),
    pg.notification.count(),
  ]);
  log("Postgres counts: " + JSON.stringify(pgTotal));

  log("migration complete");
}

migrate()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error("[migrate] failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await sqlite.$disconnect();
    await pg.$disconnect();
  });
