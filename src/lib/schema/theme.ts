import { z } from "zod";
import { CssColor } from "./slide";

/**
 * Theme tokens — controla colores, tipografías y espaciado de toda la
 * presentación. Lo emite el Designer agent y el editor lo permite tunear.
 */

export const ThemeFonts = z.object({
  heading: z.string(),
  body: z.string(),
  mono: z.string().optional(),
  // URLs de Google Fonts (o null si son fuentes del sistema)
  imports: z.array(z.string()).default([]),
});

export const ThemePalette = z.object({
  background: CssColor,
  surface: CssColor,
  text: CssColor,
  textMuted: CssColor,
  accent: CssColor,
  accent2: CssColor,
  border: CssColor,
});

export const ThemeTokens = z.object({
  palette: ThemePalette,
  fonts: ThemeFonts,
  // Escala tipográfica base (px sobre canvas 1920x1080)
  type: z.object({
    h1: z.number().default(96),
    h2: z.number().default(64),
    h3: z.number().default(44),
    body: z.number().default(28),
    caption: z.number().default(20),
  }),
  spacing: z.object({
    paddingX: z.number().default(120),
    paddingY: z.number().default(96),
    gap: z.number().default(32),
  }),
  // Indicador del "espíritu" del theme — útil para que la IA escoja layouts
  mood: z.enum(["minimal", "editorial", "tech", "bold", "cinematic"]).default("minimal"),
});

export type ThemeTokens = z.infer<typeof ThemeTokens>;
