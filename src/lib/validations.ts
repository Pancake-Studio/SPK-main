import { z } from "zod";
import { ALL_ROLES, DAY_KEYS, MAX_PERIOD_NUMBER } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/*  Shared primitives                                                  */
/* ------------------------------------------------------------------ */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "กรุณากรอกอีเมล")
  .email("รูปแบบอีเมลไม่ถูกต้อง")
  .max(255)
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
  .max(128);

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน").max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านปัจจุบัน"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "รหัสผ่านใหม่ไม่ตรงกัน",
    path: ["confirmPassword"],
  });

/* ------------------------------------------------------------------ */
/*  Swap requests (core feature)                                       */
/* ------------------------------------------------------------------ */

export const createSwapSchema = z.object({
  sourceScheduleId: z.string().min(1, "เลือกคาบของคุณที่ต้องการแลก"),
  targetScheduleId: z.string().min(1, "เลือกคาบของครูเป้าหมาย"),
  reason: z.string().trim().max(500, "เหตุผลยาวเกินไป").optional(),
});
export type CreateSwapInput = z.infer<typeof createSwapSchema>;

export const swapDecisionSchema = z.object({
  swapRequestId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
});
export type SwapDecisionInput = z.infer<typeof swapDecisionSchema>;

/* ------------------------------------------------------------------ */
/*  Admin: entity management                                           */
/* ------------------------------------------------------------------ */

const roleEnum = z.enum(ALL_ROLES as [string, ...string[]]);

export const teacherSchema = z.object({
  name: z.string().trim().min(1, "กรอกชื่อ-นามสกุล").max(120),
  email: emailSchema,
  password: passwordSchema.optional(),
  teacherCode: z.string().trim().min(1, "กรอกรหัสครู").max(40),
  title: z.string().trim().max(20).optional(),
  department: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(30).optional(),
});
export type TeacherInput = z.infer<typeof teacherSchema>;

export const studentSchema = z.object({
  name: z.string().trim().min(1, "กรอกชื่อ-นามสกุล").max(120),
  email: emailSchema,
  password: passwordSchema.optional(),
  studentCode: z.string().trim().min(1, "กรอกรหัสนักเรียน").max(40),
  title: z.string().trim().max(20).optional(),
  // เลขที่ในห้อง — optional; empty string → undefined (no number yet).
  rollNumber: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce.number({ message: "เลขที่ต้องเป็นตัวเลข" }).int().min(1, "เลขที่ต้องมากกว่า 0").max(999).optional(),
  ),
  classId: z.string().min(1, "เลือกห้องเรียน"),
});
export type StudentInput = z.infer<typeof studentSchema>;

export const classSchema = z.object({
  className: z.string().trim().min(1, "กรอกชื่อห้อง เช่น M.4/1").max(40),
  gradeLevel: z.string().trim().min(1, "กรอกระดับชั้น").max(40),
  room: z.string().trim().max(60).optional(),
});
export type ClassInput = z.infer<typeof classSchema>;

export const subjectSchema = z.object({
  subjectName: z.string().trim().min(1, "กรอกชื่อวิชา").max(120),
  subjectCode: z.string().trim().min(1, "กรอกรหัสวิชา").max(40),
  colorHex: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "ต้องเป็นสี HEX เช่น #7C3AED")
    .optional()
    .or(z.literal("")),
});
export type SubjectInput = z.infer<typeof subjectSchema>;

export const scheduleSchema = z.object({
  classId: z.string().min(1, "เลือกห้องเรียน"),
  subjectId: z.string().min(1, "เลือกวิชา"),
  teacherId: z.string().min(1, "เลือกครูผู้สอน"),
  day: z.enum(DAY_KEYS as [string, ...string[]]),
  period: z.coerce
    .number()
    .int()
    .min(1, "คาบไม่ถูกต้อง")
    .max(MAX_PERIOD_NUMBER, "คาบไม่ถูกต้อง"),
  room: z.string().trim().max(60).optional(),
});
export type ScheduleInput = z.infer<typeof scheduleSchema>;

export const announcementSchema = z.object({
  title: z.string().trim().min(1, "กรอกหัวข้อ").max(160),
  body: z.string().trim().min(1, "กรอกเนื้อหา").max(4000),
  audience: z.enum(["ALL", "TEACHERS", "STUDENTS"]).default("ALL"),
  isUrgent: z.boolean().default(false),
});
export type AnnouncementInput = z.infer<typeof announcementSchema>;

