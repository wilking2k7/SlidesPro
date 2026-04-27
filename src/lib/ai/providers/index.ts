import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * Providers IA. Las API keys NUNCA viajan al cliente — siempre se usan
 * desde server actions / route handlers / jobs.
 *
 * Las funciones aceptan opcionalmente una `apiKey` resuelta por workspace.
 * Si no se pasa, se cae a la variable de entorno (fallback global del SaaS
 * en producción / dev local con .env).
 *
 * Modelos:
 *  - Gemini 2.5 Flash: análisis narrativo y diseño (default).
 *  - Gemini 2.5 Pro: cuando se pide "smart" (designer).
 *  - Claude Sonnet (Fase 5): refinamiento conversacional con tool use.
 *  - OpenAI gpt-4o-mini: fallback opcional.
 */

export type ModelTier = "fast" | "balanced" | "smart" | "video";

export function googleClient(apiKey?: string) {
  const key = apiKey || process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    throw new Error(
      "GOOGLE_AI_API_KEY no configurada. Añádela en /dashboard/settings o en el .env del servidor. Obtén una en https://aistudio.google.com/app/apikey"
    );
  }
  return createGoogleGenerativeAI({ apiKey: key });
}

export function modelFor(tier: ModelTier, apiKey?: string) {
  const client = googleClient(apiKey);
  switch (tier) {
    case "fast":
    case "balanced":
      return client("gemini-2.5-flash");
    case "smart":
    case "video":
      return client("gemini-2.5-pro");
  }
}

export function anthropicClient(apiKey?: string) {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return createAnthropic({ apiKey: key });
}

export function openaiClient(apiKey?: string) {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) return null;
  return createOpenAI({ apiKey: key });
}
