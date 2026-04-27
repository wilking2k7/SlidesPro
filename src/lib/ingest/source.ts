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
