import { generateObject, type CoreMessage } from "ai";
import { modelFor } from "../providers";
import { AnalystOutput } from "../schemas";
import { ANALYST_SYSTEM, buildAnalystPrompt } from "../prompts/analyst";
import { isYouTubeUrl } from "@/lib/ingest/source";

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
    // Gemini lee el video directamente como "file part" — esto es lo que el
    // legacy hacía bien y mi versión anterior tenía rota (el URL viajaba como
    // texto literal en el prompt y el modelo se inventaba el contenido).
    const promptText = buildAnalystPrompt({
      ...input,
      source: "(see attached video)",
    });

    const messages: CoreMessage[] = [
      {
        role: "user",
        content: [
          { type: "text", text: promptText },
          {
            type: "file",
            // URL para que el provider de Google lo mande como
            // `fileData.fileUri` (Gemini soporta YouTube nativamente).
            data: new URL(input.source.trim()),
            mimeType: "video/mp4",
          },
        ],
      },
    ];

    const { object } = await generateObject({
      // Modelo Pro para video (mejor multimodal)
      model: modelFor("video", input.apiKey),
      system: ANALYST_SYSTEM,
      schema: AnalystOutput,
      messages,
      temperature: 0.6,
      maxRetries: 2,
    });

    return object;
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
