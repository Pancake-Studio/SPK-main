import "server-only";

import { db } from "@/lib/db";
import type { PersonalTodoInput } from "@/lib/validations";
import {
  linkAttachmentsToSubmission,
  deleteOwnAttachment,
  type AttachmentMeta,
} from "./attachment.service";

const attachmentSelect = { id: true, filename: true, mime: true, size: true } as const;

function parseDue(dueAt?: string): Date | null {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  return isNaN(d.getTime()) ? null : d;
}

export type StudentTask = {
  id: string; // submissionId (assigned) or personalTodo id (personal)
  kind: "assigned" | "personal";
  title: string;
  details: string | null;
  dueAt: string | null;
  createdAt: string;
  done: boolean;
  teacherName?: string;
  className?: string;
  assignmentId?: string;
  teacherAttachments: AttachmentMeta[];
  myAttachments: AttachmentMeta[];
};

/** A student's full task list: teacher-assigned tasks + personal to-dos. */
export async function getStudentTasks(studentId: string): Promise<StudentTask[]> {
  const [subs, todos] = await Promise.all([
    db.assignmentSubmission.findMany({
      where: { studentId },
      include: {
        attachments: { select: attachmentSelect },
        assignment: {
          include: {
            class: { select: { className: true } },
            teacher: { select: { user: { select: { name: true } } } },
            attachments: { select: attachmentSelect },
          },
        },
      },
    }),
    db.personalTodo.findMany({ where: { studentId } }),
  ]);

  const assigned: StudentTask[] = subs.map((s) => ({
    id: s.id,
    kind: "assigned",
    title: s.assignment.title,
    details: s.assignment.details,
    dueAt: s.assignment.dueAt ? s.assignment.dueAt.toISOString() : null,
    createdAt: s.assignment.createdAt.toISOString(),
    done: s.done,
    teacherName: s.assignment.teacher.user.name,
    className: s.assignment.class.className,
    assignmentId: s.assignmentId,
    teacherAttachments: s.assignment.attachments,
    myAttachments: s.attachments,
  }));

  const personal: StudentTask[] = todos.map((t) => ({
    id: t.id,
    kind: "personal",
    title: t.title,
    details: t.details,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    done: t.done,
    teacherAttachments: [],
    myAttachments: [],
  }));

  return [...assigned, ...personal];
}

/* ------------------------------ assigned -------------------------------- */

export async function setSubmissionDone(submissionId: string, studentId: string, done: boolean) {
  await db.assignmentSubmission.updateMany({
    where: { id: submissionId, studentId },
    data: { done, completedAt: done ? new Date() : null },
  });
}

/** Attach uploaded files to the student's submission (and mark it done). */
export async function submitSubmissionFiles(
  submissionId: string,
  studentId: string,
  uploaderId: string,
  attachmentIds: string[],
) {
  const sub = await db.assignmentSubmission.findFirst({
    where: { id: submissionId, studentId },
    select: { id: true },
  });
  if (!sub) throw new Error("ไม่พบงานนี้");
  await linkAttachmentsToSubmission(attachmentIds, submissionId, uploaderId);
  await db.assignmentSubmission.update({
    where: { id: submissionId },
    data: { done: true, completedAt: new Date() },
  });
}

export async function removeSubmissionFile(attachmentId: string, uploaderId: string) {
  await deleteOwnAttachment(attachmentId, uploaderId);
}

/* ------------------------------ personal -------------------------------- */

export async function createPersonalTodo(studentId: string, input: PersonalTodoInput) {
  await db.personalTodo.create({
    data: {
      studentId,
      title: input.title,
      details: input.details || null,
      dueAt: parseDue(input.dueAt),
    },
  });
}

export async function updatePersonalTodo(id: string, studentId: string, input: PersonalTodoInput) {
  await db.personalTodo.updateMany({
    where: { id, studentId },
    data: { title: input.title, details: input.details || null, dueAt: parseDue(input.dueAt) },
  });
}

export async function setPersonalTodoDone(id: string, studentId: string, done: boolean) {
  await db.personalTodo.updateMany({
    where: { id, studentId },
    data: { done, completedAt: done ? new Date() : null },
  });
}

export async function deletePersonalTodo(id: string, studentId: string) {
  await db.personalTodo.deleteMany({ where: { id, studentId } });
}
