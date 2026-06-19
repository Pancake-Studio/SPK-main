import "server-only";

import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  CSRF_COOKIE,
  SESSION_MAX_AGE_DAYS,
} from "@/lib/constants";

const isProd = process.env.NODE_ENV === "production";

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Full user + role profiles loaded for the current session. */
export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getSessionUser>>
>;

/**
 * Create a session for `userId`: persist an opaque-token hash in the DB and set
 * an HttpOnly cookie holding the raw token, plus a readable CSRF cookie.
 */
export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const csrfSecret = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
  );

  const h = await headers();
  const ipAddress =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    undefined;

  await db.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      csrfSecret,
      expiresAt,
      userAgent: h.get("user-agent")?.slice(0, 255) ?? undefined,
      ipAddress: ipAddress?.slice(0, 64),
    },
  });

  const cookieStore = await cookies();
  const common = {
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
  // Session token: not readable by JS.
  cookieStore.set(SESSION_COOKIE, token, { httpOnly: true, ...common });
  // CSRF secret: readable so the client can echo it back (double-submit).
  cookieStore.set(CSRF_COOKIE, csrfSecret, { httpOnly: false, ...common });
}

/** Resolve the signed-in user (with teacher/student profile) or null. */
export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        include: { teacher: true, student: true },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (!session.user.isActive) return null;

  return { ...session.user, sessionId: session.id, csrfSecret: session.csrfSecret };
}

/** Read the CSRF secret tied to the current session (server-side). */
export async function getSessionCsrf() {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE)?.value ?? null;
}

/** Destroy the current session (DB row + cookies). */
export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session
      .deleteMany({ where: { tokenHash: sha256(token) } })
      .catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(CSRF_COOKIE);
}

/** Best-effort cleanup of expired sessions (called opportunistically). */
export async function purgeExpiredSessions() {
  await db.session
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => {});
}
