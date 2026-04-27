"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type ThemeOption = {
  id: string;
  name: string;
  slug: string;
  accent: string;
  background: string;
};

export function NewPresentationForm({ themes }: { themes: ThemeOption[] }) {
  const router = useRouter();
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
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Fuente</label>
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          rows={10}
          placeholder="Pega un transcript, una URL de YouTube, un artículo o describe el tema con detalle…"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
        />
        <div className="text-xs text-neutral-500">{source.length} caracteres</div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Tema visual</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setThemeId(t.id)}
              className={`rounded-md border-2 p-3 text-left transition-colors ${
                themeId === t.id
                  ? "border-neutral-900"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              <div
                className="h-12 rounded mb-2 relative overflow-hidden"
                style={{ background: t.background }}
              >
                <div
                  className="absolute bottom-1 left-1 right-1 h-2 rounded"
                  style={{ background: t.accent }}
                />
              </div>
              <div className="text-sm font-medium truncate">{t.name}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Idioma</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "es" | "en" | "pt")}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="pt">Português</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Slides</label>
          <select
            value={slideCount}
            onChange={(e) => setSlideCount(Number(e.target.value))}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            {[6, 8, 10, 12, 15, 18].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Profundidad</label>
          <select
            value={depth}
            onChange={(e) => setDepth(e.target.value as typeof depth)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="executive">Ejecutivo</option>
            <option value="detailed">Detallado</option>
            <option value="step-by-step">Paso a paso</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={generateImages}
          onChange={(e) => setGenerateImages(e.target.checked)}
        />
        Generar imágenes IA (suma ~30s)
      </label>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? "Encolando…" : "Generar presentación"}
        </Button>
      </div>
    </form>
  );
}
