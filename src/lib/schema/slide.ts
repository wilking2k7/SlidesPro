import { z } from "zod";

/**
 * Slide Schema — fuente de verdad para toda la app.
 *
 * Una presentación es { title, themeId, slides: Slide[] }.
 * Cada slide es un árbol tipado de elementos posicionados sobre un canvas
 * de 1920x1080 (16:9). El renderer HTML, el editor visual y el exportador
 * a PPTX consumen este schema.
 *
 * Reglas:
 *  - Coordenadas en píxeles del canvas lógico (1920x1080).
 *  - Colores en hex (#RRGGBB) o rgba().
 *  - Fuentes referenciadas por nombre; el theme decide qué fuentes están
 *    disponibles (Google Fonts cargados en runtime).
 *  - Cualquier extensión futura (3D, animación compleja, etc.) entra como
 *    nuevo `type` en el discriminated union.
 */

// Canvas lógico 16:9
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

// ─── Primitivos ──────────────────────────────────────────────────────────────

export const HexColor = z.string().regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
export const CssColor = z.string(); // hex, rgb(), rgba(), hsl(), named — validado en render

export const BBox = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
  rotation: z.number().default(0), // grados
  opacity: z.number().min(0).max(1).default(1),
  zIndex: z.number().int().default(0),
});
export type BBox = z.infer<typeof BBox>;

export const Fill = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("solid"), color: CssColor }),
  z.object({
    kind: z.literal("gradient"),
    angle: z.number().default(0),
    stops: z.array(z.object({ offset: z.number().min(0).max(1), color: CssColor })).min(2),
  }),
]);
export type Fill = z.infer<typeof Fill>;

export const Stroke = z.object({
  color: CssColor,
  width: z.number().min(0).default(1),
  style: z.enum(["solid", "dashed", "dotted"]).default("solid"),
});

export const Shadow = z.object({
  color: CssColor.default("rgba(0,0,0,0.2)"),
  x: z.number().default(0),
  y: z.number().default(4),
  blur: z.number().default(12),
});

// ─── Texto (con runs estilizados, requerido para PPTX editable fiel) ─────────

export const TextRunStyle = z.object({
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  strike: z.boolean().optional(),
  color: CssColor.optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(), // px sobre canvas 1920x1080
  letterSpacing: z.number().optional(),
  link: z.string().url().optional(),
});

export const TextRun = z.object({
  text: z.string(),
  style: TextRunStyle.optional(),
});

export const TextParagraph = z.object({
  align: z.enum(["left", "center", "right", "justify"]).default("left"),
  bullet: z.enum(["none", "disc", "number"]).default("none"),
  level: z.number().int().min(0).max(5).default(0),
  lineHeight: z.number().default(1.3),
  spaceBefore: z.number().default(0),
  spaceAfter: z.number().default(0),
  runs: z.array(TextRun).default([]),
});

// ─── Elementos ───────────────────────────────────────────────────────────────

export const TextElement = z.object({
  id: z.string(),
  type: z.literal("text"),
  bbox: BBox,
  paragraphs: z.array(TextParagraph).min(1),
  // estilos por defecto que aplican a runs sin overrides
  defaultStyle: TextRunStyle.optional(),
  background: Fill.optional(),
  padding: z.number().default(0),
  vAlign: z.enum(["top", "middle", "bottom"]).default("top"),
});

export const ImageElement = z.object({
  id: z.string(),
  type: z.literal("image"),
  bbox: BBox,
  src: z.string(), // URL (R2) o data:image/...
  alt: z.string().optional(),
  fit: z.enum(["cover", "contain", "fill"]).default("cover"),
  crop: z
    .object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })
    .optional(),
  filters: z
    .object({
      brightness: z.number().default(1),
      contrast: z.number().default(1),
      saturate: z.number().default(1),
      blur: z.number().default(0),
      grayscale: z.number().min(0).max(1).default(0),
    })
    .optional(),
  borderRadius: z.number().default(0),
  shadow: Shadow.optional(),
  // si fue generada por IA
  aiPrompt: z.string().optional(),
});

export const ShapeElement = z.object({
  id: z.string(),
  type: z.literal("shape"),
  bbox: BBox,
  shape: z.enum(["rect", "ellipse", "line", "triangle", "arrow", "star", "polygon"]),
  fill: Fill.default({ kind: "solid", color: "#000000" }),
  stroke: Stroke.optional(),
  borderRadius: z.number().default(0),
  shadow: Shadow.optional(),
  // para 'polygon' / 'star'
  sides: z.number().int().min(3).max(20).optional(),
});

export const IconElement = z.object({
  id: z.string(),
  type: z.literal("icon"),
  bbox: BBox,
  // Lucide / Phosphor icon name; renderer mapea
  iconName: z.string(),
  iconSet: z.enum(["lucide", "phosphor"]).default("lucide"),
  color: CssColor.default("#000000"),
  strokeWidth: z.number().default(2),
});

