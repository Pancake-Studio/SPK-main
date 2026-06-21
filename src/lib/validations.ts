import { z } from "zod";
import { ALL_ROLES, DAY_KEYS, PERIOD_NUMBERS } from "@/lib/constants";

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
    .refine((p) => PERIOD_NUMBERS.includes(p), "คาบไม่ถูกต้อง"),
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

export { roleEnum };
