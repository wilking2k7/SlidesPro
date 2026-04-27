import { generateObject, type CoreMessage } from "ai";
import { modelFor, googleClient } from "../providers";
import { AnalystOutput } from "../schemas";
import { ANALYST_SYSTEM, buildAnalystPrompt } from "../prompts/analyst";
import { isYouTubeUrl, canonicalYouTubeUrl } from "@/lib/ingest/source";
import { fetchYouTubeTranscript } from "@/lib/ingest/youtube-transcript";
import { extractYouTubeId } from "@/lib/ingest/validate";

export type AnalystInput = {
  source: string;
  language: "es" | "en" | "pt";
  slideCount: number;
  depth: "executive" | "detailed" | "step-by-step";
  apiKey?: string;
};

export async function runAnalyst(input: AnalystInput): Promise<AnalystOutput> {
  const isVideo = isYouTubeUrl(input.source);

  if (isVideo) {
    return runAnalystOnVideo(input);
  }

  // Fuente de texto (transcript, artículo extraído, brief)
  return runAnalystOnText(input);
}

async function runAnalystOnText(input: AnalystInput): Promise<AnalystOutput> {
  const { object } = await generateObject({
    model: modelFor("balanced", input.apiKey),
    system: ANALYST_SYSTEM,
    prompt: buildAnalystPrompt(input),
    schema: AnalystOutput,
    temperature: 0.6,
    maxRetries: 2,
  });

  return object;
}

/**
 * Para YouTube intentamos en este orden:
 *   1) Pasar el video directo a Gemini (visión multimodal — funciona pero
 *      a veces falla por video age-gated, demasiado largo, INVALID_ARGUMENT).
 *   2) Si (1) falla, descargamos los subtítulos de YouTube vía la API pública
 *      timedtext (no requiere OAuth, funciona con auto-captions en la mayoría
 *      de videos incluido shorts y muchos restringidos). Pasamos el texto
 *      al modo texto.
 *   3) Si tampoco hay subtítulos, lanzamos un error con instrucciones útiles.
 */
async function runAnalystOnVideo(input: AnalystInput): Promise<AnalystOutput> {
  const canonicalUrl = canonicalYouTubeUrl(input.source.trim());
  const videoId = extractYouTubeId(canonicalUrl);

  // ── Paso 1: Gemini directo ───────────────────────────────────────────
  try {
    return await tryGeminiVideo(input, canonicalUrl);
  } catch (videoErr) {
    const msg = (videoErr as Error).message ?? "";
    console.warn(
      `[analyst] Gemini video falló (${msg.slice(0, 200)}). Probando fallback con subtítulos…`
    );

    // ── Paso 2: Subtítulos públicos como texto ────────────────────────
    if (videoId) {
      try {
        const transcript = await fetchYouTubeTranscript(videoId);
        if (transcript && transcript.text.length > 50) {
          console.info(
            `[analyst] Subtítulos obtenidos (${transcript.charCount} chars, lang=${transcript.lang}). Procesando como texto.`
          );
          return await runAnalystOnText({
            ...input,
            source: `Transcript del video YouTube ${canonicalUrl} (subtítulos en ${transcript.lang}):\n\n${transcript.text}`,
          });
        }
      } catch (capErr) {
        console.warn(
          `[analyst] Subtítulos también fallaron: ${(capErr as Error).message?.slice(0, 200)}`
        );
      }
    }

    // ── Paso 3: Sin opciones, error útil ──────────────────────────────
    throw new VideoIngestionError(msg, canonicalUrl);
  }
}

async function tryGeminiVideo(
  input: AnalystInput,
  canonicalUrl: string
): Promise<AnalystOutput> {
  const promptText = buildAnalystPrompt({
    ...input,
    source: "(see attached YouTube video)",
  });

  const messages: CoreMessage[] = [
    {
      role: "user",
      content: [
        { type: "text", text: promptText },
        {
          type: "file",
          data: new URL(canonicalUrl),
          mimeType: "video/*",
        },
      ],
    },
  ];

  const client = googleClient(input.apiKey);
  const { object } = await generateObject({
    model: client("gemini-2.0-flash-exp"),
    system: ANALYST_SYSTEM,
    schema: AnalystOutput,
    messages,
    temperature: 0.6,
    maxRetries: 1,
  });

  return object;
}

export class VideoIngestionError extends Error {
  url: string;
  constructor(originalMessage: string, url: string) {
    super(
      `No se pudo procesar el video. Esto suele pasar con: videos privados, videos sin subtítulos disponibles, o restricciones de la API.\n\nDetalle técnico: ${originalMessage.slice(0, 200)}\n\nQué intentar:\n· Verifica que el video sea público y tenga subtítulos\n· Pega el transcript manualmente en la pestaña 'Transcript'\n· Prueba con un video más corto`
    );
    this.url = url;
    this.name = "VideoIngestionError";
  }
}
