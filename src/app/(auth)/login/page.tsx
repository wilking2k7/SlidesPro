import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type SearchParams = Promise<{ callbackUrl?: string; error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const sp = await searchParams;
  if (session?.user) redirect(sp.callbackUrl ?? "/dashboard");

  const callbackUrl = sp.callbackUrl ?? "/dashboard";
  const hasGoogle = !!process.env.GOOGLE_CLIENT_ID;
  const hasGitHub = !!process.env.GITHUB_CLIENT_ID;
  const hasEmail = !!process.env.RESEND_API_KEY;
  const hasDev =
    process.env.NODE_ENV !== "production" && process.env.AUTH_ALLOW_DEV_LOGIN !== "false";

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600 grid place-items-center shadow-sm shadow-blue-600/30">
            <div className="grid grid-cols-2 gap-[3px]">
              <div className="w-2 h-2 bg-white rounded-[1px]" />
              <div className="w-2 h-2 bg-white rounded-[1px]" />
              <div className="w-2 h-2 bg-white rounded-[1px]" />
              <div className="w-2 h-2 bg-white rounded-[1px]" />
            </div>
          </div>
          <span className="font-serif text-xl tracking-tight">SlidesPro</span>
        </Link>

        <div className="card-editorial p-8 space-y-6">
          <div className="text-center">
            <h1 className="font-serif text-3xl tracking-tight">
              Inicia <span className="editorial-italic">sesión</span>
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Crea presentaciones IA editables en segundos.
            </p>
          </div>

          {sp.error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Error de autenticación: {sp.error}
            </div>
          )}

          <div className="space-y-3">
            {hasGoogle && (
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: callbackUrl });
                }}
              >
                <Button type="submit" variant="outline" className="w-full" size="lg">
                  <GoogleIcon />
                  Continuar con Google
                </Button>
              </form>
            )}

            {hasGitHub && (
              <form
                action={async () => {
                  "use server";
                  await signIn("github", { redirectTo: callbackUrl });
                }}
              >
                <Button type="submit" variant="outline" className="w-full" size="lg">
                  Continuar con GitHub
                </Button>
              </form>
            )}

            {hasEmail && (
              <form
                action={async (formData: FormData) => {
                  "use server";
                  const email = String(formData.get("email") ?? "");
                  if (!email) return;
                  await signIn("resend", { email, redirectTo: callbackUrl });
                }}
                className="space-y-2 pt-2"
              >
                <div className="relative my-2 flex items-center">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="px-3 text-[10px] uppercase tracking-widest text-slate-400">
                    o con email
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="tu@email.com"
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
                <Button type="submit" className="w-full" size="lg">
                  Enviar magic link
                </Button>
              </form>
            )}

            {!hasGoogle && !hasGitHub && !hasEmail && !hasDev && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Ningún proveedor configurado. Completa las variables en{" "}
                <code className="font-mono">.env.local</code>.
              </div>
            )}

            {hasDev && (
              <form
                action={async (formData: FormData) => {
                  "use server";
                  const email = String(formData.get("email") ?? "").trim();
                  await signIn("dev", {
                    email: email || "dev@slidespro.app",
                    redirectTo: callbackUrl,
                  });
                }}
                className="space-y-2 pt-4 border-t border-slate-100"
              >
                <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <strong>Dev login</strong> · solo desarrollo. Crea/usa un usuario al vuelo.
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="dev@slidespro.app"
                  defaultValue="dev@slidespro.app"
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
                <Button type="submit" variant="outline" className="w-full" size="lg">
                  Entrar (dev)
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
