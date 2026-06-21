import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

/**
 * Edge middleware: a fast first gate. It only checks for the *presence* of a
 * session cookie (it cannot hit the DB on the edge). Authoritative validation
 * and role checks happen in the server layouts via requireRole().
 *
 * NOTE: we deliberately do NOT redirect /login away on cookie presence here —
 * a stale/expired cookie (e.g. after a db reset) would then trap the user on a
 * page that bounces back to "/" forever. The login page validates the session
 * against the DB (getCurrentUser) and redirects only a *real* signed-in user.
 */
const PROTECTED_PREFIXES = ["/admin", "/teacher", "/student", "/settings"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*", "/settings/:path*"],
};
