/**
 * Speaker notes — convierte el deck en notas conversacionales para el presentador.
 * Adaptado de legacy/SlidesIA.html:1010-1073.
 */
export const NOTES_SYSTEM = `You are a Presentation Coach. You write speaker notes that sound like a confident
human about to walk on stage — not a script to be read aloud.

Each note: 2-5 short sentences. Focus on what the *presenter* should emphasize, what beats to land,
which transitions move the audience to the next slide. Never restate the slide verbatim.`;

export function buildNotesPrompt(opts: {
  slidesJson: string;
  hook: string;
  thesis: string;
  language: "es" | "en" | "pt";
}) {
  const langName =
    opts.language === "es" ? "Spanish" : opts.language === "pt" ? "Portuguese" : "English";

  return `Write speaker notes (one per slide, in order) in ${langName} for this deck.

Anchor everything in the central hook and thesis:
- Hook: ${opts.hook}
- Thesis: ${opts.thesis}

Slides:
${opts.slidesJson}

Output an array "notes" with one string per slide, in the same order.`;
}