/* ------------------------------------------------------------------ */
/*  Update schemas (same fields + id). Password stays optional → blank */
/*  means "keep current".                                              */
/* ------------------------------------------------------------------ */

const withId = { id: z.string().min(1) };
export const teacherUpdateSchema = teacherSchema.extend(withId);
export const studentUpdateSchema = studentSchema.extend(withId);
export const classUpdateSchema = classSchema.extend(withId);
export const subjectUpdateSchema = subjectSchema.extend(withId);
export const scheduleUpdateSchema = scheduleSchema.extend(withId);
export type TeacherUpdateInput = z.infer<typeof teacherUpdateSchema>;
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;
export type ClassUpdateInput = z.infer<typeof classUpdateSchema>;
export type SubjectUpdateInput = z.infer<typeof subjectUpdateSchema>;
export type ScheduleUpdateInput = z.infer<typeof scheduleUpdateSchema>;

/* ------------------------------------------------------------------ */
/*  Bell schedule (period times + ordering templates)                  */
/* ------------------------------------------------------------------ */

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const slotKindEnum = z.enum(["HOMEROOM", "CLASS", "BREAK", "LUNCH"]);

export const bellSlotSchema = z
  .object({
    kind: slotKindEnum,
    label: z.string().trim().min(1, "กรอกชื่อคาบ").max(60),
    startTime: z.string().regex(HHMM, "เวลาไม่ถูกต้อง"),
    endTime: z.string().regex(HHMM, "เวลาไม่ถูกต้อง"),
    periodNumber: z.coerce.number().int().min(1).max(MAX_PERIOD_NUMBER).nullable(),
  })
  .refine((s) => s.kind !== "CLASS" || s.periodNumber != null, {
    message: "คาบเรียนต้องมีเลขคาบ",
    path: ["periodNumber"],
  });

/** Full save of a template's slots (after edit / reorder / swap). */
export const bellScheduleSaveSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "กรอกชื่อตาราง").max(80),
  slots: z.array(bellSlotSchema).min(1, "ต้องมีอย่างน้อย 1 แถว"),
});
export type BellScheduleSaveInput = z.infer<typeof bellScheduleSaveSchema>;

/** Swap two whole weekdays' timetables for one specific week. */
export const daySwapSchema = z
  .object({
    weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "เลือกสัปดาห์"),
    dayA: z.enum(DAY_KEYS as [string, ...string[]]),
    dayB: z.enum(DAY_KEYS as [string, ...string[]]),
    note: z.string().trim().max(120).optional(),
  })
  .refine((s) => s.dayA !== s.dayB, { message: "ต้องเลือกคนละวัน", path: ["dayB"] });
export type DaySwapInput = z.infer<typeof daySwapSchema>;

/** Pin a date to a bell-schedule template (temporary per-day change). */
export const scheduleOverrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ไม่ถูกต้อง"),
  bellScheduleId: z.string().min(1, "เลือกตาราง"),
  note: z.string().trim().max(120).optional(),
});
export type ScheduleOverrideInput = z.infer<typeof scheduleOverrideSchema>;

/* ------------------------------------------------------------------ */
/*  Assignments / to-do                                                */
/* ------------------------------------------------------------------ */

/** Teacher creates/edits an assignment. `dueAt` is a datetime-local string
 *  ("YYYY-MM-DDTHH:mm") or "". `studentIds` empty/undefined ⇒ whole class. */
export const assignmentSchema = z.object({
  title: z.string().trim().min(1, "กรอกหัวข้องาน").max(200),
  details: z.string().trim().max(5000).optional(),
  classId: z.string().min(1, "เลือกห้องเรียน"),
  dueAt: z.string().trim().optional(),
  studentIds: z.array(z.string().min(1)).optional(),
  attachmentIds: z.array(z.string().min(1)).optional(),
});
export type AssignmentInput = z.infer<typeof assignmentSchema>;

/** Student creates/edits a personal to-do item. */
export const personalTodoSchema = z.object({
  title: z.string().trim().min(1, "กรอกชื่องาน").max(200),
  details: z.string().trim().max(2000).optional(),
  dueAt: z.string().trim().optional(),
});
export type PersonalTodoInput = z.infer<typeof personalTodoSchema>;

export { roleEnum };
