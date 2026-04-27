import {
  type Slide,
  type SlideElement,
  type SlideLayout,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from "@/lib/schema/slide";
import type { ThemeTokens } from "@/lib/schema/theme";
import type { SlideContent } from "./schemas";

/**
 * Layout builders: convierten la salida simple de la IA (SlideContent) en un
 * Slide completamente posicionado sobre el canvas 1920x1080, usando los
 * tokens del theme (paleta, tipografía, padding).
 *
 * Cada función toma (content, theme, opts) y retorna un Slide válido.
 * Toda la "inteligencia visual" vive aquí, NO en el LLM — eso hace el
 * resultado predecible y editable más adelante.
 */

const W = CANVAS_WIDTH;
const H = CANVAS_HEIGHT;

let elemCounter = 0;
function elemId(prefix = "el"): string {
  elemCounter++;
  return `${prefix}-${Date.now().toString(36)}-${elemCounter}`;
}

// Helper: simple text element
function textBox(opts: {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  vAlign?: "top" | "middle" | "bottom";
  letterSpacing?: number;
  lineHeight?: number;
}): Extract<SlideElement, { type: "text" }> {
  return {
    id: elemId("text"),
    type: "text",
    bbox: {
      x: opts.x,
      y: opts.y,
      w: opts.w,
      h: opts.h,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
    },
    paragraphs: [
      {
        align: opts.align ?? "left",
        bullet: "none",
        level: 0,
        lineHeight: opts.lineHeight ?? 1.25,
        spaceBefore: 0,
        spaceAfter: 0,
        runs: [
          {
            text: opts.text,
            style: {
              bold: opts.bold,
              italic: opts.italic,
              fontFamily: opts.fontFamily,
              fontSize: opts.fontSize,
              color: opts.color,
              letterSpacing: opts.letterSpacing,
            },
          },
        ],
      },
    ],
    padding: 0,
    vAlign: opts.vAlign ?? "top",
  };
}

// Bullets list: one paragraph per bullet
function bulletsBox(opts: {
  x: number;
  y: number;
  w: number;
  h: number;
  bullets: string[];
  fontFamily: string;
  fontSize: number;
  color: string;
  accent: string;
}): Extract<SlideElement, { type: "text" }> {
  return {
    id: elemId("bullets"),
    type: "text",
    bbox: { x: opts.x, y: opts.y, w: opts.w, h: opts.h, rotation: 0, opacity: 1, zIndex: 1 },
    paragraphs: opts.bullets.map((b) => ({
      align: "left" as const,
      bullet: "disc" as const,
      level: 0,
      lineHeight: 1.4,
      spaceBefore: 0,
      spaceAfter: 24,
      runs: [
        {
          text: b,
          style: {
            fontFamily: opts.fontFamily,
            fontSize: opts.fontSize,
            color: opts.color,
          },
        },
      ],
    })),
    padding: 0,
    vAlign: "top",
  };
}

function imageBox(opts: {
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
  fit?: "cover" | "contain";
  borderRadius?: number;
  prompt?: string;
}): Extract<SlideElement, { type: "image" }> {
  return {
    id: elemId("img"),
    type: "image",
    bbox: { x: opts.x, y: opts.y, w: opts.w, h: opts.h, rotation: 0, opacity: 1, zIndex: 0 },
    src: opts.src,
    fit: opts.fit ?? "cover",
    borderRadius: opts.borderRadius ?? 0,
    aiPrompt: opts.prompt,
  };
}

function shapeAccent(opts: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  shape?: "rect" | "ellipse" | "line";
}): Extract<SlideElement, { type: "shape" }> {
  return {
    id: elemId("shape"),
    type: "shape",
    bbox: { x: opts.x, y: opts.y, w: opts.w, h: opts.h, rotation: 0, opacity: 1, zIndex: 0 },
    shape: opts.shape ?? "rect",
    fill: { kind: "solid", color: opts.color },
    borderRadius: 0,
  };
}

