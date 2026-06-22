import "server-only";

import { db } from "@/lib/db";
import type { AttachmentMeta } from "@/lib/attachment";

export const ALLOWED_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export type StoredAttachment = { id: string; filename: string; mime: string; size: number };

/** Validate + persist an uploaded file's bytes in the DB (orphan until linked
 *  to an assignment or submission by the relevant action). */
export async function storeUpload(uploaderId: string, file: File): Promise<StoredAttachment> {
  if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
    throw new Error("รองรับเฉพาะรูปภาพ (PNG/JPG/WEBP/GIF) และ PDF");
  }
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    throw new Error("ไฟล์ต้องไม่เกิน 10 MB");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const row = await db.attachment.create({
    data: {
      filename: file.name.slice(0, 200) || "file",
      mime: file.type,
      size: file.size,
      data: bytes,
      uploaderId,
    },
    select: { id: true, filename: true, mime: true, size: true },
  });
  return row;
}

/** Fetch a file for download, enforcing access:
 *  - uploader always; assignment files → the teacher + targeted students;
 *  - submission files → the submitting student + the assignment's teacher. */
export async function getAttachmentForDownload(id: string, userId: string) {
  const att = await db.attachment.findUnique({
    where: { id },
    include: {
      assignment: {
        select: {
          teacher: { select: { userId: true } },
          submissions: { select: { student: { select: { userId: true } } } },
        },
      },
      submission: {
        select: {
          student: { select: { userId: true } },
          assignment: { select: { teacher: { select: { userId: true } } } },
        },
      },
    },
  });
  if (!att) return null;

  let allowed = att.uploaderId === userId;
  if (!allowed && att.assignment) {
    allowed =
      att.assignment.teacher.userId === userId ||
      att.assignment.submissions.some((s) => s.student.userId === userId);
  }
  if (!allowed && att.submission) {
    allowed =
      att.submission.student.userId === userId ||
      att.submission.assignment.teacher.userId === userId;
  }
  if (!allowed) return null;

  return { filename: att.filename, mime: att.mime, data: att.data as Buffer };
}

/** Link previously-uploaded (orphan) attachments owned by `uploaderId` to an
 *  assignment. Ignores ids not owned by the uploader / already linked. */
export async function linkAttachmentsToAssignment(
  ids: string[],
  assignmentId: string,
  uploaderId: string,
) {
  if (ids.length === 0) return;
  await db.attachment.updateMany({
    where: { id: { in: ids }, uploaderId, assignmentId: null, submissionId: null },
    data: { assignmentId },
  });
}

/** Link uploaded attachments to a student's submission. */
export async function linkAttachmentsToSubmission(
  ids: string[],
  submissionId: string,
  uploaderId: string,
) {
  if (ids.length === 0) return;
  await db.attachment.updateMany({
    where: { id: { in: ids }, uploaderId, assignmentId: null, submissionId: null },
    data: { submissionId },
  });
}

/** Remove a submission attachment (student un-submitting a file). */
export async function deleteOwnAttachment(id: string, uploaderId: string) {
  await db.attachment.deleteMany({ where: { id, uploaderId } });
}

export type { AttachmentMeta };
