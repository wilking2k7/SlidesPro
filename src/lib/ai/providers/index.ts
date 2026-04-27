import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * Providers IA. Las API keys NUNCA viajan al cliente — siempre se usan
 * desde server actions / route handlers.
 *
 * Modelos elegidos:
 *  - Gemini 2.5 Flash: análisis narrativo y diseño (rápido, barato, bueno con
 *    JSON estructurado y video). Default.
 *  - Claude Sonnet (más adelante): refinamiento conversacional con tool use.
 *  - OpenAI gpt-4o-mini: fallback opcional.
 *
 * Para imágenes usamos Gemini 2.0 Flash con image generation experimental
 * (ver lib/ai/image.ts).
 */

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

export const anthropic = process.env.ANTHROPIC_API_KEY
  ? createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export const openai = process.env.OPENAI_API_KEY
  ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const MODELS = {
  // Texto
  fast: () => google("gemini-2.5-flash"),
  balanced: () => google("gemini-2.5-flash"),
  smart: () => google("gemini-2.5-pro"),
  // Multimodal con video (legacy lo usaba para leer YouTube directo)
  video: () => google("gemini-2.5-pro"),
} as const;

export function assertGoogleApiKey() {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error(
      "GOOGLE_AI_API_KEY no configurada. Obtén una en https://aistudio.google.com/app/apikey"
    );
  }
}
