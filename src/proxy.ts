import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

/**
 * Edge proxy (antes "middleware" en Next ≤15). Usa la config sin Prisma
 * adapter para que bundlee limpio en edge runtime. La autorización está en
 * `authConfig.callbacks.authorized`.
 */
export const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
