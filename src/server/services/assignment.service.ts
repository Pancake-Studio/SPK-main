import "server-only";

import { db } from "@/lib/db";
import { NOTIFICATION_TYPES } from "@/lib/constants";
import type { AssignmentInput } from "@/lib/validations";
import { notifyUsers } from "./notification.service";
import { linkAttachmentsToAssignment, type AttachmentMeta } from "./attachment.service";
import { expandClassGroupIds } from "./admin.service";

const attachmentSelect = { id: true, filename: true, mime: true, size: true } as const;

function parseDue(dueAt?: string): Date | null {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  return isNaN(d.getTime()) ? null : d;
}

function baseGroupName(className: string) {
  return className.replace(/\.\d+$/, "");
}

/** Classes this teacher teaches (distinct, from their schedule). Falls back to
 *  all classes if the teacher has no schedule yet.
 *
 *  Dotted sub-rooms (e.g. ม.5/3.1) are collapsed back to their base group
 *  (ม.5/3) because the base group is the unit used for assignments. */
export async function teacherClasses(teacherId: string) {
  const allClasses = await db.class.findMany({
    select: { id: true, className: true },
    orderBy: { className: "asc" },
  });
  const byName = new Map(allClasses.map((c) => [c.className.toUpperCase(), c]))
  const byId = new Map(allClasses.map((c) => [c.id, c]));

  const rows = await db.schedule.findMany({
    where: { teacherId },
    select: { classId: true },
    distinct: ["classId"],
  });

  const seen = new Map<string, { id: string; className: string }>();
  for (const { classId } of rows) {
    const cls = byId.get(classId);
    if (!cls) continue;
    const baseName = baseGroupName(cls.className);
    const base = byName.get(baseName.toUpperCase());
    const key = (base ?? cls).className.toUpperCase();
    seen.set(key, base ?? cls);
  }

  if (seen.size > 0) {
    return Array.from(seen.values()).sort((a, b) => a.className.localeCompare(b.className));
  }

  // Fallback: collapse all classes the same way.
  const fallback = new Map<string, { id: string; className: string }>();
  for (const cls of allClasses) {
    const baseName = baseGroupName(cls.className);
    const base = byName.get(baseName.toUpperCase());
    const key = (base ?? cls).className.toUpperCase();
    if (!fallback.has(key)) fallback.set(key, base ?? cls);
  }
  return Array.from(fallback.values()).sort((a, b) => a.className.localeCompare(b.className));
}

/** Students in a class (for the recipient picker), ordered by เลขที่. */
export async function studentsInClass(classId: string) {
  const rows = await db.student.findMany({
    where: { classId },
    select: { id: true, title: true, rollNumber: true, user: { select: { name: true } } },
    orderBy: [{ rollNumber: "asc" }, { studentCode: "asc" }],
  });
  return rows.map((s) => ({ id: s.id, name: s.user.name, title: s.title, rollNumber: s.rollNumber }));
}

function toTeacherAssignmentView(a: {
  id: string;
  classId: string;
  class: { className: string };
  title: string;
  details: string | null;
  dueAt: Date | null;
  createdAt: Date;
  attachments: AttachmentMeta[];
  submissions: {
    id: string;
    done: boolean;
    completedAt: Date | null;
    student: {
      title: string | null;
      rollNumber: number | null;
      user: { name: string };
    };
    attachments: AttachmentMeta[];
  }[];
}): TeacherAssignmentView {
  return {
    id: a.id,
    classId: a.classId,
    className: a.class.className,
    title: a.title,
    details: a.details,
    dueAt: a.dueAt ? a.dueAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
    attachments: a.attachments,
    total: a.submissions.length,
    doneCount: a.submissions.filter((s) => s.done).length,
    students: a.submissions.map((s) => ({
      submissionId: s.id,
      studentName: s.student.user.name,
      title: s.student.title,
      rollNumber: s.student.rollNumber,
      done: s.done,
      completedAt: s.completedAt ? s.completedAt.toISOString() : null,
      attachments: s.attachments,
    })),
  };
}

