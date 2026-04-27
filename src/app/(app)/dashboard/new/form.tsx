"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, Image as ImageIcon, Globe, FileText } from "lucide-react";

type ThemeOption = {
  id: string;
  name: string;
  slug: string;
  accent: string;
  background: string;
  text: string;
  mood: string;
};

export function NewPresentationForm({ themes }: { themes: ThemeOption[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"transcript" | "youtube">("transcript");
  const [source, setSource] = useState("");
  const [language, setLanguage] = useState<"es" | "en" | "pt">("es");
  const [slideCount, setSlideCount] = useState(8);
  const [depth, setDepth] = useState<"executive" | "detailed" | "step-by-step">(
    "detailed"
  );
  const [themeId, setThemeId] = useState(themes[0]?.id ?? "");
  const [generateImages, setGenerateImages] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (source.trim().length < 20) {
      setError("La fuente debe tener al menos 20 caracteres.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/presentations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: source.trim(),
          language,
          slideCount,
          depth,
          themeId,
          generateImages,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const { presentationId } = (await res.json()) as { presentationId: string };
      router.push(`/p/${presentationId}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Source picker (tabs) */}
      <div className="card-editorial p-1.5 flex gap-1.5">
        <TabButton
          active={tab === "youtube"}
          onClick={() => setTab("youtube")}
          icon={<Globe className="w-4 h-4" />}
          label="Link de YouTube"
        />
        <TabButton
          active={tab === "transcript"}
          onClick={() => setTab("transcript")}
          icon={<FileText className="w-4 h-4" />}
          label="Pegar Transcript"
        />
      </div>

      {/* Source input */}
      <div className="card-editorial p-5">
        {tab === "youtube" ? (
          <>
            <input
              type="url"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full text-base px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
            <p className="mt-2 text-xs text-slate-500">
              Gemini lee el video directamente desde YouTube.
            </p>
          </>
        ) : (
          <>
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              rows={9}
              placeholder="Pega el transcript completo aquí, o describe el tema con detalle…"
              className="w-full text-sm px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-mono leading-relaxed"
            />
            <div className="mt-2 text-xs text-slate-500 flex justify-between">
              <span>{source.length} caracteres</span>
              <span>{source.length < 20 ? "mín. 20" : "✓ ok"}</span>
            </div>
          </>
        )}
      </div>

      {/* Theme picker */}
      <div className="card-editorial p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
              Estilo visual
            </div>
            <h3 className="font-serif text-lg tracking-tight">Elige un tema</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setThemeId(t.id)}
              className={`text-left rounded-xl border-2 p-2 transition-all ${
                themeId === t.id
                  ? "border-blue-600 ring-2 ring-blue-600/30"
                  : "border-slate-200 hover:border-slate-400"
              }`}
            >
              <div
                className="h-16 rounded-lg mb-2 relative overflow-hidden flex items-end p-2"
                style={{ background: t.background }}
              >
                <div className="space-y-1 w-full">
                  <div
                    className="h-1 rounded w-2/3"
                    style={{ background: t.text, opacity: 0.85 }}
                  />
                  <div className="h-1 rounded w-1/2" style={{ background: t.text, opacity: 0.4 }} />
                </div>
                <div
                  className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full"
                  style={{ background: t.accent }}
                />
              </div>
              <div className="text-sm font-medium truncate">{t.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                {t.mood}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="card-editorial p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Idioma">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "es" | "en" | "pt")}
              className={selectCls}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </Field>
          <Field label="Slides">
            <select
              value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))}
              className={selectCls}
            >
              {[6, 8, 10, 12, 15, 18].map((n) => (
                <option key={n} value={n}>
                  {n} slides
                </option>
              ))}
            </select>
          </Field>
          <Field label="Profundidad">
            <select
              value={depth}
              onChange={(e) => setDepth(e.target.value as typeof depth)}
              className={selectCls}
            >
              <option value="executive">Ejecutivo</option>
              <option value="detailed">Detallado</option>
              <option value="step-by-step">Paso a paso</option>
            </select>
          </Field>
        </div>

        <label className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-100 cursor-pointer">
          <div className="flex items-start gap-3">
            <ImageIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <div className="text-sm font-medium">Generar imágenes con IA</div>
              <div className="text-xs text-slate-500 mt-0.5">
                gemini-2.0-flash-image · suma ~30s al tiempo total
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={generateImages}
            onChange={(e) => setGenerateImages(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-checked:bg-blue-600 rounded-full relative transition-colors">
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                generateImages ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </div>
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={submitting} size="xl">
          <Sparkles className="w-4 h-4" />
          {submitting ? "Encolando…" : "Generar presentación"}
        </Button>
      </div>
    </form>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-xl transition-all ${
        active
          ? "bg-white text-slate-900 shadow-sm border border-slate-200"
          : "text-slate-500 hover:text-slate-900"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}

const selectCls =
  "w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500";
