/**
 * Fetch de un artículo / página web y extracción del texto principal.
 * No usamos un parser tipo Readability para mantener deps mínimas — el
 * algoritmo simple aquí elimina <script>/<style>/<nav>/<footer>, conserva
 * todo lo que está dentro de <article>/<main> si existe, y normaliza.
 *
 * Suficiente para ~80% de blogs. Si en el futuro queremos algo robusto,
 * se reemplaza con `@mozilla/readability` + jsdom.
 */

const FETCH_TIMEOUT_MS = 12000;
const MAX_BYTES = 5_000_000; // 5MB

export async function fetchArticleText(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SlidesPro/1.0; +https://slidespro.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`No se pudo cargar la página (HTTP ${res.status})`);
    }
    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.includes("text/html") && !ctype.includes("xhtml")) {
      throw new Error(`Tipo de contenido no soportado: ${ctype}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      throw new Error("El documento es demasiado grande (>5MB)");
    }
    const html = buf.toString("utf8");
    return extractMainText(html);
  } finally {
    clearTimeout(t);
  }
}

function extractMainText(html: string): string {
  // 1. Eliminar elementos ruidosos
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "");

  // 2. Si hay <article> o <main>, quedarse con eso
  const article = cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (article) cleaned = article[1];
  else {
    const main = cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (main) cleaned = main[1];
  }

  // 3. Eliminar header/nav/footer/aside típicos
  cleaned = cleaned
    .replace(/<(header|nav|footer|aside)[\s\S]*?<\/\1>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "");

  // 4. Strip tags y decode HTML entities básicas
  const text = cleaned
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (text.length < 100) {
    throw new Error("El artículo no tiene suficiente texto para generar una presentación.");
  }

  // 5. Truncar si es demasiado largo (Gemini context tiene límite, ~50k chars seguros)
  return text.slice(0, 50_000);
}
