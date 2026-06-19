import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

/** The only email domain permitted to sign in with Google. */
export function allowedEmailDomain() {
  return (process.env.ALLOWED_EMAIL_DOMAIN || "suntisuk.ac.th").toLowerCase();
}

export function googleConfig() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: `${appUrl}/api/auth/google/callback`,
    appUrl,
  };
}

export function isGoogleConfigured() {
  const { clientId, clientSecret } = googleConfig();
  return Boolean(clientId && clientSecret);
}

/** Build the Google consent-screen URL. `hd` pre-filters to the school domain
 *  (still enforced server-side on the returned id_token). */
export function buildGoogleAuthUrl(params: { state: string; nonce: string }) {
  const { clientId, redirectUri } = googleConfig();
  const qs = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: params.state,
    nonce: params.nonce,
    hd: allowedEmailDomain(),
    prompt: "select_account",
    access_type: "online",
  });
  return `${GOOGLE_AUTH_URL}?${qs.toString()}`;
}

/** Exchange an authorization code for tokens. */
export async function exchangeCodeForTokens(code: string) {
  const { clientId, clientSecret, redirectUri } = googleConfig();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  return (await res.json()) as { id_token: string; access_token: string };
}

export type GoogleIdentity = {
  email: string;
  emailVerified: boolean;
  name: string;
  hd?: string;
};

/** Verify a Google id_token's signature + claims and return the identity. */
export async function verifyGoogleIdToken(
  idToken: string,
  expectedNonce: string,
): Promise<GoogleIdentity> {
  const { clientId } = googleConfig();
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });
  if (payload.nonce !== expectedNonce) {
    throw new Error("Google id_token nonce mismatch");
  }
  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  return {
    email,
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : email,
    hd: typeof payload.hd === "string" ? payload.hd : undefined,
  };
}
