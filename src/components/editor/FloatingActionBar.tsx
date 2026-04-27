"use client";

import { useState, useRef, useEffect } from "react";
import { useEditorStore } from "@/lib/editor/store";
import {
  Type,
  Image as ImageIcon,
  Shapes,
  BarChart3,
  Table,
  Video,
  Sigma,
  Star,
  Wand2,
} from "lucide-react";
import { CANVAS_WIDTH, CANVAS_HEIGHT, type SlideElement } from "@/lib/schema/slide";

/**
 * Toolbar flotante en la parte inferior del canvas — pill con backdrop-blur,
 * inspirado en el mock de Stitch.
 *
 * Inserta elementos seed en el slide activo. Cada tipo tiene defaults
 * sensatos centrados en el canvas. Tras insertar, queda seleccionado.
 */
export function FloatingActionBar() {
  const insert = useInsertElement();

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white/85 backdrop-blur-md px-3 py-2 rounded-full border border-slate-200 shadow-lg flex items-center gap-1">
      <ToolButton onClick={() => insert("text")} icon={<Type className="w-4 h-4" />} label="Texto" />
      <Divider />
      <ToolButton onClick={() => insert("shape")} icon={<Shapes className="w-4 h-4" />} label="Forma" />
      <ToolButton onClick={() => insert("icon")} icon={<Star className="w-4 h-4" />} label="Icono" />
      <Divider />
      <ToolButton onClick={() => insert("chart")} icon={<BarChart3 className="w-4 h-4" />} label="Chart" />
      <ToolButton onClick={() => insert("table")} icon={<Table className="w-4 h-4" />} label="Tabla" />
      <Divider />
      <ToolButton onClick={() => insert("video")} icon={<Video className="w-4 h-4" />} label="Video" />
      <ToolButton onClick={() => insert("equation")} icon={<Sigma className="w-4 h-4" />} label="Ecuación" />
      <Divider />
      <ToolButton
        disabled
        title="Agregar imagen IA — Fase 5"
        icon={<ImageIcon className="w-4 h-4" />}
        label="Imagen"
      />
      <ToolButton
        disabled
        title="Cambiar layout con IA — Fase 5"
        icon={<Wand2 className="w-4 h-4" />}
        label="Layout IA"
        accent
      />
    </div>
  );
}

function useInsertElement() {
  return (kind: SlideElement["type"]) => {
    useEditorStore.setState((state) => {
      const draft = JSON.parse(JSON.stringify(state)) as typeof state;
      const slide = draft.slides[draft.activeSlideIdx];
      if (!slide) return state;

      const id = crypto.randomUUID();
      const zIndex =
        Math.max(0, ...slide.data.elements.map((e) => e.bbox.zIndex)) + 1;
      const cx = CANVAS_WIDTH / 2;
      const cy = CANVAS_HEIGHT / 2;
      const seed: SlideElement = makeSeed(kind, id, zIndex, cx, cy);

      slide.data.elements.push(seed);
      draft.selectedElementIds = [id];
      draft.saveStatus = "dirty";
      return draft;
    });
  };
}

function makeSeed(
  kind: SlideElement["type"],
  id: string,
  zIndex: number,
  cx: number,
  cy: number
): SlideElement {
  const bbox = (w: number, h: number) => ({
    x: Math.round(cx - w / 2),
    y: Math.round(cy - h / 2),
    w,
    h,
    rotation: 0,
    opacity: 1,
    zIndex,
  });

  switch (kind) {
    case "text":
      return {
        id,
        type: "text",
        bbox: bbox(700, 120),
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
                  fontSize: 56,
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
      };
    case "shape":
      return {
        id,
        type: "shape",
        bbox: bbox(300, 180),
        shape: "rect",
        fill: { kind: "solid", color: "#2563eb" },
        borderRadius: 16,
      };
    case "icon":
      return {
        id,
        type: "icon",
        bbox: bbox(160, 160),
        iconName: "star",
        iconSet: "lucide",
        color: "#2563eb",
        strokeWidth: 2,
      };
    case "image":
      return {
        id,
        type: "image",
        bbox: bbox(640, 360),
        src:
          "data:image/svg+xml;utf8," +
          encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'>
              <rect width='16' height='9' fill='#dbeafe'/>
              <text x='8' y='5' text-anchor='middle' dominant-baseline='middle' font-family='sans-serif' font-size='1' fill='#2563eb'>Imagen</text>
            </svg>`
          ),
        fit: "cover",
        borderRadius: 12,
      };
    case "chart":
      return {
        id,
        type: "chart",
        bbox: bbox(800, 480),
        chartType: "column",
        categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
        series: [{ name: "Ventas", data: [12, 19, 14, 25, 22, 30] }],
        options: {
          showGrid: true,
          showLegend: true,
          showDataLabels: false,
          stacked: false,
          title: "Ventas Q1-Q2",
        },
      };
    case "table":
      return {
        id,
        type: "table",
        bbox: bbox(800, 320),
        rows: 4,
        cols: 3,
        cells: [
          [
            { text: "Métrica", colspan: 1, rowspan: 1, bold: true },
            { text: "Q1", colspan: 1, rowspan: 1, bold: true },
            { text: "Q2", colspan: 1, rowspan: 1, bold: true },
          ],
          [
            { text: "Ingresos", colspan: 1, rowspan: 1 },
            { text: "$1.2M", colspan: 1, rowspan: 1 },
            { text: "$1.8M", colspan: 1, rowspan: 1 },
          ],
          [
            { text: "Usuarios", colspan: 1, rowspan: 1 },
            { text: "12K", colspan: 1, rowspan: 1 },
            { text: "18K", colspan: 1, rowspan: 1 },
          ],
          [
            { text: "Conversión", colspan: 1, rowspan: 1 },
            { text: "3.2%", colspan: 1, rowspan: 1 },
            { text: "4.1%", colspan: 1, rowspan: 1 },
          ],
        ],
        headerRow: true,
        borderColor: "#e2e8f0",
        borderWidth: 1,
        fontSize: 18,
      };
    case "video":
      return {
        id,
        type: "video",
        bbox: bbox(800, 450),
        src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        source: "youtube",
        autoplay: false,
        loop: false,
        muted: true,
      };
    case "equation":
      return {
        id,
        type: "equation",
        bbox: bbox(700, 200),
        latex: "E = mc^2",
        fontSize: 64,
        color: "#0f172a",
      };
  }
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
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
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

// Suprime warnings de imports no usados en algunos paths
void useState;
void useRef;
void useEffect;