/** Create an assignment, materialise per-student submission rows, link the
 *  teacher's uploaded files, and notify the recipients.
 *
 *  If `input.classId` is a base group class (e.g. M.4/3) that has sub-rooms
 *  (M.4/3.1, M.4/3.2), the assignment is duplicated for every sub-room so each
 *  student sees it under their actual class. */
export async function createAssignment(teacherId: string, uploaderId: string, input: AssignmentInput): Promise<number> {
  const baseClass = await db.class.findUnique({
    where: { id: input.classId },
    select: { className: true },
  });
  if (!baseClass) throw new Error("ห้องเรียนไม่ถูกต้อง");

  const allClasses = await db.class.findMany({ select: { id: true, className: true } });
  // Assign to the dotted sub-rooms only. The base group class has no students.
  const classIds = expandClassGroupIds(baseClass.className, allClasses, { includeBase: false });
  if (classIds.length === 0) throw new Error("ห้องเรียนไม่ถูกต้อง");

  const wantIds = input.studentIds && input.studentIds.length > 0 ? new Set(input.studentIds) : null;
  let createdCount = 0;

  for (const classId of classIds) {
    const classStudents = await db.student.findMany({
      where: { classId },
      select: { id: true, userId: true },
    });
    const recipients = wantIds ? classStudents.filter((s) => wantIds.has(s.id)) : classStudents;
    if (recipients.length === 0) continue;

    const assignment = await db.assignment.create({
      data: {
        teacherId,
        classId,
        title: input.title,
        details: input.details || null,
        dueAt: parseDue(input.dueAt),
        submissions: {
          create: recipients.map((r) => ({ studentId: r.id })),
        },
      },
    });

    if (input.attachmentIds?.length) {
      await linkAttachmentsToAssignment(input.attachmentIds, assignment.id, uploaderId);
    }

    await notifyUsers(
      recipients.map((r) => r.userId),
      {
        type: NOTIFICATION_TYPES.ASSIGNMENT,
        title: "ได้รับมอบหมายงานใหม่",
        message: input.title,
        linkUrl: "/student/todos",
      },
    );

    createdCount++;
  }

  if (createdCount === 0) throw new Error("ไม่มีนักเรียนที่จะมอบหมาย");
  return createdCount;
}

export type TeacherAssignmentView = {
  id: string;
  classId: string;
  className: string;
  title: string;
  details: string | null;
  dueAt: string | null;
  createdAt: string;
  attachments: AttachmentMeta[];
  total: number;
  doneCount: number;
  students: {
    submissionId: string;
    studentName: string;
    title: string | null;
    rollNumber: number | null;
    done: boolean;
    completedAt: string | null;
    attachments: AttachmentMeta[];
  }[];
};

const assignmentInclude = {
  class: { select: { className: true } },
  attachments: { select: attachmentSelect },
  submissions: {
    orderBy: { student: { rollNumber: "asc" } },
    include: {
      student: { select: { title: true, rollNumber: true, user: { select: { name: true } } } },
      attachments: { select: attachmentSelect },
    },
  },
} as const;

/** All of a teacher's assignments with per-student progress + submissions. */
export async function listTeacherAssignments(teacherId: string): Promise<TeacherAssignmentView[]> {
  const rows = await db.assignment.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
    include: assignmentInclude,
  });

  return rows.map(toTeacherAssignmentView);
}

/** Assignments for a specific class group (including dotted sub-rooms). */
export async function listTeacherAssignmentsByClassName(
  teacherId: string,
  className: string,
): Promise<TeacherAssignmentView[]> {
  const allClasses = await db.class.findMany({ select: { id: true, className: true } });
  // The base group class has no students; show assignments from its sub-rooms.
  const classIds = expandClassGroupIds(className, allClasses, { includeBase: false });

  const rows = await db.assignment.findMany({
    where: { teacherId, classId: { in: classIds } },
    orderBy: { createdAt: "desc" },
    include: assignmentInclude,
  });

  return rows.map(toTeacherAssignmentView);
}

export async function deleteAssignment(id: string, teacherId: string) {
  await db.assignment.deleteMany({ where: { id, teacherId } });
}
