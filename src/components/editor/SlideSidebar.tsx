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
    <aside className="w-52 border-r border-neutral-200 bg-neutral-50 overflow-y-auto p-3 space-y-3 select-none">
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
            className={`group relative rounded-md border-2 transition-colors ${
              isActive
                ? "border-blue-600 ring-2 ring-blue-600/30"
                : isOver
                  ? "border-blue-400"
                  : "border-neutral-200 hover:border-neutral-400"
            }`}
          >
            <button
              onClick={() => setActive(i)}
              className="w-full block overflow-hidden rounded-sm cursor-pointer"
              title={`Slide ${i + 1}`}
            >
              {theme && <SlideRenderer slide={s.data} theme={theme} fitWidth={180} />}
            </button>
            <div className="absolute left-1 top-1 text-[10px] font-mono bg-black/70 text-white px-1 rounded">
              {i + 1}
            </div>
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
        className="w-full flex items-center justify-center gap-2 rounded-md border-2 border-dashed border-neutral-300 hover:border-neutral-500 hover:bg-white py-6 text-sm text-neutral-600"
      >
        <Plus className="w-4 h-4" /> Nuevo slide
      </button>
    </aside>
  );
}
