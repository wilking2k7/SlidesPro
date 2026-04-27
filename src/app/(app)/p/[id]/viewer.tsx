"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlideRenderer } from "@/components/renderer/SlideRenderer";
import type { Slide } from "@/lib/schema/slide";
import type { ThemeTokens } from "@/lib/schema/theme";
import { Button } from "@/components/ui/button";
import { Pencil, RefreshCw } from "lucide-react";

type SlideRow = { id: string; position: number; data: Slide; notes: string };

export function PresentationViewer({
  id,
  title,
  status,
  tokens,
  slides: initialSlides,
  latestJobId,
}: {
  id: string;
  title: string;
  status: "DRAFT" | "GENERATING" | "READY" | "ERROR";
  tokens: ThemeTokens | null;
  slides: SlideRow[];
  latestJobId: string | null;
}) {
  const router = useRouter();
  const [slides, setSlides] = useState(initialSlides);
  const [progress, setProgress] = useState(0);
  const [jobStatus, setJobStatus] = useState<
    "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | null
  >(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(960);
  const [regenStatus, setRegenStatus] = useState<
    | { kind: "idle" }
    | { kind: "regenerating" }
    | { kind: "done"; success: number; failed: number; total: number }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  // Poll job until completion + refresh slides
  useEffect(() => {
    if (!latestJobId || status === "READY") return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      try {
        const res = await fetch(`/api/jobs/${latestJobId}`);
        if (!res.ok) return;
        const j = (await res.json()) as {
          status: typeof jobStatus;
          progress: number;
          error: string | null;
        };
        if (stop) return;
        setJobStatus(j.status);
        setProgress(j.progress);
        if (j.error) setJobError(j.error);
        if (j.status === "COMPLETED" || j.status === "FAILED") {
          router.refresh();
          return;
        }
      } catch {}
      if (!stop) timer = setTimeout(tick, 2000);
    }
    tick();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [latestJobId, router, status]);

  // Refit canvas to container
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth));
    ro.observe(el);
    setContainerW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        setActiveIdx((i) => Math.min(slides.length - 1, i + 1));
      } else if (e.key === "ArrowLeft") {
        setActiveIdx((i) => Math.max(0, i - 1));
      }
    },
    [slides.length]
  );
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  const generating = status === "GENERATING" && jobStatus !== "FAILED";
  const failed = status === "ERROR" || jobStatus === "FAILED";
  const active = slides[activeIdx];

  // ¿Hay imágenes IA en el deck que no se hayan generado? (src es el SVG
  // placeholder data:URI). Si hay, mostramos botón de regenerar.
  const hasMissingAIImages = slides.some((s) =>
    s.data.elements.some(
      (e) =>
        e.type === "image" &&
        e.aiPrompt &&
        e.src.startsWith("data:image/svg+xml")
    )
  );

  async function regenerateImages() {
    setRegenStatus({ kind: "regenerating" });
    try {
      const res = await fetch(`/api/presentations/${id}/regenerate-images`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setRegenStatus({
        kind: "done",
        success: data.success,
        failed: data.failed,
        total: data.total,
      });
      router.refresh();
    } catch (err) {
      setRegenStatus({ kind: "error", message: (err as Error).message });
    }
  }

  return (
    <main className="flex-1 flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-100">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{title}</div>
          <div className="text-xs text-neutral-500">
            {generating
              ? `Generando… ${progress}%`
              : failed
                ? "Error al generar"
                : `${slides.length} slides`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasMissingAIImages && !generating && (
            <Button
              variant="outline"
              size="sm"
              onClick={regenerateImages}
              disabled={regenStatus.kind === "regenerating"}
              title="Algunas imágenes IA no se generaron — reintentar"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${regenStatus.kind === "regenerating" ? "animate-spin" : ""}`}
              />
              {regenStatus.kind === "regenerating"
                ? "Regenerando…"
                : "Regenerar imágenes"}
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={`/e/${id}`}>
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </Link>
          </Button>
          <div className="w-px h-5 bg-neutral-200 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            disabled={!slides.length || activeIdx === 0}
            onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
          >
            ← Anterior
          </Button>
          <span className="text-xs text-neutral-500 tabular-nums">
            {slides.length === 0 ? "0 / 0" : `${activeIdx + 1} / ${slides.length}`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!slides.length || activeIdx >= slides.length - 1}
            onClick={() => setActiveIdx((i) => Math.min(slides.length - 1, i + 1))}
          >
            Siguiente →
          </Button>
        </div>
      </div>

      {generating && (
        <div className="px-6 py-2 border-b border-neutral-100">
          <div className="h-1 w-full bg-neutral-100 rounded">
            <div
              className="h-full bg-neutral-900 rounded transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {regenStatus.kind === "done" && (
        <div className="mx-6 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Regeneración terminada · {regenStatus.success}/{regenStatus.total} imágenes
          {regenStatus.failed > 0 && ` (${regenStatus.failed} fallaron)`}
        </div>
      )}

      {regenStatus.kind === "error" && (
        <div className="mx-6 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Error regenerando imágenes: {regenStatus.message}
        </div>
      )}

      {failed && (
        <div className="mx-6 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <div className="font-medium mb-2">La generación falló.</div>
          {jobError && (
            <div className="text-rose-800 leading-relaxed whitespace-pre-line mb-3">
              {jobError}
            </div>
          )}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-rose-200/60 text-xs">
            <Link
              href="/dashboard/new"
              className="inline-flex items-center gap-1 text-rose-800 hover:text-rose-900 font-medium underline-offset-2 hover:underline"
            >
              ← Volver a intentar
            </Link>
            {jobError?.toLowerCase().includes("api key") && (
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-1 text-blue-700 hover:underline font-medium"
              >
                → Configurar API key
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex">
        {/* Sidebar de thumbnails */}
        <aside className="w-48 border-r border-neutral-100 overflow-y-auto p-3 space-y-2 bg-neutral-50">
          {slides.length === 0 && generating && (
            <div className="text-xs text-neutral-500 py-8 text-center">
              Esperando primer slide…
            </div>
          )}
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveIdx(i)}
              className={`w-full rounded border ${
                i === activeIdx ? "border-neutral-900 ring-2 ring-neutral-900" : "border-neutral-200"
              } overflow-hidden hover:border-neutral-400`}
            >
              {tokens && <SlideRenderer slide={s.data} theme={tokens} fitWidth={170} />}
            </button>
          ))}
        </aside>

        {/* Canvas central */}
        <div className="flex-1 flex items-center justify-center p-6 bg-neutral-100">
          <div ref={containerRef} className="w-full max-w-5xl">
            {active && tokens ? (
              <SlideRenderer
                slide={active.data}
                theme={tokens}
                fitWidth={Math.min(containerW, 1200)}
                className="rounded-md shadow-xl bg-white"
              />
            ) : (
              <div className="aspect-video bg-neutral-200 rounded animate-pulse" />
            )}
          </div>
        </div>

        {/* Notas del speaker */}
        {active?.notes && (
          <aside className="w-72 border-l border-neutral-100 p-4 overflow-y-auto bg-white">
            <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
              Notas del presentador
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{active.notes}</div>
          </aside>
        )}
      </div>
    </main>
  );
}
