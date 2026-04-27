import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { authConfig } from "./config";

/**
 * Config completa para la app (server actions, route handlers).
 *
 * Variables de entorno requeridas (ver .env.example):
 *   AUTH_SECRET, NEXTAUTH_URL,
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
 *   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET (opcional),
 *   RESEND_API_KEY, EMAIL_FROM (opcional)
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
    ...(process.env.RESEND_API_KEY
      ? [
          Resend({
            apiKey: process.env.RESEND_API_KEY,
            from: process.env.EMAIL_FROM ?? "SlidesPro <no-reply@slidespro.app>",
          }),
        ]
      : []),
    // Dev-only login: permite entrar sin OAuth para desarrollar localmente.
    // NUNCA habilitado en producción (NODE_ENV check + flag explícito).
    ...(process.env.NODE_ENV !== "production" && process.env.AUTH_ALLOW_DEV_LOGIN !== "false"
      ? [
          Credentials({
            id: "dev",
            name: "Dev login",
            credentials: {
              email: { label: "Email", type: "email", placeholder: "dev@slidespro.app" },
            },
            async authorize(credentials) {
              if (process.env.NODE_ENV === "production") return null;
              const raw = String(credentials?.email ?? "").trim().toLowerCase();
              const email = raw || "dev@slidespro.app";

              let user = await prisma.user.findUnique({ where: { email } });
              if (!user) {
                user = await prisma.user.create({
                  data: { email, name: email.split("@")[0] },
                });
                const slug = `${email.split("@")[0]}-${Math.random()
                  .toString(36)
                  .slice(2, 6)}`
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "-");
                await prisma.workspace.create({
                  data: {
                    name: `${user.name ?? "Mi"} workspace`,
                    slug,
                    members: { create: { userId: user.id, role: "OWNER" } },
                    subscription: { create: { tier: "FREE", status: "ACTIVE" } },
                  },
                });
              }
              return { id: user.id, name: user.name, email: user.email, image: user.image };
            },
          }),
        ]
      : []),
  ],
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
