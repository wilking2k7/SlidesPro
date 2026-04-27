/**
 * Detección y normalización de la fuente que provee el usuario.
 *
 * Una "fuente" puede ser:
 *   - youtube: URL a video de YouTube (Gemini la consume como video nativo)
 *   - url: artículo / página web (fetcheamos HTML y extraemos texto)
 *   - text: transcript / brief / cualquier texto pegado
 *   - pdf: archivo PDF subido
 *   - docx: archivo Word subido
 */

export type SourceKind = "youtube" | "url" | "text" | "pdf" | "docx";

const YOUTUBE_RE = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//i;
const URL_RE = /^https?:\/\/[^\s]+$/i;

export function detectSourceKind(input: string): SourceKind {
  const trimmed = input.trim();
  if (YOUTUBE_RE.test(trimmed)) return "youtube";
  if (URL_RE.test(trimmed)) return "url";
  return "text";
}

export function isYouTubeUrl(s: string): boolean {
  return YOUTUBE_RE.test(s.trim());
}

/**
 * Normaliza cualquier URL de YouTube (shorts, youtu.be, embed) al formato
 * canónico `https://www.youtube.com/watch?v=XXXXXXXXXXX`. Gemini espera ese
 * formato en `fileData.fileUri`.
 */
export function canonicalYouTubeUrl(input: string): string {
  const trimmed = input.trim();
  const id = extractYouTubeIdLocal(trimmed);
  if (!id) return trimmed; // si no podemos extraer id, dejamos pasar tal cual
  return `https://www.youtube.com/watch?v=${id}`;
}

function extractYouTubeIdLocal(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}
