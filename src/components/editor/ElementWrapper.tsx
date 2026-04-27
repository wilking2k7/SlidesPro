"use client";

import { Rnd } from "react-rnd";
import type { Slide, SlideElement } from "@/lib/schema/slide";
import type { ThemeTokens } from "@/lib/schema/theme";
import { useEditorStore } from "@/lib/editor/store";
import { ElementBody } from "./ElementBody";
import { useRef } from "react";

/**
 * Envuelve cada SlideElement con react-rnd para drag/resize.
 * El "scale" del editor se aplica afuera (transform: scale en el canvas);
 * react-rnd compensa con la prop `scale` para que delta de mouse → delta lógico.
 */
export function ElementWrapper({
  element,
  slideIdx,
  scale,
  selected,
  editingId,
  setEditingId,
  theme,
  slide,
}: {
  element: SlideElement;
  slideIdx: number;
  scale: number;
  selected: boolean;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  theme: ThemeTokens;
  slide: Slide;
}) {
  const updateBBox = useEditorStore((s) => s.updateElementBBox);
  const select = useEditorStore((s) => s.selectElement);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const isEditing = editingId === element.id;
  const lockInteractions = isEditing;

  return (
    <Rnd
      key={element.id}
      scale={scale}
      bounds="parent"
      position={{ x: element.bbox.x, y: element.bbox.y }}
      size={{ width: element.bbox.w, height: element.bbox.h }}
      disableDragging={lockInteractions}
      enableResizing={!lockInteractions}
      onDragStart={(e) => {
        e.stopPropagation();
        dragStart.current = { x: element.bbox.x, y: element.bbox.y };
      }}
      onDragStop={(_, d) => {
        if (!dragStart.current) return;
        const dx = Math.abs(d.x - dragStart.current.x);
        const dy = Math.abs(d.y - dragStart.current.y);
        if (dx > 1 || dy > 1) {
          updateBBox(slideIdx, element.id, { x: Math.round(d.x), y: Math.round(d.y) });
        }
        dragStart.current = null;
      }}
      onResizeStop={(_, __, ref, ___, pos) => {
        updateBBox(slideIdx, element.id, {
          x: Math.round(pos.x),
          y: Math.round(pos.y),
          w: Math.round(parseFloat(ref.style.width)),
          h: Math.round(parseFloat(ref.style.height)),
        });
      }}
      style={{
        zIndex: element.bbox.zIndex,
        opacity: element.bbox.opacity,
        outline: selected
          ? "2px solid #2563eb"
          : isEditing
            ? "2px dashed #2563eb"
            : "none",
        outlineOffset: 2,
      }}
      resizeHandleStyles={
        selected && !lockInteractions
          ? {
              topLeft: handleStyle,
              topRight: handleStyle,
              bottomLeft: handleStyle,
              bottomRight: handleStyle,
              top: edgeStyle,
              bottom: edgeStyle,
              left: edgeStyle,
              right: edgeStyle,
            }
          : {}
      }
    >
      <div
        onMouseDown={(e) => {
          if (!isEditing) {
            select(element.id, { additive: e.shiftKey });
          }
        }}
        onDoubleClick={(e) => {
          if (element.type === "text") {
            e.stopPropagation();
            setEditingId(element.id);
          }
        }}
        style={{
          position: "absolute",
          inset: 0,
          cursor: lockInteractions ? "text" : selected ? "move" : "pointer",
        }}
      >
        <ElementBody
          element={element}
          isEditing={isEditing}
          slideIdx={slideIdx}
          theme={theme}
          slide={slide}
          onEditDone={() => setEditingId(null)}
        />
      </div>
    </Rnd>
  );
}

const handleStyle: React.CSSProperties = {
  width: 14,
  height: 14,
  background: "#fff",
  border: "2px solid #2563eb",
  borderRadius: 3,
  position: "absolute",
};

const edgeStyle: React.CSSProperties = {
  background: "transparent",
};
