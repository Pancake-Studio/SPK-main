import "server-only";

import { redirect } from "next/navigation";
import { getSessionUser, getSessionCsrf, type SessionUser } from "./session";
import { ROLE_HOME, ROLES, type Role } from "@/lib/constants";

export type { SessionUser } from "./session";
export {
  createSession,
  destroySession,
  getSessionUser,
  getSessionCsrf,
} from "./session";
export { hashPassword, verifyPassword } from "./password";

/** Current user or null (no redirect). Safe for optional/UI checks. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  return getSessionUser();
}

/** Require any authenticated user; redirect to /login otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Require one of `roles`. Unauthenticated -> /login. Wrong role -> their own
 * home (prevents privilege escalation by URL, defense-in-depth at the layout).
 */
export async function requireRole(
  roles: Role | Role[],
): Promise<SessionUser> {
  const allowed = Array.isArray(roles) ? roles : [roles];
  const user = await requireUser();
  if (!allowed.includes(user.role as Role)) {
    redirect(ROLE_HOME[user.role as Role] ?? "/login");
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
  if (!user.teacher) {
    throw new Error("Teacher profile missing for current user.");
  }
  return { user, teacher: user.teacher };
}

export async function requireStudentProfile() {
  const user = await requireStudent();
  if (!user.student) {
    throw new Error("Student profile missing for current user.");
  }
  return { user, student: user.student };
}

/**
 * CSRF guard for mutations invoked outside the Server-Action origin check
 * (e.g. classic API routes). Compares a submitted token to the session secret.
 */
export async function assertCsrf(submittedToken: string | null | undefined) {
  const secret = await getSessionCsrf();
  if (!secret || !submittedToken || submittedToken !== secret) {
    throw new Error("Invalid CSRF token.");
  }
}
