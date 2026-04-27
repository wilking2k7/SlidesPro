import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listSecretsInfo, getPersonalWorkspaceId } from "@/lib/secrets";
import { SecretKind } from "@prisma/client";
import { saveSecretAction, deleteSecretAction } from "@/server/actions/secrets";
import { Button } from "@/components/ui/button";
import { Check, X, Key, ExternalLink, ArrowLeft } from "lucide-react";

const PROVIDERS: {
  kind: SecretKind;
  name: string;
  description: string;
  url: string;
  required: boolean;
}[] = [
  {
    kind: "GOOGLE_AI",
    name: "Google Gemini",
    description:
      "Requerida. Genera narrativa, diseño e imágenes (Gemini 2.5 Flash + Flash Image).",
    url: "https://aistudio.google.com/app/apikey",
    required: true,
  },
  {
    kind: "ANTHROPIC",
    name: "Anthropic Claude",
    description:
      "Opcional. Usada en Fase 5 para refinamiento conversacional con tool use.",
    url: "https://console.anthropic.com/settings/keys",
    required: false,
  },
  {
    kind: "OPENAI",
    name: "OpenAI",
    description: "Opcional. Fallback alternativo a Gemini si está configurada.",
    url: "https://platform.openai.com/api-keys",
    required: false,
  },
];

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspaceId = await getPersonalWorkspaceId(session.user.id);
  const info = await listSecretsInfo(workspaceId);
  const byKind = new Map(info.map((i) => [i.kind, i]));

  return (
    <main className="flex-1 px-6 py-12 max-w-3xl mx-auto w-full">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Dashboard
      </Link>

      <div className="mb-10">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600 mb-3">
          Configuración
        </div>
        <h1 className="font-serif text-5xl tracking-tight leading-[1.05]">
          API <span className="editorial-italic">keys</span>
        </h1>
        <p className="mt-5 text-base text-slate-600 leading-relaxed max-w-xl">
          Pega tu propia API key de cada proveedor. Se guardan{" "}
          <strong>cifradas</strong> en tu workspace (AES-256-GCM derivado de{" "}
          <code className="font-mono text-xs">AUTH_SECRET</code>) y nunca viajan al
          cliente. Si dejas alguna vacía, la app usa la del entorno del servidor
          como fallback.
        </p>
      </div>

      <div className="space-y-4">
        {PROVIDERS.map((p) => {
          const state = byKind.get(p.kind);
          return (
            <ProviderCard
              key={p.kind}
              kind={p.kind}
              name={p.name}
              description={p.description}
              url={p.url}
              required={p.required}
              state={state}
            />
          );
        })}
      </div>

      <p className="mt-10 text-xs text-slate-500 leading-relaxed">
        <strong>Cómo se almacenan:</strong> AES-256-GCM con IV aleatorio por entrada.
        La clave de cifrado se deriva de <code>AUTH_SECRET</code> via SHA-256.
        Si rotas <code>AUTH_SECRET</code>, las keys cifradas dejan de descifrarse y
        tendrás que volver a pegarlas.
      </p>
    </main>
  );
}

function ProviderCard({
  kind,
  name,
  description,
  url,
  required,
  state,
}: {
  kind: SecretKind;
  name: string;
  description: string;
  url: string;
  required: boolean;
  state: { source: "workspace" | "env" | null; hint: string | null } | undefined;
}) {
  const configured = state?.source !== null;
  const fromWorkspace = state?.source === "workspace";

  return (
    <div className="card-editorial p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-lg grid place-items-center shrink-0 ${
              configured ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
            }`}
          >
            {configured ? <Check className="w-5 h-5" /> : <Key className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-xl tracking-tight">{name}</h3>
              {required && (
                <span className="text-[10px] uppercase tracking-wider font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  Requerida
                </span>
              )}
              {state?.source === "env" && (
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Desde .env
                </span>
              )}
              {fromWorkspace && (
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Workspace
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 mt-1">{description}</p>
            {state?.hint && (
              <div className="mt-2 font-mono text-xs text-slate-500">
                •••••••••• <span className="text-slate-900">{state.hint}</span>
              </div>
            )}
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-blue-600 hover:underline whitespace-nowrap inline-flex items-center gap-1 mt-2"
        >
          Obtener key
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <form action={saveSecretAction} className="flex gap-2 items-stretch">
        <input type="hidden" name="kind" value={kind} />
        <input
          type="password"
          name="value"
          required
          minLength={8}
          placeholder={fromWorkspace ? "Reemplazar key…" : "Pega tu API key aquí…"}
          autoComplete="off"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white"
        />
        <Button type="submit" size="default">
          {fromWorkspace ? "Reemplazar" : "Guardar"}
        </Button>
      </form>

      {fromWorkspace && (
        <form action={deleteSecretAction} className="mt-3">
          <input type="hidden" name="kind" value={kind} />
          <button
            type="submit"
            className="text-xs text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Eliminar key del workspace
          </button>
        </form>
      )}
    </div>
  );
}
