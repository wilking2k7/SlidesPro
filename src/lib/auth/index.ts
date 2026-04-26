import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

/**
 * Auth.js v5 — Google + GitHub OAuth + Email magic links via Resend.
 *
 * Variables de entorno requeridas (ver .env.example):
 *   AUTH_SECRET, NEXTAUTH_URL,
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
 *   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET (opcional),
 *   RESEND_API_KEY, EMAIL_FROM (opcional, default "no-reply@slidespro.app")
 */

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
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
    ...(process.env.RESEND_API_KEY
      ? [
          Resend({
            apiKey: process.env.RESEND_API_KEY,
            from: process.env.EMAIL_FROM ?? "SlidesPro <no-reply@slidespro.app>",
          }),
        ]
      : []),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Bootstrap: cada usuario nuevo recibe un workspace personal por defecto
      if (!user.id || !user.email) return;
      const slug = `${user.email.split("@")[0]}-${Math.random().toString(36).slice(2, 6)}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-");
      await prisma.workspace.create({
        data: {
          name: `${user.name ?? "Mi"} workspace`,
          slug,
          members: {
            create: { userId: user.id, role: "OWNER" },
          },
          subscription: {
            create: { tier: "FREE", status: "ACTIVE" },
          },
        },
      });
    },
  },
});