// Placeholder elegante (no dice "generating"). Se queda visible si la
// generación de imágenes está deshabilitada o si falló — en ambos casos
// queremos que el slide siga viéndose bien.
const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 1080'>
      <defs>
        <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0' stop-color='#dbeafe'/>
          <stop offset='0.5' stop-color='#93c5fd'/>
          <stop offset='1' stop-color='#3b82f6'/>
        </linearGradient>
        <linearGradient id='h' x1='0' x2='0' y1='0' y2='1'>
          <stop offset='0' stop-color='rgba(255,255,255,0.18)'/>
          <stop offset='1' stop-color='rgba(255,255,255,0)'/>
        </linearGradient>
      </defs>
      <rect width='1920' height='1080' fill='url(#g)'/>
      <path d='M0,800 Q480,600 960,720 T1920,640 L1920,1080 L0,1080 Z' fill='url(#h)'/>
      <path d='M0,900 Q640,750 1280,830 T1920,800 L1920,1080 L0,1080 Z' fill='rgba(255,255,255,0.1)'/>
    </svg>`
  );

// ─── Builders ────────────────────────────────────────────────────────────────

type BuilderArgs = {
  content: SlideContent;
  theme: ThemeTokens;
  imageUrl?: string; // resolved AI image URL (if any)
};

function buildCover({ content, theme, imageUrl }: BuilderArgs): Slide {
  if (content.layout !== "cover") throw new Error("layout mismatch");
  const elements: SlideElement[] = [];
  const padX = theme.spacing.paddingX;
  const useImage = content.imagePromptIndex !== undefined;

  if (useImage && imageUrl) {
    elements.push(
      imageBox({ x: 0, y: 0, w: W, h: H, src: imageUrl, fit: "cover", prompt: undefined })
    );
    // dark overlay for legibility
    elements.push(shapeAccent({ x: 0, y: 0, w: W, h: H, color: "rgba(0,0,0,0.45)" }));
  } else if (useImage) {
    elements.push(imageBox({ x: 0, y: 0, w: W, h: H, src: PLACEHOLDER_IMG, fit: "cover" }));
  }

  const textColor = useImage ? "#ffffff" : theme.palette.text;
  const mutedColor = useImage ? "rgba(255,255,255,0.75)" : theme.palette.textMuted;

  let y = H * 0.45;
  if (content.eyebrow) {
    elements.push(
      textBox({
        x: padX,
        y,
        w: W - padX * 2,
        h: 50,
        text: content.eyebrow.toUpperCase(),
        fontFamily: theme.fonts.body,
        fontSize: theme.type.caption,
        color: useImage ? mutedColor : theme.palette.accent,
        letterSpacing: 4,
        bold: true,
      })
    );
    y += 70;
  }
  elements.push(
    textBox({
      x: padX,
      y,
      w: W - padX * 2,
      h: 220,
      text: content.title,
      fontFamily: theme.fonts.heading,
      fontSize: theme.type.h1,
      color: textColor,
      bold: true,
      lineHeight: 1.05,
    })
  );
  y += 240;
  if (content.subtitle) {
    elements.push(
      textBox({
        x: padX,
        y,
        w: W - padX * 2,
        h: 100,
        text: content.subtitle,
        fontFamily: theme.fonts.body,
        fontSize: theme.type.h3,
        color: mutedColor,
        lineHeight: 1.3,
      })
    );
  }

  return {
    id: elemId("slide"),
    layout: "title" as SlideLayout,
    background: useImage
      ? { kind: "color", color: "#000000" }
      : { kind: "color", color: theme.palette.background },
    elements,
    notes: "",
    meta: { generatedBy: "designer:cover" },
  };
}

function buildTitleContent({ content, theme }: BuilderArgs): Slide {
  if (content.layout !== "title-content") throw new Error("layout mismatch");
  const padX = theme.spacing.paddingX;
  const padY = theme.spacing.paddingY;
  const elements: SlideElement[] = [];

  let y = padY;
  if (content.eyebrow) {
    elements.push(
      textBox({
        x: padX,
        y,
        w: W - padX * 2,
        h: 40,
        text: content.eyebrow.toUpperCase(),
        fontFamily: theme.fonts.body,
        fontSize: theme.type.caption,
        color: theme.palette.accent,
        letterSpacing: 4,
        bold: true,
      })
    );
    y += 60;
  }
  elements.push(
    textBox({
      x: padX,
      y,
      w: W - padX * 2,
      h: 180,
      text: content.title,
      fontFamily: theme.fonts.heading,
      fontSize: theme.type.h2,
      color: theme.palette.text,
      bold: true,
      lineHeight: 1.1,
    })
  );
  y += 200;
  // accent rule
  elements.push(
    shapeAccent({ x: padX, y, w: 80, h: 6, color: theme.palette.accent, shape: "rect" })
  );
  y += 50;
  elements.push(
    textBox({
      x: padX,
      y,
      w: W - padX * 2,
      h: H - y - padY,
      text: content.body,
      fontFamily: theme.fonts.body,
      fontSize: theme.type.body,
      color: theme.palette.textMuted,
      lineHeight: 1.5,
    })
  );

  return {
    id: elemId("slide"),
    layout: "title-content",
    background: { kind: "color", color: theme.palette.background },
    elements,
    notes: "",
    meta: { generatedBy: "designer:title-content" },
  };
}

function buildBullets({ content, theme }: BuilderArgs): Slide {
  if (content.layout !== "bullets") throw new Error("layout mismatch");
  const padX = theme.spacing.paddingX;
  const padY = theme.spacing.paddingY;
  const elements: SlideElement[] = [];

  let y = padY;
  if (content.eyebrow) {
    elements.push(
      textBox({
        x: padX,
        y,
        w: W - padX * 2,
        h: 40,
        text: content.eyebrow.toUpperCase(),
        fontFamily: theme.fonts.body,
        fontSize: theme.type.caption,
        color: theme.palette.accent,
        letterSpacing: 4,
        bold: true,
      })
    );
    y += 60;
  }
  elements.push(
    textBox({
      x: padX,
      y,
      w: W - padX * 2,
      h: 130,
      text: content.title,
      fontFamily: theme.fonts.heading,
      fontSize: theme.type.h2,
      color: theme.palette.text,
      bold: true,
      lineHeight: 1.1,
    })
  );
  y += 170;
  elements.push(
    bulletsBox({
      x: padX,
      y,
      w: W - padX * 2,
      h: H - y - padY,
      bullets: content.bullets,
      fontFamily: theme.fonts.body,
      fontSize: theme.type.body,
      color: theme.palette.text,
      accent: theme.palette.accent,
    })
  );

  return {
    id: elemId("slide"),
    layout: "title-content",
    background: { kind: "color", color: theme.palette.background },
    elements,
    notes: "",
    meta: { generatedBy: "designer:bullets" },
  };
}

function buildTwoCol({ content, theme }: BuilderArgs): Slide {
  if (content.layout !== "two-col") throw new Error("layout mismatch");
  const padX = theme.spacing.paddingX;
  const padY = theme.spacing.paddingY;
  const gap = theme.spacing.gap;
  const elements: SlideElement[] = [];

  let y = padY;
  if (content.title) {
    elements.push(
      textBox({
        x: padX,
        y,
        w: W - padX * 2,
        h: 130,
        text: content.title,
        fontFamily: theme.fonts.heading,
        fontSize: theme.type.h2,
        color: theme.palette.text,
        bold: true,
        lineHeight: 1.1,
      })
    );
    y += 170;
  }

  const colW = (W - padX * 2 - gap) / 2;
  const colH = H - y - padY;

  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? content.left : content.right;
    const x = padX + i * (colW + gap);
    elements.push(
      shapeAccent({
        x,
        y,
        w: 60,
        h: 5,
        color: theme.palette.accent,
      })
    );
    elements.push(
      textBox({
        x,
        y: y + 30,
        w: colW,
        h: 80,
        text: side.heading,
        fontFamily: theme.fonts.heading,
        fontSize: theme.type.h3,
        color: theme.palette.text,
        bold: true,
        lineHeight: 1.2,
      })
    );
    elements.push(
      textBox({
        x,
        y: y + 130,
        w: colW,
        h: colH - 130,
        text: side.body,
        fontFamily: theme.fonts.body,
        fontSize: theme.type.body,
        color: theme.palette.textMuted,
        lineHeight: 1.5,
      })
    );
  }

  return {
    id: elemId("slide"),
    layout: "two-col",
    background: { kind: "color", color: theme.palette.background },
    elements,
    notes: "",
    meta: { generatedBy: "designer:two-col" },
  };
}

function buildImageSide({
  content,
  theme,
  imageUrl,
  side,
}: BuilderArgs & { side: "left" | "right" }): Slide {
  if (content.layout !== "image-left" && content.layout !== "image-right")
    throw new Error("layout mismatch");
  const padX = theme.spacing.paddingX;
  const padY = theme.spacing.paddingY;
  const gap = theme.spacing.gap * 2;
  const elements: SlideElement[] = [];

  // image takes ~ 50% of width
  const imgW = W * 0.5;
  const imgX = side === "left" ? 0 : W - imgW;
  elements.push(
    imageBox({
      x: imgX,
      y: 0,
      w: imgW,
      h: H,
      src: imageUrl ?? PLACEHOLDER_IMG,
      fit: "cover",
    })
  );

  // text on the other half
  const textX = side === "left" ? imgW + gap : padX;
  const textW = W - imgW - gap - padX;

  let y = padY;
  elements.push(
    textBox({
      x: textX,
      y,
      w: textW,
      h: 180,
      text: content.title,
      fontFamily: theme.fonts.heading,
      fontSize: theme.type.h2,
      color: theme.palette.text,
      bold: true,
      lineHeight: 1.1,
    })
  );
  y += 200;
  elements.push(shapeAccent({ x: textX, y, w: 80, h: 5, color: theme.palette.accent }));
  y += 50;
  elements.push(
    textBox({
      x: textX,
      y,
      w: textW,
      h: H - y - padY,
      text: content.body,
      fontFamily: theme.fonts.body,
      fontSize: theme.type.body,
      color: theme.palette.textMuted,
      lineHeight: 1.5,
    })
  );

  return {
    id: elemId("slide"),
    layout: side === "left" ? "image-left" : "image-right",
    background: { kind: "color", color: theme.palette.background },
    elements,
    notes: "",
    meta: { generatedBy: `designer:image-${side}` },
  };
}

function buildImageFull({ content, theme, imageUrl }: BuilderArgs): Slide {
  if (content.layout !== "image-full") throw new Error("layout mismatch");
  const padX = theme.spacing.paddingX;
  const elements: SlideElement[] = [];

  elements.push(
    imageBox({ x: 0, y: 0, w: W, h: H, src: imageUrl ?? PLACEHOLDER_IMG, fit: "cover" })
  );
  // gradient overlay bottom
  elements.push(shapeAccent({ x: 0, y: H * 0.4, w: W, h: H * 0.6, color: "rgba(0,0,0,0.55)" }));

  let y = H * 0.65;
  elements.push(
    textBox({
      x: padX,
      y,
      w: W - padX * 2,
      h: 200,
      text: content.title,
      fontFamily: theme.fonts.heading,
      fontSize: theme.type.h1,
      color: "#ffffff",
      bold: true,
      lineHeight: 1.05,
    })
  );
  y += 220;
  if (content.subtitle) {
    elements.push(
      textBox({
        x: padX,
        y,
        w: W - padX * 2,
        h: 80,
        text: content.subtitle,
        fontFamily: theme.fonts.body,
        fontSize: theme.type.h3,
        color: "rgba(255,255,255,0.85)",
        lineHeight: 1.3,
      })
    );
  }

  return {
    id: elemId("slide"),
    layout: "image-full",
    background: { kind: "color", color: "#000000" },
    elements,
    notes: "",
    meta: { generatedBy: "designer:image-full" },
  };
}

function buildQuote({ content, theme }: BuilderArgs): Slide {
  if (content.layout !== "quote") throw new Error("layout mismatch");
  const padX = theme.spacing.paddingX;
  const elements: SlideElement[] = [];

  // big quotation mark
  elements.push(
    textBox({
      x: padX,
      y: H * 0.18,
      w: 120,
      h: 120,
      text: "“",
      fontFamily: theme.fonts.heading,
      fontSize: 200,
      color: theme.palette.accent,
      bold: true,
    })
  );

  elements.push(
    textBox({
      x: padX,
      y: H * 0.32,
      w: W - padX * 2,
      h: H * 0.4,
      text: content.quote,
      fontFamily: theme.fonts.heading,
      fontSize: theme.type.h2,
      color: theme.palette.text,
      italic: true,
      lineHeight: 1.25,
    })
  );

  if (content.attribution) {
    elements.push(
      textBox({
        x: padX,
        y: H * 0.78,
        w: W - padX * 2,
        h: 60,
        text: `— ${content.attribution}`,
        fontFamily: theme.fonts.body,
        fontSize: theme.type.body,
        color: theme.palette.textMuted,
      })
    );
  }

  return {
    id: elemId("slide"),
    layout: "quote",
    background: { kind: "color", color: theme.palette.surface },
    elements,
    notes: "",
    meta: { generatedBy: "designer:quote" },
  };
}

function buildSection({ content, theme }: BuilderArgs): Slide {
  if (content.layout !== "section") throw new Error("layout mismatch");
  const padX = theme.spacing.paddingX;
  const elements: SlideElement[] = [];

  let y = H * 0.4;
  if (content.eyebrow) {
    elements.push(
      textBox({
        x: padX,
        y,
        w: W - padX * 2,
        h: 50,
        text: content.eyebrow.toUpperCase(),
        fontFamily: theme.fonts.body,
        fontSize: theme.type.caption,
        color: theme.palette.accent,
        letterSpacing: 6,
        bold: true,
      })
    );
    y += 70;
  }
  elements.push(
    textBox({
      x: padX,
      y,
      w: W - padX * 2,
      h: 250,
      text: content.title,
      fontFamily: theme.fonts.heading,
      fontSize: theme.type.h1,
      color: theme.palette.text,
      bold: true,
      lineHeight: 1.05,
    })
  );

  return {
    id: elemId("slide"),
    layout: "section",
    background: { kind: "color", color: theme.palette.surface },
    elements,
    notes: "",
    meta: { generatedBy: "designer:section" },
  };
}

function buildClosing({ content, theme }: BuilderArgs): Slide {
  if (content.layout !== "closing") throw new Error("layout mismatch");
  const padX = theme.spacing.paddingX;
  const elements: SlideElement[] = [];

  let y = H * 0.4;
  elements.push(
    textBox({
      x: padX,
      y,
      w: W - padX * 2,
      h: 200,
      text: content.title,
      fontFamily: theme.fonts.heading,
      fontSize: theme.type.h1,
      color: theme.palette.text,
      bold: true,
      lineHeight: 1.05,
    })
  );
  y += 240;
  elements.push(shapeAccent({ x: padX, y, w: 100, h: 6, color: theme.palette.accent }));
  y += 50;
  elements.push(
    textBox({
      x: padX,
      y,
      w: W - padX * 2,
      h: 100,
      text: content.cta,
      fontFamily: theme.fonts.body,
      fontSize: theme.type.h3,
      color: theme.palette.textMuted,
      lineHeight: 1.3,
    })
  );

  return {
    id: elemId("slide"),
    layout: "closing",
    background: { kind: "color", color: theme.palette.background },
    elements,
    notes: "",
    meta: { generatedBy: "designer:closing" },
  };
}

// ─── Public dispatch ─────────────────────────────────────────────────────────

export function buildSlide(args: BuilderArgs): Slide {
  switch (args.content.layout) {
    case "cover":
      return buildCover(args);
    case "title-content":
      return buildTitleContent(args);
    case "bullets":
      return buildBullets(args);
    case "two-col":
      return buildTwoCol(args);
    case "image-left":
      return buildImageSide({ ...args, side: "left" });
    case "image-right":
      return buildImageSide({ ...args, side: "right" });
    case "image-full":
      return buildImageFull(args);
    case "quote":
      return buildQuote(args);
    case "section":
      return buildSection(args);
    case "closing":
      return buildClosing(args);
  }
}
