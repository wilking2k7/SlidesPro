"use client";

import { CANVAS_HEIGHT, CANVAS_WIDTH, type Slide, type SlideElement } from "@/lib/schema/slide";
import type { ThemeTokens } from "@/lib/schema/theme";

/**
 * Renderiza un Slide a HTML/CSS. Es la pieza compartida entre preview y editor.
 *
 * El canvas siempre se dibuja a 1920x1080 (escala lógica) y se escala al
 * contenedor con `transform: scale()`. Esto garantiza que las coordenadas
 * absolutas del Slide Schema sean siempre fiables.
 */

export type SlideRendererProps = {
  slide: Slide;
  theme: ThemeTokens;
  /** Si está presente, escala el canvas para encajar en este width (px). */
  fitWidth?: number;
  className?: string;
};

export function SlideRenderer({ slide, theme, fitWidth, className }: SlideRendererProps) {
  const scale = fitWidth ? fitWidth / CANVAS_WIDTH : 1;
  const wrapperStyle: React.CSSProperties = fitWidth
    ? {
        width: fitWidth,
        height: fitWidth * (CANVAS_HEIGHT / CANVAS_WIDTH),
        position: "relative",
        overflow: "hidden",
      }
    : {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        position: "relative",
        overflow: "hidden",
      };

  const canvasStyle: React.CSSProperties = {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    position: "absolute",
    top: 0,
    left: 0,
    background: backgroundCss(slide, theme),
  };

  // Inject font imports
  const fontImports = theme.fonts.imports.length
    ? theme.fonts.imports.map((u) => `@import url("${u}");`).join("\n")
    : "";

  return (
    <div className={className} style={wrapperStyle}>
      {fontImports && (
        <style
          dangerouslySetInnerHTML={{
            __html: fontImports,
          }}
        />
      )}
      <div style={canvasStyle}>
        {slide.elements
          .slice()
          .sort((a, b) => a.bbox.zIndex - b.bbox.zIndex)
          .map((el) => (
            <ElementRenderer key={el.id} element={el} />
          ))}
      </div>
    </div>
  );
}

function backgroundCss(slide: Slide, _theme: ThemeTokens): string {
  const bg = slide.background;
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

function ElementRenderer({ element }: { element: SlideElement }) {
  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: element.bbox.x,
    top: element.bbox.y,
    width: element.bbox.w,
    height: element.bbox.h,
    transform: element.bbox.rotation
      ? `rotate(${element.bbox.rotation}deg)`
      : undefined,
    opacity: element.bbox.opacity,
  };

  switch (element.type) {
    case "text":
      return <TextElementView el={element} style={baseStyle} />;
    case "image":
      return <ImageElementView el={element} style={baseStyle} />;
    case "shape":
      return <ShapeElementView el={element} style={baseStyle} />;
    case "icon":
      return <PlaceholderEl style={baseStyle} label="icon" />;
    case "chart":
      return <PlaceholderEl style={baseStyle} label="chart" />;
    case "table":
      return <PlaceholderEl style={baseStyle} label="table" />;
    case "video":
      return <PlaceholderEl style={baseStyle} label="video" />;
    case "equation":
      return <PlaceholderEl style={baseStyle} label="equation" />;
  }
}

function TextElementView({
  el,
  style,
}: {
  el: Extract<SlideElement, { type: "text" }>;
  style: React.CSSProperties;
}) {
  const vAlign =
    el.vAlign === "middle"
      ? "center"
      : el.vAlign === "bottom"
        ? "flex-end"
        : "flex-start";

  return (
    <div
      style={{
        ...style,
        display: "flex",
        flexDirection: "column",
        justifyContent: vAlign,
        padding: el.padding,
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
          {p.runs.map((r, ri) => (
            <span
              key={ri}
              style={{
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
              }}
            >
              {r.style?.link ? (
                <a href={r.style.link} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
                  {r.text}
                </a>
              ) : (
                r.text
              )}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function ImageElementView({
  el,
  style,
}: {
  el: Extract<SlideElement, { type: "image" }>;
  style: React.CSSProperties;
}) {
  const filter = el.filters
    ? `brightness(${el.filters.brightness}) contrast(${el.filters.contrast}) saturate(${el.filters.saturate}) blur(${el.filters.blur}px) grayscale(${el.filters.grayscale})`
    : undefined;

  // Use plain <img> for data: URIs and external URLs to avoid Next/Image config friction in Phase 1
  return (
    <div style={{ ...style, overflow: "hidden", borderRadius: el.borderRadius ?? 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={el.src}
        alt={el.alt ?? ""}
        style={{
          width: "100%",
          height: "100%",
          objectFit: el.fit,
          filter,
          display: "block",
        }}
      />
    </div>
  );
}

function ShapeElementView({
  el,
  style,
}: {
  el: Extract<SlideElement, { type: "shape" }>;
  style: React.CSSProperties;
}) {
  const fillCss =
    el.fill.kind === "none"
      ? "transparent"
      : el.fill.kind === "solid"
        ? el.fill.color
        : `linear-gradient(${el.fill.angle}deg, ${el.fill.stops
            .map((s) => `${s.color} ${(s.offset * 100).toFixed(1)}%`)
            .join(", ")})`;

  const common: React.CSSProperties = {
    ...style,
    background: el.shape === "line" ? undefined : fillCss,
    borderRadius:
      el.shape === "ellipse"
        ? "50%"
        : el.shape === "rect"
          ? el.borderRadius ?? 0
          : 0,
    border: el.stroke
      ? `${el.stroke.width}px ${el.stroke.style} ${el.stroke.color}`
      : undefined,
  };

  if (el.shape === "line") {
    return (
      <div
        style={{
          ...style,
          background: el.fill.kind === "solid" ? el.fill.color : undefined,
        }}
      />
    );
  }

  return <div style={common} />;
}

function PlaceholderEl({ style, label }: { style: React.CSSProperties; label: string }) {
  return (
    <div
      style={{
        ...style,
        border: "2px dashed #cbd5e1",
        background: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#64748b",
        fontFamily: "monospace",
        fontSize: 18,
      }}
    >
      [{label} — coming in Phase 3]
    </div>
  );
}

