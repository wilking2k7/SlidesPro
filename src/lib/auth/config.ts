import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

/**
 * Config edge-safe (sin adapter, sin Resend que usa nodemailer).
 * Usado por el middleware. La config completa con adapter y providers que
 * requieren node está en ./index.ts y extiende esta.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    ...(process.env.GITHUB_CLIENT_ID
      ? [
          GitHub({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
    // Resend provider se añade en index.ts (usa nodemailer, no edge-safe)
  ],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const PUBLIC = ["/", "/login"];
      if (PUBLIC.includes(pathname)) return true;
      if (pathname.startsWith("/api/auth")) return true;
      if (pathname.startsWith("/_next")) return true;
      if (pathname.startsWith("/api/health")) return true;
      return !!auth;
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) session.user.id = String(token.id);
      return session;
    },
  },
} satisfies NextAuthConfig;
