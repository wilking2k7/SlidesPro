"use client";

import { useEffect, useRef, useState } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/schema/slide";
import type { ThemeTokens } from "@/lib/schema/theme";
import { useEditorStore } from "@/lib/editor/store";
import { ElementWrapper } from "./ElementWrapper";

/**
 * Canvas central del editor.
 *
 * Renderiza el slide activo a su tamaño lógico (1920x1080) y aplica
 * `transform: scale()` para encajarlo en el contenedor disponible.
 * react-rnd recibe el `scale` para que las coordenadas mouse → canvas
 * se calculen correctamente.
 */
export function Canvas({ theme }: { theme: ThemeTokens }) {
  const slides = useEditorStore((s) => s.slides);
  const activeIdx = useEditorStore((s) => s.activeSlideIdx);
  const selectedIds = useEditorStore((s) => s.selectedElementIds);
  const deselect = useEditorStore((s) => s.deselectAll);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  const slide = slides[activeIdx];

  // Refit on resize
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const compute = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;
      // Padding visual
      const padding = 32;
      const sx = (w - padding * 2) / CANVAS_WIDTH;
      const sy = (h - padding * 2) / CANVAS_HEIGHT;
      setScale(Math.min(sx, sy));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset edit mode al cambiar de slide
  useEffect(() => {
    setEditingId(null);
  }, [activeIdx]);

  if (!slide)
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-400">
        Sin slides.
      </div>
    );

  return (
    <div
      ref={wrapperRef}
      className="flex-1 relative bg-neutral-200 overflow-hidden"
      onMouseDown={(e) => {
        // click en el fondo deselecciona
        if (e.target === e.currentTarget) {
          deselect();
          setEditingId(null);
        }
      }}
    >
      {/* Wrapper escalado y centrado */}
      <div
        className="absolute"
        style={{
          width: CANVAS_WIDTH * scale,
          height: CANVAS_HEIGHT * scale,
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%)`,
          background: "#fff",
          boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            deselect();
            setEditingId(null);
          }
        }}
      >
        {/* Lienzo lógico 1920x1080 */}
        <div
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
            background: backgroundCss(slide.data.background),
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              deselect();
              setEditingId(null);
            }
          }}
        >
          {slide.data.elements
            .slice()
            .sort((a, b) => a.bbox.zIndex - b.bbox.zIndex)
            .map((el) => (
              <ElementWrapper
                key={el.id}
                element={el}
                slideIdx={activeIdx}
                scale={scale}
                selected={selectedIds.includes(el.id)}
                editingId={editingId}
                setEditingId={setEditingId}
                theme={theme}
                slide={slide.data}
              />
            ))}
        </div>
      </div>

      {/* Indicador de zoom */}
      <div className="absolute bottom-3 right-3 text-xs text-neutral-500 bg-white/80 px-2 py-1 rounded border border-neutral-200 tabular-nums">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}

function backgroundCss(bg: import("@/lib/schema/slide").Slide["background"]): string {
  switch (bg.kind) {
    case "color":
      return bg.color;
    case "gradient":
      return `linear-gradient(${bg.angle}deg, ${bg.stops
        .map((s) => `${s.color} ${(s.offset * 100).toFixed(1)}%`)
        .join(", ")})`;
    case "image":
      return `url("${bg.src}") center / ${bg.fit ?? "cover"} no-repeat`;
  }
}
