import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";
import {
  exchangeCodeForTokens,
  verifyGoogleIdToken,
  allowedEmailDomain,
} from "@/lib/auth/google";
import { ROLE_HOME, ALL_ROLES, type Role } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resolve the Google callback to a destination path. Kept free of `redirect()`
 * (which throws) so try/catch can guard the network calls without swallowing
 * the redirect; GET issues the single redirect afterwards.
 */
async function resolveDestination(req: Request): Promise<string> {
  const url = new URL(req.url);
  if (url.searchParams.get("error")) return "/login?error=google_error";

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("g_state")?.value;
  const nonce = cookieStore.get("g_nonce")?.value;
  cookieStore.delete("g_state");
  cookieStore.delete("g_nonce");

  if (!code || !state || !savedState || !nonce || state !== savedState) {
    return "/login?error=google_state";
  }

  let identity;
  try {
    const tokens = await exchangeCodeForTokens(code);
    identity = await verifyGoogleIdToken(tokens.id_token, nonce);
  } catch {
    return "/login?error=google_error";
  }

  if (!identity.email || !identity.emailVerified) {
    return "/login?error=google_error";
  }

  // Hard domain gate — only @suntisuk.ac.th (configurable) may sign in.
  const domain = allowedEmailDomain();
  if (!identity.email.endsWith(`@${domain}`)) {
    return "/login?error=google_domain";
  }

  let user = await db.user.findUnique({ where: { email: identity.email } });

  if (!user) {
    const provisionRole = process.env.GOOGLE_AUTO_PROVISION_ROLE;
    if (provisionRole && (ALL_ROLES as string[]).includes(provisionRole)) {
      const passwordHash = await hashPassword(
        crypto.randomBytes(24).toString("hex"),
      );
      user = await db.user.create({
        data: {
          email: identity.email,
          name: identity.name,
          role: provisionRole,
          passwordHash,
        },
      });
    } else {
      return "/login?error=google_notfound";
    }
  }

  if (!user.isActive) return "/login?error=google_inactive";

  await createSession(user.id);
  await db.auditLog
    .create({
      data: {
        userId: user.id,
        action: "LOGIN_GOOGLE",
        entity: "User",
        entityId: user.id,
      },
    })
    .catch(() => {});

  return ROLE_HOME[user.role as Role] ?? "/dashboard";
}

export async function GET(req: Request) {
  const destination = await resolveDestination(req);
  redirect(destination);
}
