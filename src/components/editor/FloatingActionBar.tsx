"use client";

import { useEditorStore } from "@/lib/editor/store";
import { Type, Image as ImageIcon, Shapes, Wand2 } from "lucide-react";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/lib/schema/slide";

/**
 * Toolbar flotante en la parte inferior del canvas — pill con backdrop-blur,
 * inspirado en el mock de Stitch.
 *
 * Hoy:
 *  - Texto: agrega un nuevo elemento de texto en blanco al slide activo.
 *  - Imagen / Formas / Layout IA: placeholders Fase 3.
 */
export function FloatingActionBar() {
  const slides = useEditorStore((s) => s.slides);
  const activeIdx = useEditorStore((s) => s.activeSlideIdx);
  const updateElement = useEditorStore((s) => s.updateElement);
  // Reuso del internal action: agrego un text via el store sin método dedicado
  // — uso `set` directo expuesto vía un truco: duplicateElement con un seed.
  // Mejor: agrego un set helper en el componente.
  const addText = () => {
    const slide = slides[activeIdx];
    if (!slide) return;
    const id = crypto.randomUUID();
    // Mutamos via API low-level: usa la action existente updateElement para
    // poner un texto. Pero updateElement requiere id existente.
    // Para no tocar el store, hacemos set directo:
    useEditorStore.setState((state) => {
      const draft = JSON.parse(JSON.stringify(state)) as typeof state;
      const s = draft.slides[draft.activeSlideIdx];
      if (!s) return state;
      s.data.elements.push({
        id,
        type: "text",
        bbox: {
          x: CANVAS_WIDTH / 2 - 300,
          y: CANVAS_HEIGHT / 2 - 60,
          w: 600,
          h: 120,
          rotation: 0,
          opacity: 1,
          zIndex: Math.max(0, ...s.data.elements.map((e) => e.bbox.zIndex)) + 1,
        },
        paragraphs: [
          {
            align: "left",
            bullet: "none",
            level: 0,
            lineHeight: 1.2,
            spaceBefore: 0,
            spaceAfter: 0,
            runs: [
              {
                text: "Texto nuevo",
                style: {
                  fontSize: 48,
                  fontFamily: "DM Sans",
                  color: "#0f172a",
                  bold: true,
                },
              },
            ],
          },
        ],
        padding: 0,
        vAlign: "top",
      });
      draft.selectedElementIds = [id];
      draft.saveStatus = "dirty";
      return draft;
    });
    // Forzar re-validación de Zustand temporal
    void updateElement;
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white/85 backdrop-blur-md px-5 py-2.5 rounded-full border border-slate-200 shadow-lg flex items-center gap-1">
      <ToolButton onClick={addText} icon={<Type className="w-4 h-4" />} label="Texto" />
      <Divider />
      <ToolButton
        disabled
        title="Insertar imagen — Fase 3"
        icon={<ImageIcon className="w-4 h-4" />}
        label="Imagen"
      />
      <Divider />
      <ToolButton
        disabled
        title="Formas (rect, ellipse, line) — Fase 3"
        icon={<Shapes className="w-4 h-4" />}
        label="Formas"
      />
      <Divider />
      <ToolButton
        disabled
        title="Cambio automático de layout con IA — Fase 5"
        icon={<Wand2 className="w-4 h-4" />}
        label="Layout IA"
        accent
      />
    </div>
  );
}

function ToolButton({
  onClick,
  icon,
  label,
  disabled,
  title,
  accent,
}: {
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  title?: string;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        accent
          ? "text-blue-600 hover:bg-blue-50"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
      } disabled:opacity-50 disabled:hover:bg-transparent`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-slate-200" />;
}
