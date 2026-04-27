/**
 * Validadores de fuentes — verifican que un URL es accesible/válido y
 * devuelven metadata para mostrar preview al usuario antes de generar.
 *
 * NO descargamos el contenido completo aquí; solo HEAD/oEmbed y un
 * pedazo del HTML para sacar título e imagen og.
 */

const FETCH_TIMEOUT_MS = 6000;

// ─── YouTube ────────────────────────────────────────────────────────────────

export type YouTubeMeta = {
  ok: true;
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  duration?: string;
  /** Si los subtítulos están disponibles, podemos generar aún si Gemini falla */
  hasTranscript: boolean;
  transcriptLang?: string;
  transcriptChars?: number;
};
export type YouTubeError = { ok: false; error: string; code?: string };

export async function validateYouTube(
  url: string
): Promise<YouTubeMeta | YouTubeError> {
  const id = extractYouTubeId(url);
  if (!id) {
    return { ok: false, error: "El link no parece ser de YouTube", code: "BAD_URL" };
  }

  // YouTube oEmbed: público, sin API key, devuelve título + autor + thumb.
  // Si el video no existe o es privado/age-gated, devuelve 401/404.
  const oembed = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  let oembedResult:
    | { title: string; author_name: string; thumbnail_url: string }
    | null = null;
  let oembedError: YouTubeError | null = null;

  try {
    const res = await fetch(oembed, { signal: ctrl.signal });
    if (res.status === 401) {
      oembedError = {
        ok: false,
        error: "Video privado o restringido — Gemini no podrá leerlo directo",
        code: "PRIVATE",
      };
    } else if (res.status === 404) {
      oembedError = { ok: false, error: "Video no encontrado", code: "NOT_FOUND" };
    } else if (!res.ok) {
      oembedError = {
        ok: false,
        error: `YouTube respondió ${res.status}`,
        code: "HTTP_ERROR",
      };
    } else {
      oembedResult = (await res.json()) as {
        title: string;
        author_name: string;
        thumbnail_url: string;
      };
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      oembedError = { ok: false, error: "Tiempo de espera agotado", code: "TIMEOUT" };
    } else {
      oembedError = {
        ok: false,
        error: "No se pudo validar el video",
        code: "FETCH_ERROR",
      };
    }
  } finally {
    clearTimeout(t);
  }

  // Probamos si hay subtítulos disponibles. Si los hay, el video puede
  // generar incluso si oEmbed falló (privado/restringido).
  const transcriptInfo = await peekTranscript(id);

  if (oembedResult) {
    return {
      ok: true,
      videoId: id,
      title: oembedResult.title,
      author: oembedResult.author_name,
      thumbnail: oembedResult.thumbnail_url,
      hasTranscript: !!transcriptInfo,
      transcriptLang: transcriptInfo?.lang,
      transcriptChars: transcriptInfo?.chars,
    };
  }

  // oEmbed falló pero hay subtítulos → todavía podemos generar
  if (transcriptInfo) {
    return {
      ok: true,
      videoId: id,
      title: `Video ${id} (subtítulos disponibles)`,
      author: "—",
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      hasTranscript: true,
      transcriptLang: transcriptInfo.lang,
      transcriptChars: transcriptInfo.chars,
    };
  }

  return oembedError ?? { ok: false, error: "No se pudo validar el video" };
}

/**
 * Verifica si los subtítulos están disponibles. Muy rápido — solo descarga
 * los primeros segmentos para chequear, no el transcript completo (que
 * vendría después en la generación si Gemini falla).
 */
async function peekTranscript(
  videoId: string
): Promise<{ lang: string; chars: number } | null> {
  try {
    // Import dinámico para evitar bundling en edge runtime
    const { fetchYouTubeTranscript } = await import("./youtube-transcript");
    const result = await fetchYouTubeTranscript(videoId);
    if (result && result.charCount > 50) {
      return { lang: result.lang, chars: result.charCount };
    }
    return null;
  } catch {
    return null;
  }
}

export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return m[1];
  }
  return null;
}

// ─── URL artículo ───────────────────────────────────────────────────────────

export type UrlMeta = {
  ok: true;
  title: string;
  domain: string;
  image: string | null;
  description: string | null;
  estimatedChars: number;
};
export type UrlError = { ok: false; error: string; code?: string };

const MAX_PREVIEW_BYTES = 200_000; // 200KB es suficiente para sacar <head>

export async function validateUrl(url: string): Promise<UrlMeta | UrlError> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "URL inválida", code: "BAD_URL" };
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return { ok: false, error: "Solo URLs http/https", code: "BAD_PROTOCOL" };
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SlidesPro/1.0 Validator; +https://slidespro.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `La página respondió ${res.status}`,
        code: "HTTP_ERROR",
      };
    }
    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.includes("text/html") && !ctype.includes("xhtml")) {
      return {
        ok: false,
        error: `Tipo de contenido no soportado (${ctype.split(";")[0]})`,
        code: "BAD_CONTENT_TYPE",
      };
    }

    // Solo leer los primeros 200KB para sacar metadata
    const reader = res.body?.getReader();
    if (!reader) return { ok: false, error: "No se pudo leer la página", code: "NO_BODY" };
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_PREVIEW_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    reader.cancel().catch(() => {});
    const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");

    const title = extractTitle(html) || parsed.hostname;
    const image = extractMeta(html, "og:image") ?? extractMeta(html, "twitter:image");
    const description =
      extractMeta(html, "og:description") ?? extractMeta(html, "description");

    // Estimación rápida de caracteres "útiles" (solo del fragment leído)
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");

    return {
      ok: true,
      title,
      domain: parsed.hostname,
      image: image ? makeAbsolute(image, parsed) : null,
      description,
      estimatedChars: stripped.length,
    };
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return { ok: false, error: "Tiempo de espera agotado", code: "TIMEOUT" };
    }
    return {
      ok: false,
      error: "No se pudo cargar la página",
      code: "FETCH_ERROR",
    };
  } finally {
    clearTimeout(t);
  }
}

function extractTitle(html: string): string | null {
  const og = extractMeta(html, "og:title") ?? extractMeta(html, "twitter:title");
  if (og) return og;
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeHtml(m[1].trim()) : null;
}

function extractMeta(html: string, prop: string): string | null {
  // Busca <meta property="og:image" content="..."> o name="og:image"
  const re1 = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}["'][^>]*content=["']([^"']+)["']`,
    "i"
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}["']`,
    "i"
  );
  const m = html.match(re1) ?? html.match(re2);
  return m ? decodeHtml(m[1]) : null;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

function makeAbsolute(src: string, base: URL): string {
  try {
    return new URL(src, base).toString();
  } catch {
    return src;
  }
}
