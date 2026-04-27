/**
 * Descarga los subtítulos públicos de un video de YouTube. Usa la API
 * `timedtext` que YouTube sirve sin autenticación para videos públicos
 * (incluido shorts y videos age-restricted con captions auto-generados).
 *
 * Cuando Gemini falla en leer un video directamente, este es el fallback:
 * los subtítulos viajan como texto al pipeline normal del analyst.
 */

import { YoutubeTranscript } from "youtube-transcript";

export type TranscriptResult = {
  text: string;
  charCount: number;
  lang: string;
};

/**
 * Intenta obtener el transcript en orden de preferencia: español, inglés,
 * portugués, y como último recurso cualquier idioma disponible.
 */
export async function fetchYouTubeTranscript(
  videoId: string,
  langPrefs: string[] = ["es", "es-ES", "es-419", "en", "en-US", "pt"]
): Promise<TranscriptResult | null> {
  // Probamos cada idioma preferido en orden
  for (const lang of langPrefs) {
    const result = await tryFetch(videoId, lang).catch(() => null);
    if (result && result.text.trim().length > 50) return result;
  }

  // Último recurso: pedir sin lang (toma el default del video)
  const auto = await tryFetch(videoId).catch(() => null);
  if (auto && auto.text.trim().length > 50) return auto;

  return null;
}

async function tryFetch(videoId: string, lang?: string): Promise<TranscriptResult | null> {
  const opts = lang ? { lang } : undefined;
  const segments = await YoutubeTranscript.fetchTranscript(videoId, opts);
  if (!segments || segments.length === 0) return null;

  const text = segments
    .map((s) => decodeHtmlEntities(s.text))
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\[\s*Música\s*\]/gi, "")
    .replace(/\[\s*Music\s*\]/gi, "")
    .replace(/\[\s*Aplausos\s*\]/gi, "")
    .replace(/\[\s*Applause\s*\]/gi, "")
    .trim();

  return {
    text,
    charCount: text.length,
    lang: lang ?? "auto",
  };
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}
