import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

/**
 * Middleware edge-safe. Usa la config sin adapter para evitar bundlear Prisma
 * en edge runtime. La autorización está en `authConfig.callbacks.authorized`.
 */
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
