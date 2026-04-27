import { generateObject, type CoreMessage } from "ai";
import { modelFor, googleClient } from "../providers";
import { AnalystOutput } from "../schemas";
import { ANALYST_SYSTEM, buildAnalystPrompt } from "../prompts/analyst";
import { isYouTubeUrl, canonicalYouTubeUrl } from "@/lib/ingest/source";

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

async function runAnalystOnVideo(input: AnalystInput): Promise<AnalystOutput> {
  // Normalizamos: /shorts/ABC → /watch?v=ABC para que fileData.fileUri sea
  // el formato que Gemini acepta sin problemas.
  const canonicalUrl = canonicalYouTubeUrl(input.source.trim());

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
          // URL canónica → el provider la manda como fileData.fileUri
          data: new URL(canonicalUrl),
          // Gemini acepta video/* o video/mp4 para YouTube
          mimeType: "video/*",
        },
      ],
    },
  ];

  // Modelo: gemini-2.0-flash-exp es el más probado con YouTube fileUri.
  // Si falla, hacemos fallback a texto con la URL como hint.
  const client = googleClient(input.apiKey);

  try {
    const { object } = await generateObject({
      model: client("gemini-2.0-flash-exp"),
      system: ANALYST_SYSTEM,
      schema: AnalystOutput,
      messages,
      temperature: 0.6,
      maxRetries: 1, // queremos saber rápido si el modelo no acepta video
    });
    return object;
  } catch (err) {
    const msg = (err as Error).message ?? "";
    console.warn(
      `[analyst] Video mode falló (${msg.slice(0, 200)}). Reintentando como texto…`
    );

    // Fallback: tratamos la URL como una "pista" textual. El modelo no leerá
    // el video, pero al menos responde con algo útil basado en el contexto
    // del título/canal si lo tiene previo, o pedirá más detalle.
    const fallbackPrompt = buildAnalystPrompt({
      ...input,
      source: `IMPORTANT: I tried to attach the video at ${canonicalUrl} but the API rejected it. Please return an AnalystOutput that asks the user to paste a transcript instead, by setting hook to a friendly request and keyPoints explaining what to paste. DO NOT invent the video's actual content.`,
    });

    const { object } = await generateObject({
      model: modelFor("balanced", input.apiKey),
      system: ANALYST_SYSTEM,
      prompt: fallbackPrompt,
      schema: AnalystOutput,
      temperature: 0.6,
      maxRetries: 1,
    });

    // Re-throw para que el job marque la presentación como ERROR con mensaje
    // claro. Mejor que generar contenido inventado.
    throw new VideoIngestionError(msg, canonicalUrl);
  }
}

export class VideoIngestionError extends Error {
  url: string;
  constructor(originalMessage: string, url: string) {
    super(
      `Gemini no pudo procesar el video. Esto suele pasar con: videos privados, age-gated, demasiado largos (>1h), o cuando la API tiene una restricción temporal.\n\nDetalle técnico: ${originalMessage.slice(0, 200)}\n\nIntenta: pegar el transcript en la pestaña 'Transcript' o usar un video público más corto.`
    );
    this.url = url;
    this.name = "VideoIngestionError";
  }
}
