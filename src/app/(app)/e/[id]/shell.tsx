"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { ThemeTokens } from "@/lib/schema/theme";
import type { EditorSlide } from "@/lib/editor/store";
import { useEditorStore, useTemporalStore } from "@/lib/editor/store";
import { Canvas } from "@/components/editor/Canvas";
import { SlideSidebar } from "@/components/editor/SlideSidebar";
import { Toolbar } from "@/components/editor/Toolbar";
import { AIAssistantPanel } from "@/components/editor/AIAssistantPanel";
import { FloatingActionBar } from "@/components/editor/FloatingActionBar";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export function EditorShell({
  presentationId,
  title,
  tokens,
  initialSlides,
}: {
  presentationId: string;
  title: string;
  tokens: ThemeTokens | null;
  initialSlides: EditorSlide[];
}) {
  const hydrate = useEditorStore((s) => s.hydrate);
  const slides = useEditorStore((s) => s.slides);
  const setActive = useEditorStore((s) => s.setActiveSlide);
  const activeIdx = useEditorStore((s) => s.activeSlideIdx);
  const selectedIds = useEditorStore((s) => s.selectedElementIds);
  const deleteEl = useEditorStore((s) => s.deleteElement);
  const dupEl = useEditorStore((s) => s.duplicateElement);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const setSaveStatus = useEditorStore((s) => s.setSaveStatus);

  const undo = useTemporalStore((s) => s.undo);
  const redo = useTemporalStore((s) => s.redo);

  const initialized = useRef(false);

  // Hidratar store la primera vez (no en re-renders)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    hydrate({
      presentationId,
      title,
      theme: tokens,
      slides: initialSlides,
    });
    // Limpiar historial undo después de hydrate
    useEditorStore.temporal.getState().clear();
  }, [hydrate, presentationId, title, tokens, initialSlides]);

  // Auto-save con debounce
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!initialized.current) return;
    if (saveStatus !== "dirty") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const state = useEditorStore.getState();
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/presentations/${state.presentationId}/slides`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slides: state.slides.map((s, i) => ({
              position: i,
              data: s.data,
              notes: s.notes,
            })),
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? `HTTP ${res.status}`);
        }
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("error", (err as Error).message);
      }
    }, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [saveStatus, setSaveStatus]);

  // Atajos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignora atajos cuando el foco está en un input/contenteditable
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          (t as HTMLElement).isContentEditable)
      ) {
        return;
      }
      const meta = e.ctrlKey || e.metaKey;

      if (meta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (meta && (e.key === "Z" || (e.key === "z" && e.shiftKey) || e.key === "y")) {
        e.preventDefault();
        redo();
      } else if (meta && e.key === "d") {
        e.preventDefault();
        selectedIds.forEach((id) => dupEl(activeIdx, id));
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length > 0) {
          e.preventDefault();
          selectedIds.forEach((id) => deleteEl(activeIdx, id));
        }
      } else if (e.key === "ArrowDown" && !meta) {
        if (activeIdx < slides.length - 1) {
          e.preventDefault();
          setActive(activeIdx + 1);
        }
      } else if (e.key === "ArrowUp" && !meta) {
        if (activeIdx > 0) {
          e.preventDefault();
          setActive(activeIdx - 1);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, dupEl, deleteEl, selectedIds, activeIdx, slides.length, setActive]);

  if (!tokens) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-500">
        Esta presentación no tiene un theme válido. Vuelve al dashboard.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Toolbar title={title} extra={
        <Button asChild variant="outline" size="sm">
          <Link href={`/p/${presentationId}`}>
            <Eye className="w-4 h-4" />
            Ver
          </Link>
        </Button>
      } />
      <div className="flex-1 flex min-h-0 relative">
        <SlideSidebar />
        <div className="flex-1 flex flex-col relative min-w-0">
          <Canvas theme={tokens} />
          <FloatingActionBar />
        </div>
        <AIAssistantPanel />
      </div>
    </div>
  );
}

function RightPanel() {
  const slides = useEditorStore((s) => s.slides);
  const activeIdx = useEditorStore((s) => s.activeSlideIdx);
  const selectedIds = useEditorStore((s) => s.selectedElementIds);
  const setNotes = useEditorStore((s) => s.updateSlideNotes);
  const slide = slides[activeIdx];
  if (!slide) return null;

  const selectedEl =
    selectedIds.length === 1
      ? slide.data.elements.find((e) => e.id === selectedIds[0])
      : null;

  if (selectedEl) {
    return (
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-widest text-neutral-500">
          Elemento seleccionado
        </div>
        <div className="text-sm">
          <div className="font-mono text-xs text-neutral-500">{selectedEl.id.slice(0, 12)}</div>
          <div className="font-medium capitalize">{selectedEl.type}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Field label="X" value={Math.round(selectedEl.bbox.x)} />
          <Field label="Y" value={Math.round(selectedEl.bbox.y)} />
          <Field label="W" value={Math.round(selectedEl.bbox.w)} />
          <Field label="H" value={Math.round(selectedEl.bbox.h)} />
        </div>
        <p className="text-xs text-neutral-500 leading-relaxed pt-2 border-t border-neutral-100">
          Doble click en texto para editarlo. Más controles
          (color/tipo/etc) llegan en Fase 3.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-widest text-neutral-500">
        Notas del slide {activeIdx + 1}
      </div>
      <textarea
        value={slide.notes}
        onChange={(e) => setNotes(activeIdx, e.target.value)}
        rows={12}
        placeholder="Notas del presentador para este slide…"
        className="w-full rounded border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="text-xs text-neutral-500 leading-relaxed pt-2 border-t border-neutral-100">
        <strong>Atajos:</strong>
        <ul className="mt-1 space-y-1">
          <li>↑ ↓ navegar slides</li>
          <li>Click + arrastrar mover elemento</li>
          <li>Doble-click texto editar</li>
          <li>Del / Backspace eliminar</li>
          <li>Ctrl+D duplicar</li>
          <li>Ctrl+Z / Ctrl+Shift+Z undo / redo</li>
        </ul>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-400">{label}</div>
      <div className="font-mono text-xs">{value}</div>
    </div>
  );
}
