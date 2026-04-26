import type { ThemeTokens } from "./theme";

/**
 * 5 themes preset portados desde legacy/SlidesIA.html (líneas 1160–1344).
 * Estos quedan seedeados en BD como `Theme` con `isPreset = true`.
 */

export type PresetTheme = {
  slug: string;
  name: string;
  tokens: ThemeTokens;
};

export const PRESET_THEMES: PresetTheme[] = [
  {
    slug: "apple",
    name: "Apple",
    tokens: {
      palette: {
        background: "#ffffff",
        surface: "#f5f5f7",
        text: "#1d1d1f",
        textMuted: "#6e6e73",
        accent: "#0071e3",
        accent2: "#000000",
        border: "#d2d2d7",
      },
      fonts: {
        heading: "DM Sans",
        body: "DM Sans",
        imports: [
          "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap",
        ],
      },
      type: { h1: 120, h2: 72, h3: 44, body: 28, caption: 20 },
      spacing: { paddingX: 160, paddingY: 120, gap: 40 },
      mood: "minimal",
    },
  },
  {
    slug: "editorial",
    name: "Editorial",
    tokens: {
      palette: {
        background: "#fdfcf7",
        surface: "#f5f1e8",
        text: "#1a1a1a",
        textMuted: "#5c5a52",
        accent: "#d4351c",
        accent2: "#1a1a1a",
        border: "#1a1a1a",
      },
      fonts: {
        heading: "DM Serif Display",
        body: "Bitter",
        imports: [
          "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Bitter:wght@400;600&display=swap",
        ],
      },
      type: { h1: 110, h2: 68, h3: 40, body: 26, caption: 18 },
      spacing: { paddingX: 130, paddingY: 100, gap: 36 },
      mood: "editorial",
    },
  },
  {
    slug: "cleantech",
    name: "CleanTech",
    tokens: {
      palette: {
        background: "#fafafa",
        surface: "#ffffff",
        text: "#0a0a0a",
        textMuted: "#525252",
        accent: "#2563eb",
        accent2: "#06b6d4",
        border: "#e5e5e5",
      },
      fonts: {
        heading: "Space Grotesk",
        body: "Space Grotesk",
        mono: "JetBrains Mono",
        imports: [
          "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap",
        ],
      },
      type: { h1: 96, h2: 60, h3: 36, body: 24, caption: 18 },
      spacing: { paddingX: 120, paddingY: 88, gap: 32 },
      mood: "tech",
    },
  },
  {
    slug: "bold",
    name: "Bold",
    tokens: {
      palette: {
        background: "#fde047",
        surface: "#0a0a0a",
        text: "#0a0a0a",
        textMuted: "#262626",
        accent: "#dc2626",
        accent2: "#0a0a0a",
        border: "#0a0a0a",
      },
      fonts: {
        heading: "DM Sans",
        body: "DM Sans",
        imports: [
          "https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;700;900&display=swap",
        ],
      },
      type: { h1: 144, h2: 88, h3: 52, body: 32, caption: 22 },
      spacing: { paddingX: 110, paddingY: 90, gap: 28 },
      mood: "bold",
    },
  },
  {
    slug: "dark",
    name: "Dark Cinematic",
    tokens: {
      palette: {
        background: "#0a0a0a",
        surface: "#171717",
        text: "#fafafa",
        textMuted: "#a3a3a3",
        accent: "#06b6d4",
        accent2: "#f59e0b",
        border: "#262626",
      },
      fonts: {
        heading: "Playfair Display",
        body: "DM Sans",
        imports: [
          "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=Playfair+Display:wght@400;700&display=swap",
        ],
      },
      type: { h1: 110, h2: 64, h3: 40, body: 26, caption: 18 },
      spacing: { paddingX: 130, paddingY: 100, gap: 32 },
      mood: "cinematic",
    },
  },
];
