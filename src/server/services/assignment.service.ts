import "server-only";

import { db } from "@/lib/db";
import { NOTIFICATION_TYPES } from "@/lib/constants";
import type { AssignmentInput } from "@/lib/validations";
import { notifyUsers } from "./notification.service";
import { linkAttachmentsToAssignment, type AttachmentMeta } from "./attachment.service";

const attachmentSelect = { id: true, filename: true, mime: true, size: true } as const;

function parseDue(dueAt?: string): Date | null {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  return isNaN(d.getTime()) ? null : d;
}

/** Classes this teacher teaches (distinct, from their schedule). Falls back to
 *  all classes if the teacher has no schedule yet. */
export async function teacherClasses(teacherId: string) {
  const rows = await db.schedule.findMany({
    where: { teacherId },
    select: { class: { select: { id: true, className: true } } },
    distinct: ["classId"],
    orderBy: { class: { className: "asc" } },
  });
  const classes = rows.map((r) => r.class);
  if (classes.length > 0) return classes;
  return db.class.findMany({ select: { id: true, className: true }, orderBy: { className: "asc" } });
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

/** Create an assignment, materialise per-student submission rows, link the
 *  teacher's uploaded files, and notify the recipients. */
export async function createAssignment(teacherId: string, uploaderId: string, input: AssignmentInput) {
  // Resolve recipients: explicit subset, else every student in the class.
  const classStudents = await db.student.findMany({
    where: { classId: input.classId },
    select: { id: true, userId: true },
  });
  const wantIds = input.studentIds && input.studentIds.length > 0 ? new Set(input.studentIds) : null;
  const recipients = wantIds ? classStudents.filter((s) => wantIds.has(s.id)) : classStudents;
  if (recipients.length === 0) throw new Error("ไม่มีนักเรียนที่จะมอบหมาย");

  const assignment = await db.assignment.create({
    data: {
      teacherId,
      classId: input.classId,
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

  return assignment;
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

/** All of a teacher's assignments with per-student progress + submissions. */
export async function listTeacherAssignments(teacherId: string): Promise<TeacherAssignmentView[]> {
  const rows = await db.assignment.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
    include: {
      class: { select: { className: true } },
      attachments: { select: attachmentSelect },
      submissions: {
        orderBy: { student: { rollNumber: "asc" } },
        include: {
          student: { select: { title: true, rollNumber: true, user: { select: { name: true } } } },
          attachments: { select: attachmentSelect },
        },
      },
    },
  });

  return rows.map((a) => ({
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
  }));
}

export async function deleteAssignment(id: string, teacherId: string) {
  await db.assignment.deleteMany({ where: { id, teacherId } });
}
