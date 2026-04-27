import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
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
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto inline-block w-10 h-10 rounded-lg bg-neutral-900 mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight">Inicia sesión en SlidesPro</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Crea presentaciones IA editables en segundos.
          </p>
        </div>

        {sp.error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
              <Button type="submit" variant="outline" className="w-full">
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
              <Button type="submit" variant="outline" className="w-full">
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
              <div className="text-xs text-neutral-500 text-center">o con email</div>
              <input
                type="email"
                name="email"
                required
                placeholder="tu@email.com"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <Button type="submit" className="w-full">
                Enviar magic link
              </Button>
            </form>
          )}

          {!hasGoogle && !hasGitHub && !hasEmail && !hasDev && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Ningún proveedor de auth configurado. Completa las variables en{" "}
              <code className="font-mono">.env.local</code> según{" "}
              <code className="font-mono">.env.example</code>.
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
              className="space-y-2 pt-4 border-t border-neutral-100"
            >
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                <strong>Dev login</strong> · solo en desarrollo. Crea/usa un usuario al vuelo.
              </div>
              <input
                type="email"
                name="email"
                placeholder="dev@slidespro.app"
                defaultValue="dev@slidespro.app"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <Button type="submit" variant="outline" className="w-full">
                Entrar (dev)
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
