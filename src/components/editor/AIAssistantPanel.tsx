"use client";

import { useEditorStore } from "@/lib/editor/store";
import { Button } from "@/components/ui/button";
import { Sparkles, Palette, LayoutGrid, Send, Wand2 } from "lucide-react";

/**
 * Right sidebar — Asistente Narrativo IA + controles de diseño +
 * generación de imágenes IA.
 *
 * Inspirado en el mock de Stitch (proyecto SlidesPro · Editor).
 * Hoy la mayoría son placeholders UI listos para conectarse en
 * Fase 5 (refinamiento conversacional) y Fase 3 (paleta/layout/imagen).
 *
 * Cuando hay un elemento seleccionado, este panel también muestra sus
 * propiedades arriba — manteniendo el contexto del editor.
 */
export function AIAssistantPanel() {
  const slides = useEditorStore((s) => s.slides);
  const activeIdx = useEditorStore((s) => s.activeSlideIdx);
  const selectedIds = useEditorStore((s) => s.selectedElementIds);
  const setNotes = useEditorStore((s) => s.updateSlideNotes);
  const slide = slides[activeIdx];
  const selectedEl =
    selectedIds.length === 1
      ? slide?.data.elements.find((e) => e.id === selectedIds[0])
      : null;

  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col h-full shadow-[-4px_0_14px_rgba(15,23,42,0.04)]">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5 text-blue-600 mb-1">
          <Sparkles className="w-5 h-5" />
          <h2 className="font-serif text-lg tracking-tight">Asistente IA</h2>
        </div>
        <p className="text-xs text-slate-500">Optimización de contenido editorial</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-7">
        {/* Selección actual (si la hay) */}
        {selectedEl && (
          <Section label="Elemento seleccionado">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
              <div>
                <div className="font-mono text-[10px] text-slate-400">
                  {selectedEl.id.slice(0, 12)}
                </div>
                <div className="font-medium capitalize">{selectedEl.type}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Field label="X" value={Math.round(selectedEl.bbox.x)} />
                <Field label="Y" value={Math.round(selectedEl.bbox.y)} />
                <Field label="Ancho" value={Math.round(selectedEl.bbox.w)} />
                <Field label="Alto" value={Math.round(selectedEl.bbox.h)} />
              </div>
            </div>
          </Section>
        )}

        {/* Narrativa IA — placeholder Fase 5 */}
        <Section label="Narrativa IA">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-sm text-slate-700 leading-relaxed mb-3 italic">
              &ldquo;El tono es sofisticado pero podrías fortalecer el cierre con un
              llamado a la acción más directo.&rdquo;
            </p>
            <Button size="sm" disabled className="w-full" title="Disponible en Fase 5">
              <Wand2 className="w-3.5 h-3.5" />
              Mejorar redacción
            </Button>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Refinamiento conversacional — Fase 5
            </p>
          </div>
        </Section>

        {/* Diseño & Estilo */}
        <Section label="Diseño y estilo">
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled
              title="Editor de paleta — Fase 3"
              className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-600 disabled:opacity-50 transition-all group"
            >
              <Palette className="w-5 h-5 text-slate-400 group-hover:text-blue-600 mb-2" />
              <span className="text-xs font-semibold text-slate-600">Paleta</span>
            </button>
            <button
              disabled
              title="Cambiar layout — Fase 3"
              className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-600 disabled:opacity-50 transition-all group"
            >
              <LayoutGrid className="w-5 h-5 text-slate-400 group-hover:text-blue-600 mb-2" />
              <span className="text-xs font-semibold text-slate-600">Diseño</span>
            </button>
          </div>
        </Section>

        {/* Imágenes IA */}
        <Section label="Imágenes IA" badge="PRO">
          <div className="relative">
            <textarea
              disabled
              placeholder="Describe la imagen que deseas generar…"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[100px] outline-none resize-none disabled:opacity-60"
            />
            <button
              disabled
              className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg shadow-sm hover:scale-105 transition-transform disabled:opacity-40"
              title="Generar imagen — Fase 3"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            Regenerar imágenes por slide — Fase 3
          </p>
        </Section>

        {/* Speaker notes */}
        {slide && (
          <Section label={`Notas slide ${activeIdx + 1}`}>
            <textarea
              value={slide.notes}
              onChange={(e) => setNotes(activeIdx, e.target.value)}
              rows={5}
              placeholder="Notas del presentador para este slide…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
          </Section>
        )}

        {/* Atajos */}
        <div className="text-xs text-slate-500 leading-relaxed pt-3 border-t border-slate-100">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
            Atajos
          </div>
          <ul className="space-y-1">
            <li>↑ ↓ navegar slides</li>
            <li>Doble-click en texto · editar</li>
            <li>Del · eliminar selección</li>
            <li>Ctrl+D · duplicar</li>
            <li>Ctrl+Z / Ctrl+Shift+Z · undo / redo</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}

function Section({
  label,
  badge,
  children,
}: {
  label: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {label}
        </label>
        {badge && (
          <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-slate-400">{label}</div>
      <div className="font-mono text-xs">{value}</div>
    </div>
  );
}
