"use client";

import { useState } from "react";
import { useEditorStore } from "@/lib/editor/store";
import { SlideRenderer } from "@/components/renderer/SlideRenderer";
import { Plus, Trash2, Copy } from "lucide-react";

/**
 * Sidebar izquierdo: lista de slides como thumbnails. Permite seleccionar,
 * reordenar (drag & drop nativo HTML5), duplicar, eliminar y agregar nuevo.
 */
export function SlideSidebar() {
  const slides = useEditorStore((s) => s.slides);
  const activeIdx = useEditorStore((s) => s.activeSlideIdx);
  const theme = useEditorStore((s) => s.theme);
  const setActive = useEditorStore((s) => s.setActiveSlide);
  const addSlide = useEditorStore((s) => s.addSlide);
  const dup = useEditorStore((s) => s.duplicateSlide);
  const del = useEditorStore((s) => s.deleteSlide);
  const reorder = useEditorStore((s) => s.reorderSlides);

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  return (
    <aside className="w-64 bg-white border-r border-slate-200 overflow-y-auto select-none flex flex-col shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Diapositivas
        </span>
        <span className="text-[10px] font-semibold tracking-wider text-blue-600">
          {slides.length} en total
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {slides.map((s, i) => {
        const isActive = i === activeIdx;
        const isOver = overIdx === i && dragIdx !== null && dragIdx !== i;
        return (
          <div
            key={s.id}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => {
              e.preventDefault();
              setOverIdx(i);
            }}
            onDragLeave={() => setOverIdx(null)}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIdx !== null && dragIdx !== i) reorder(dragIdx, i);
              setDragIdx(null);
              setOverIdx(null);
            }}
            onDragEnd={() => {
              setDragIdx(null);
              setOverIdx(null);
            }}
            className={`group relative rounded-lg border transition-all ${
              isActive
                ? "border-blue-600 ring-4 ring-blue-600/10 shadow-sm"
                : isOver
                  ? "border-blue-400"
                  : "border-slate-200 hover:border-slate-300"
            } ${!isActive && i !== activeIdx ? "opacity-70 hover:opacity-100" : ""}`}
          >
            <button
              onClick={() => setActive(i)}
              className="w-full block overflow-hidden rounded-md cursor-pointer"
              title={`Slide ${i + 1}`}
            >
              {theme && <SlideRenderer slide={s.data} theme={theme} fitWidth={210} />}
            </button>
            <span
              className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm ${
                isActive ? "text-blue-600 bg-white" : "text-slate-400 bg-white border border-slate-100"
              }`}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="absolute right-1 top-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dup(i);
                }}
                title="Duplicar slide"
                className="p-1 rounded bg-white/95 hover:bg-white border border-neutral-300"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (slides.length > 1 && confirm(`¿Eliminar slide ${i + 1}?`)) del(i);
                }}
                title="Eliminar slide"
                disabled={slides.length <= 1}
                className="p-1 rounded bg-white/95 hover:bg-red-50 hover:text-red-600 border border-neutral-300 disabled:opacity-40"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}

      <button
        onClick={() => addSlide()}
        className="w-full flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-200 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/50 py-6 text-slate-400 transition-all"
      >
        <Plus className="w-5 h-5" />
        <span className="text-xs font-semibold">Nueva diapositiva</span>
      </button>
      </div>
    </aside>
  );
}
