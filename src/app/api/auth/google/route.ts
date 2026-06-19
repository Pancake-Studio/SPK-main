import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isGoogleConfigured, buildGoogleAuthUrl } from "@/lib/auth/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isProd = process.env.NODE_ENV === "production";

export async function GET() {
  if (!isGoogleConfigured()) {
    redirect("/login?error=google_unconfigured");
  }

  const state = crypto.randomBytes(16).toString("base64url");
  const nonce = crypto.randomBytes(16).toString("base64url");

  const cookieStore = await cookies();
  const opts = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10 minutes to complete the flow
  };
  cookieStore.set("g_state", state, opts);
  cookieStore.set("g_nonce", nonce, opts);

  redirect(buildGoogleAuthUrl({ state, nonce }));
}
