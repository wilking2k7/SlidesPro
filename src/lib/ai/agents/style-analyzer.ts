import { generateObject, type CoreMessage } from "ai";
import { z } from "zod";
import { modelFor } from "../providers";
import { ThemeTokens } from "@/lib/schema/theme";

/**
 * Style Analyzer — toma 1-15 imágenes de referencia (capturas de slides
 * que le gustan al usuario) y extrae un ThemeTokens completo + un nombre/
 * descripción del estilo.
 *
 * Caso de uso: el usuario tiene una licencia Pro de Canva (o cualquier
 * fuente con buena estética), captura los slides que le gustan, los sube,
 * y obtiene un theme custom reutilizable en sus presentaciones.
 *
 * Replica la feature `analyzeAndSaveStyle` del legacy/SlidesIA.html:2466
 */

export const StyleAnalysisOutput = ThemeTokens.extend({
  description: z
    .string()
    .describe(
      "1-2 frases describiendo el estilo: editorial, corporativo, minimalista, energético, etc."
    ),
  designNotes: z
    .string()
    .describe(
      "Observaciones sobre layout, jerarquía tipográfica, uso de espacio en blanco, decoraciones recurrentes. Útil para que el designer agent genere slides consistentes."
    ),
});

export type StyleAnalysisOutput = z.infer<typeof StyleAnalysisOutput>;

const SYSTEM = `You are a senior visual identity designer with experience at Pentagram, IDEO, and Apple's Human Interface team.

Your task: analyze ONE OR MORE screenshots of presentation slides that the user provided as visual references. Extract their shared design language and produce a complete ThemeTokens specification that, when applied, generates new slides matching the references' aesthetic.

GUIDELINES:

1. PALETTE EXTRACTION:
   - background: the dominant base color (usually canvas/page background)
   - surface: secondary surface (cards, panels) — often slightly different from background
   - text: primary readable color on the background
   - textMuted: secondary text (captions, metadata) — usually lower contrast
   - accent: the boldest non-neutral color used for emphasis (CTAs, italics, accent bars)
   - accent2: secondary accent if present, else use a darker/lighter sibling of accent
   - border: hairline color for dividers and edges
   - All values as hex (#RRGGBB).

2. FONTS:
   - Identify heading font and body font. If unsure, choose well-known web fonts that MATCH the visual character. Common heading fonts: DM Serif Display, Playfair Display, Newsreader (serif); Inter, DM Sans, Space Grotesk, Manrope (sans-serif).
   - Always include the Google Fonts CSS import URL(s) for the chosen families in the imports array.
   - mono is optional, only if the references show monospace usage (code, data tables).

3. TYPE SCALE:
   - h1, h2, h3, body, caption — px values in the canonical 1920×1080 canvas.
   - Defaults: h1=96, h2=64, h3=44, body=28, caption=20. Adjust based on what you see in references — bold styles use bigger h1 (120+), editorial styles use serif h1 with tight leading.

4. SPACING:
   - paddingX, paddingY, gap — px on the 1920×1080 canvas.
   - Defaults: paddingX=120, paddingY=96, gap=32. Increase for minimal styles, decrease for dense data styles.

5. MOOD: choose ONE of: minimal, editorial, tech, bold, cinematic.

6. NEVER copy text content from the references. Only abstract the visual system.`;

export async function analyzeStyle(opts: {
  images: { buffer: Buffer; mimeType: string }[];
  hintName?: string;
  apiKey?: string;
}): Promise<StyleAnalysisOutput> {
  if (opts.images.length === 0) {
    throw new Error("Subí al menos una imagen de referencia");
  }
  if (opts.images.length > 15) {
    throw new Error("Máximo 15 imágenes por estilo");
  }

  const userText = opts.hintName
    ? `Analyze these ${opts.images.length} reference slides. The user wants to call this style "${opts.hintName}". Extract the shared visual language and output ThemeTokens.`
    : `Analyze these ${opts.images.length} reference slides. Extract the shared visual language and output ThemeTokens.`;

  const messages: CoreMessage[] = [
    {
      role: "user",
      content: [
        { type: "text", text: userText },
        ...opts.images.map((img) => ({
          type: "image" as const,
          image: img.buffer,
          mimeType: img.mimeType,
        })),
      ],
    },
  ];

  const { object } = await generateObject({
    model: modelFor("smart", opts.apiKey), // Pro: necesita análisis visual fino
    system: SYSTEM,
    schema: StyleAnalysisOutput,
    messages,
    temperature: 0.4, // bajo, queremos análisis preciso, no creatividad
    maxRetries: 2,
  });

  return object;
}
