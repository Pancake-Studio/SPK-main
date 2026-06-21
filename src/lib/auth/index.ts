import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ROLE_HOME, ROLES, type Role } from "@/lib/constants";

export { hashPassword, verifyPassword } from "./password";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  image: string | null;
};

/** Current user or null (no redirect). Safe for optional/UI checks. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  return session?.user ?? null;
}

/** Require any authenticated user; redirect to /login otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

/**
 * Require one of `roles`. Unauthenticated -> /login. Wrong role -> their own
 * home (prevents privilege escalation by URL, defense-in-depth at the layout).
 */
export async function requireRole(roles: Role | Role[]): Promise<SessionUser> {
  const allowed = Array.isArray(roles) ? roles : [roles];
  const user = await requireUser();
  if (!allowed.includes(user.role)) {
    redirect(ROLE_HOME[user.role] ?? "/login");
  }
  return user;
}

export const requireAdmin = () => requireRole(ROLES.ADMIN);
export const requireTeacher = () => requireRole(ROLES.TEACHER);
export const requireStudent = () => requireRole(ROLES.STUDENT);

/**
 * Require the current user AND their Teacher profile. Throws if absent — used
 * inside teacher-only server actions after the layout already gated the route.
 */
export async function requireTeacherProfile() {
  const user = await requireTeacher();
  const teacher = await db.teacher.findUnique({ where: { userId: user.id } });
  if (!teacher) {
    throw new Error("Teacher profile missing for current user.");
  }
  return { user, teacher };
}

export async function requireStudentProfile() {
  const user = await requireStudent();
  const student = await db.student.findUnique({
    where: { userId: user.id },
    include: { class: true },
  });
  if (!student) {
    throw new Error("Student profile missing for current user.");
  }
  return { user, student };
}
