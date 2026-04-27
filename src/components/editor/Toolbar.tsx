"use client";

import { useEditorStore, useTemporalStore } from "@/lib/editor/store";
import { Button } from "@/components/ui/button";
import {
  Undo2,
  Redo2,
  Trash2,
  Copy,
  Layers,
  ChevronUp,
  ChevronDown,
  Save,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react";

/**
 * Top toolbar: undo/redo, save status, y acciones contextuales sobre el
 * elemento seleccionado (delete, duplicate, layer order).
 */
export function Toolbar({ title, extra }: { title: string; extra?: React.ReactNode }) {
  const slides = useEditorStore((s) => s.slides);
  const activeIdx = useEditorStore((s) => s.activeSlideIdx);
  const selectedIds = useEditorStore((s) => s.selectedElementIds);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);

  const deleteEl = useEditorStore((s) => s.deleteElement);
  const dupEl = useEditorStore((s) => s.duplicateElement);
  const front = useEditorStore((s) => s.bringToFront);
  const back = useEditorStore((s) => s.sendToBack);

  const undo = useTemporalStore((s) => s.undo);
  const redo = useTemporalStore((s) => s.redo);
  const pastStates = useTemporalStore((s) => s.pastStates);
  const futureStates = useTemporalStore((s) => s.futureStates);

  const hasSelection = selectedIds.length > 0;
  const slide = slides[activeIdx];

  const onDelete = () => {
    selectedIds.forEach((id) => deleteEl(activeIdx, id));
  };
  const onDup = () => {
    selectedIds.forEach((id) => dupEl(activeIdx, id));
  };
  const onFront = () => {
    selectedIds.forEach((id) => front(activeIdx, id));
  };
  const onBack = () => {
    selectedIds.forEach((id) => back(activeIdx, id));
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-200 bg-white">
      <div className="text-sm font-medium truncate max-w-xs">{title}</div>
      <SaveStatusBadge status={saveStatus} lastSavedAt={lastSavedAt} />

      <div className="w-px h-6 bg-neutral-200 mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => undo()}
        disabled={pastStates.length === 0}
        title="Deshacer (Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => redo()}
        disabled={futureStates.length === 0}
        title="Rehacer (Ctrl+Shift+Z)"
      >
        <Redo2 className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-neutral-200 mx-1" />

      <div className="text-xs text-neutral-500 mr-2 tabular-nums">
        Slide {activeIdx + 1} / {slides.length}
        {slide && ` · ${slide.data.elements.length} elem`}
      </div>

      <div className="flex-1" />

      {/* Acciones contextuales */}
      {hasSelection && (
        <>
          <span className="text-xs text-neutral-500 mr-1">
            {selectedIds.length} seleccionado{selectedIds.length > 1 ? "s" : ""}
          </span>
          <Button variant="ghost" size="sm" onClick={onFront} title="Traer al frente">
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onBack} title="Enviar atrás">
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDup} title="Duplicar (Ctrl+D)">
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            title="Eliminar (Del)"
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-neutral-200 mx-1" />
        </>
      )}

      {extra}
    </div>
  );
}

function SaveStatusBadge({
  status,
  lastSavedAt,
}: {
  status: "saved" | "dirty" | "saving" | "error";
  lastSavedAt: number | null;
}) {
  if (status === "saving")
    return (
      <span className="flex items-center gap-1 text-xs text-neutral-500 ml-2">
        <Loader2 className="w-3 h-3 animate-spin" /> Guardando…
      </span>
    );
  if (status === "dirty")
    return (
      <span className="flex items-center gap-1 text-xs text-amber-600 ml-2">
        <Save className="w-3 h-3" /> Cambios sin guardar
      </span>
    );
  if (status === "error")
    return (
      <span className="flex items-center gap-1 text-xs text-red-600 ml-2">
        <AlertTriangle className="w-3 h-3" /> Error al guardar
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs text-emerald-600 ml-2">
      <Check className="w-3 h-3" />
      {lastSavedAt ? `Guardado` : "Listo"}
    </span>
  );
}
