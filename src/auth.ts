import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { rateLimit } from "@/lib/rate-limit";
import { ROLES, ALL_ROLES, SESSION_COOKIE, type Role } from "@/lib/constants";
import { loginSchema } from "@/lib/validations";

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "suntisuk.ac.th";
const GOOGLE_AUTO_PROVISION_ROLE = process.env.GOOGLE_AUTO_PROVISION_ROLE as Role | undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "อีเมล", type: "email" },
        password: { label: "รหัสผ่าน", type: "password" },
      },
      authorize: async (credentials, request) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const ip = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
        const limited = rateLimit(`login:${ip}:${parsed.data.email}`, 8, 5 * 60_000);
        if (!limited.ok) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });
        const valid =
          user && user.isActive && user.passwordHash
            ? await verifyPassword(parsed.data.password, user.passwordHash)
            : false;

        if (!user || !valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as Role,
          image: user.avatarUrl,
        };
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      if (account?.provider === "google") {
        const email = (profile?.email ?? user.email) as string | undefined;
        if (!email) return `/login?error=google_error`;
        if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN.toLowerCase()}`)) {
          return `/login?error=google_domain`;
        }
        if (profile?.email_verified !== true) return `/login?error=google_error`;

        const existing = await db.user.findUnique({ where: { email } });
        if (existing) {
          if (!existing.isActive) return `/login?error=google_inactive`;
          return true;
        }

        if (
          GOOGLE_AUTO_PROVISION_ROLE &&
          (ALL_ROLES as string[]).includes(GOOGLE_AUTO_PROVISION_ROLE)
        ) {
          return true;
        }

        return `/login?error=google_notfound`;
      }
      return true;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.email = token.email as string;
      session.user.name = token.name as string;
      session.user.image = (token.picture as string | undefined) ?? null;
      return session;
    },
  },
  events: {
    createUser: async ({ user }) => {
      if (
        GOOGLE_AUTO_PROVISION_ROLE &&
        (ALL_ROLES as string[]).includes(GOOGLE_AUTO_PROVISION_ROLE) &&
        user.id
      ) {
        await db.user
          .update({
            where: { id: user.id },
            data: { role: GOOGLE_AUTO_PROVISION_ROLE },
          })
          .catch(() => {});
      }
    },
  },
});
