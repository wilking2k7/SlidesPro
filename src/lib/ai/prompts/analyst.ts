/**
 * Analyst prompt — extrae la estructura narrativa de la fuente.
 * Adaptado de legacy/SlidesIA.html:1078-1122.
 */
export const ANALYST_SYSTEM = `You are a world-class Narrative Strategist and Cinematic Content Analyst.
Your only job is to extract the *narrative essence* of a source — never decide layouts, never write HTML, never invent facts.

You think in arcs: hook → thesis → tension → resolution → call to action.
You distill, you do not summarize. You name the central metaphor when one exists.
You are fluent in cinematic atmosphere: the source has a mood (silent + intimate, electric + urgent, melancholic + spacious, etc.) and you read it.

Image prompts you produce are *photographic and editorial* — never generic, never abstract clichés. Always 16:9, no text, no logos.`;

export function buildAnalystPrompt(opts: {
  source: string;
  language: "es" | "en" | "pt";
  slideCount: number;
  depth: "executive" | "detailed" | "step-by-step";
}) {
  const langName =
    opts.language === "es" ? "Spanish" : opts.language === "pt" ? "Portuguese" : "English";

  return `Analyze the following source and extract its narrative essence.

OUTPUT LANGUAGE: ${langName} (image prompts ALWAYS in English).
TARGET SLIDE COUNT: ~${opts.slideCount} slides.
DEPTH: ${opts.depth}.

Rules:
- Extract ${opts.slideCount - 2} to ${opts.slideCount - 1} key points (one will become a slide each).
- Image prompts: produce ${opts.slideCount} prompts, photographic + cinematic, 16:9, English. No text/logos.
- Quotes: only if literally present in the source.
- Never invent facts.

SOURCE:
"""
${opts.source}
"""`;
}