export const ChartSeries = z.object({
  name: z.string(),
  data: z.array(z.number()),
  color: CssColor.optional(),
});

export const ChartElement = z.object({
  id: z.string(),
  type: z.literal("chart"),
  bbox: BBox,
  chartType: z.enum(["bar", "column", "line", "area", "pie", "donut", "scatter", "radar"]),
  categories: z.array(z.string()),
  series: z.array(ChartSeries).min(1),
  options: z
    .object({
      title: z.string().optional(),
      showLegend: z.boolean().default(true),
      showGrid: z.boolean().default(true),
      showDataLabels: z.boolean().default(false),
      stacked: z.boolean().default(false),
      colorScheme: z.array(CssColor).optional(),
    })
    .optional(),
});

export const TableCell = z.object({
  text: z.string().default(""),
  bold: z.boolean().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  bg: CssColor.optional(),
  color: CssColor.optional(),
  colspan: z.number().int().min(1).default(1),
  rowspan: z.number().int().min(1).default(1),
});

export const TableElement = z.object({
  id: z.string(),
  type: z.literal("table"),
  bbox: BBox,
  rows: z.number().int().positive(),
  cols: z.number().int().positive(),
  // matriz cells[row][col]
  cells: z.array(z.array(TableCell)),
  headerRow: z.boolean().default(true),
  borderColor: CssColor.default("#e5e7eb"),
  borderWidth: z.number().default(1),
  fontSize: z.number().default(18),
  fontFamily: z.string().optional(),
});

export const VideoElement = z.object({
  id: z.string(),
  type: z.literal("video"),
  bbox: BBox,
  // YouTube/Vimeo URL o asset URL (mp4)
  src: z.string(),
  source: z.enum(["youtube", "vimeo", "url"]).default("url"),
  poster: z.string().optional(),
  autoplay: z.boolean().default(false),
  loop: z.boolean().default(false),
  muted: z.boolean().default(true),
});

export const EquationElement = z.object({
  id: z.string(),
  type: z.literal("equation"),
  bbox: BBox,
  latex: z.string(),
  fontSize: z.number().default(36),
  color: CssColor.default("#111111"),
});

export const SlideElement = z.discriminatedUnion("type", [
  TextElement,
  ImageElement,
  ShapeElement,
  IconElement,
  ChartElement,
  TableElement,
  VideoElement,
  EquationElement,
]);
export type SlideElement = z.infer<typeof SlideElement>;

// ─── Background y transiciones ───────────────────────────────────────────────

export const SlideBackground = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("color"), color: CssColor }),
  z.object({
    kind: z.literal("gradient"),
    angle: z.number().default(135),
    stops: z.array(z.object({ offset: z.number(), color: CssColor })).min(2),
  }),
  z.object({
    kind: z.literal("image"),
    src: z.string(),
    fit: z.enum(["cover", "contain"]).default("cover"),
    overlay: CssColor.optional(),
    overlayOpacity: z.number().min(0).max(1).optional(),
  }),
]);

export const SlideTransition = z.object({
  kind: z.enum(["none", "fade", "slide", "zoom", "flip", "morph"]).default("fade"),
  duration: z.number().default(400),
  direction: z.enum(["left", "right", "up", "down"]).optional(),
});

export const SlideLayout = z.enum([
  "blank",
  "title",
  "title-content",
  "two-col",
  "image-full",
  "image-left",
  "image-right",
  "quote",
  "data",
  "section",
  "closing",
]);
export type SlideLayout = z.infer<typeof SlideLayout>;

// ─── Slide ───────────────────────────────────────────────────────────────────

export const Slide = z.object({
  id: z.string(),
  layout: SlideLayout.default("blank"),
  background: SlideBackground.default({ kind: "color", color: "#ffffff" }),
  elements: z.array(SlideElement).default([]),
  notes: z.string().default(""),
  transition: SlideTransition.optional(),
  // metadatos opcionales que la IA puede setear
  meta: z
    .object({
      title: z.string().optional(),
      tags: z.array(z.string()).optional(),
      generatedBy: z.string().optional(),
    })
    .optional(),
});
export type Slide = z.infer<typeof Slide>;

// ─── Presentation (objeto raíz, lo que viaja por API) ────────────────────────

export const Presentation = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  themeId: z.string().optional(),
  slides: z.array(Slide),
});
export type Presentation = z.infer<typeof Presentation>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function emptySlide(layout: SlideLayout = "blank"): Slide {
  return Slide.parse({
    id: crypto.randomUUID(),
    layout,
    background: { kind: "color", color: "#ffffff" },
    elements: [],
    notes: "",
  });
}

export function validateSlide(input: unknown): Slide {
  return Slide.parse(input);
}

export function validatePresentation(input: unknown): Presentation {
  return Presentation.parse(input);
}
