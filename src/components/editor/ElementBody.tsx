"use client";

import type { Slide, SlideElement } from "@/lib/schema/slide";
import type { ThemeTokens } from "@/lib/schema/theme";
import { useEditorStore } from "@/lib/editor/store";
import { IconView } from "@/components/elements/IconView";
import { ChartView } from "@/components/elements/ChartView";
import { TableView } from "@/components/elements/TableView";
import { VideoView } from "@/components/elements/VideoView";
import { EquationView } from "@/components/elements/EquationView";

/**
 * Renderiza el contenido de cada elemento. Versión editor — soporta
 * contenteditable cuando isEditing es true.
 *
 * Comparte estilo con SlideRenderer pero permite mutaciones in-place
 * (text editing en doble click).
 */
export function ElementBody({
  element,
  isEditing,
  slideIdx,
  theme: _theme,
  slide: _slide,
  onEditDone,
}: {
  element: SlideElement;
  isEditing: boolean;
  slideIdx: number;
  theme: ThemeTokens;
  slide: Slide;
  onEditDone: () => void;
}) {
  switch (element.type) {
    case "text":
      return (
        <TextBody
          el={element}
          isEditing={isEditing}
          slideIdx={slideIdx}
          onEditDone={onEditDone}
        />
      );
    case "image":
      return <ImageBody el={element} />;
    case "shape":
      return <ShapeBody el={element} />;
    case "icon":
      return <IconView el={element} />;
    case "chart":
      return <ChartView el={element} />;
    case "table":
      return <TableView el={element} />;
    case "video":
      return <VideoView el={element} isPreview />;
    case "equation":
      return <EquationView el={element} />;
  }
}

function TextBody({
  el,
  isEditing,
  slideIdx,
  onEditDone,
}: {
  el: Extract<SlideElement, { type: "text" }>;
  isEditing: boolean;
  slideIdx: number;
  onEditDone: () => void;
}) {
  const updateRun = useEditorStore((s) => s.updateTextRun);

  const vAlign =
    el.vAlign === "middle" ? "center" : el.vAlign === "bottom" ? "flex-end" : "flex-start";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: vAlign,
        padding: el.padding,
        userSelect: isEditing ? "text" : "none",
      }}
    >
      {el.paragraphs.map((p, pi) => (
        <div
          key={pi}
          style={{
            textAlign: p.align,
            lineHeight: p.lineHeight,
            marginTop: p.spaceBefore,
            marginBottom: p.spaceAfter,
            paddingLeft: p.bullet !== "none" ? 28 + p.level * 24 : 0,
            position: "relative",
          }}
        >
          {p.bullet === "disc" && (
            <span
              style={{
                position: "absolute",
                left: p.level * 24,
                top: "0.55em",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: p.runs[0]?.style?.color ?? el.defaultStyle?.color ?? "#000",
                opacity: 0.7,
              }}
            />
          )}
          {p.bullet === "number" && (
            <span
              style={{
                position: "absolute",
                left: p.level * 24,
                top: 0,
                fontWeight: 600,
                color: p.runs[0]?.style?.color ?? el.defaultStyle?.color,
              }}
            >
              {pi + 1}.
            </span>
          )}
          {p.runs.map((r, ri) => {
            const baseStyle: React.CSSProperties = {
              fontFamily: r.style?.fontFamily ?? el.defaultStyle?.fontFamily,
              fontSize: r.style?.fontSize ?? el.defaultStyle?.fontSize ?? 24,
              fontWeight: r.style?.bold ? 700 : 400,
              fontStyle: r.style?.italic ? "italic" : undefined,
              textDecoration: [
                r.style?.underline ? "underline" : "",
                r.style?.strike ? "line-through" : "",
              ]
                .filter(Boolean)
                .join(" ") || undefined,
              color: r.style?.color ?? el.defaultStyle?.color ?? "inherit",
              letterSpacing: r.style?.letterSpacing,
              outline: "none",
            };

            if (isEditing) {
              return (
                <span
                  key={ri}
                  style={baseStyle}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    updateRun(slideIdx, el.id, pi, ri, e.currentTarget.textContent ?? "");
                    onEditDone();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      onEditDone();
                    }
                  }}
                >
                  {r.text}
                </span>
              );
            }
            return (
              <span key={ri} style={baseStyle}>
                {r.text}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ImageBody({ el }: { el: Extract<SlideElement, { type: "image" }> }) {
  const filter = el.filters
    ? `brightness(${el.filters.brightness}) contrast(${el.filters.contrast}) saturate(${el.filters.saturate}) blur(${el.filters.blur}px) grayscale(${el.filters.grayscale})`
    : undefined;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        borderRadius: el.borderRadius ?? 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={el.src}
        alt={el.alt ?? ""}
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: el.fit,
          filter,
          display: "block",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function ShapeBody({ el }: { el: Extract<SlideElement, { type: "shape" }> }) {
  const fillCss =
    el.fill.kind === "none"
      ? "transparent"
      : el.fill.kind === "solid"
        ? el.fill.color
        : `linear-gradient(${el.fill.angle}deg, ${el.fill.stops
            .map((s) => `${s.color} ${(s.offset * 100).toFixed(1)}%`)
            .join(", ")})`;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: el.shape === "line" ? undefined : fillCss,
        borderRadius:
          el.shape === "ellipse" ? "50%" : el.shape === "rect" ? el.borderRadius ?? 0 : 0,
        border: el.stroke
          ? `${el.stroke.width}px ${el.stroke.style} ${el.stroke.color}`
          : undefined,
      }}
    />
  );
}

