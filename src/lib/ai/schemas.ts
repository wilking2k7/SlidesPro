import { z } from "zod";

/**
 * Esquemas de salida de los agents IA.
 *
 * Filosofía: la IA NO emite el Slide Schema completo (con bbox, runs, etc.) —
 * eso sería frágil. La IA emite estructuras simples ("layout: 'two-col'",
 * "title: ...", "bullets: ...") y nuestros layout-builders deterministas
 * traducen a Slide Schema posicionado en el canvas 1920x1080.
 */

// ─── Analyst output ─────────────────────────────────────────────────────────

export const AnalystOutput = z.object({
  title: z.string().describe("Título principal de la presentación, conciso e impactante"),
  hook: z.string().describe("Una sola frase tipo gancho que abre la presentación"),
  thesis: z.string().describe("La tesis central en 1-2 frases"),
  audience: z.string().describe("A quién va dirigida"),
  tone: z
    .enum(["executive", "academic", "casual", "bold", "cinematic", "technical"])
    .describe("Tono general"),
  keyPoints: z
    .array(
      z.object({
        title: z.string().describe("Título del punto, 3-7 palabras"),
        body: z.string().describe("Desarrollo del punto, 1-3 frases"),
        evidence: z.string().optional().describe("Dato, cita o ejemplo concreto"),
      })
    )
    .min(3)
    .max(12),
  notableQuotes: z
    .array(z.object({ text: z.string(), attribution: z.string().optional() }))
    .max(3)
    .default([]),
  callToAction: z.string().describe("Acción concreta o cierre"),
  cinematicMood: z.string().describe("Atmósfera visual sugerida (1 frase)"),
  imagePrompts: z
    .array(z.string())
    .min(3)
    .describe(
      "Prompts en INGLÉS para generación de imágenes 16:9 fotográficas/cinemáticas. Una por slide aprox. SIN texto, SIN logos."
    ),
});

export type AnalystOutput = z.infer<typeof AnalystOutput>;

// ─── Designer output ────────────────────────────────────────────────────────
// El designer recibe el AnalystOutput + theme y emite una secuencia de slides
// usando layouts predefinidos. Cada layout admite cierto contenido tipado.

export const SlideContent = z.discriminatedUnion("layout", [
  z.object({
    layout: z.literal("cover"),
    title: z.string(),
    subtitle: z.string().optional(),
    eyebrow: z.string().optional(),
    imagePromptIndex: z.number().int().nonnegative().optional(),
  }),
  z.object({
    layout: z.literal("title-content"),
    title: z.string(),
    body: z.string(),
    eyebrow: z.string().optional(),
  }),
  z.object({
    layout: z.literal("bullets"),
    title: z.string(),
    bullets: z.array(z.string()).min(2).max(7),
    eyebrow: z.string().optional(),
  }),
  z.object({
    layout: z.literal("two-col"),
    title: z.string().optional(),
    left: z.object({ heading: z.string(), body: z.string() }),
    right: z.object({ heading: z.string(), body: z.string() }),
  }),
  z.object({
    layout: z.literal("image-left"),
    title: z.string(),
    body: z.string(),
    imagePromptIndex: z.number().int().nonnegative(),
  }),
  z.object({
    layout: z.literal("image-right"),
    title: z.string(),
    body: z.string(),
    imagePromptIndex: z.number().int().nonnegative(),
  }),
  z.object({
    layout: z.literal("image-full"),
    title: z.string(),
    subtitle: z.string().optional(),
    imagePromptIndex: z.number().int().nonnegative(),
  }),
  z.object({
    layout: z.literal("quote"),
    quote: z.string(),
    attribution: z.string().optional(),
  }),
  z.object({
    layout: z.literal("section"),
    eyebrow: z.string().optional(),
    title: z.string(),
  }),
  z.object({
    layout: z.literal("closing"),
    title: z.string(),
    cta: z.string(),
  }),
]);

export type SlideContent = z.infer<typeof SlideContent>;

export const DesignerOutput = z.object({
  slides: z.array(SlideContent).min(3).max(20),
});

export type DesignerOutput = z.infer<typeof DesignerOutput>;

// ─── Speaker notes output ───────────────────────────────────────────────────

export const NotesOutput = z.object({
  notes: z
    .array(z.string())
    .describe("Una entrada por slide, en el mismo orden, conversacional"),
});

export type NotesOutput = z.infer<typeof NotesOutput>;
