/**
 * Generación de imágenes vía la API REST de Gemini.
 *
 * Google ha ido renombrando el modelo de image-gen varias veces. Para no
 * quedar atados a un nombre específico, intentamos una cadena de fallback
 * en orden de preferencia. El primer modelo que funcione gana.
 *
 * En caso de fallo total devolvemos null y loggeamos el último error
 * con detalle para diagnosticar.
 */

// Orden de fallback. Probamos en este orden hasta encontrar uno que funcione.
const IMAGE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-2.5-flash-image-preview",
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.0-flash-exp-image-generation",
];

export type GeneratedImage = {
  buffer: Buffer;
  contentType: string;
};

export async function generateImage(
  prompt: string,
  apiKey?: string
): Promise<GeneratedImage | null> {
  const key = apiKey || process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    console.warn("[image] GOOGLE_AI_API_KEY no configurada — saltando generación.");
    return null;
  }

  const enrichedPrompt = enrichPrompt(prompt);
  let lastError: string | null = null;

  for (const model of IMAGE_MODELS) {
    const result = await tryModel(model, enrichedPrompt, key);
    if (result.success) {
      return result.image;
    }
    lastError = result.error;
    // Solo intentamos siguiente modelo si fue 404 (modelo no existe). Para otros
    // errores (auth, quota, content policy) no tiene sentido seguir.
    if (!result.modelMissing) {
      break;
    }
  }

  console.warn(`[image] Todos los modelos fallaron. Último error: ${lastError}`);
  return null;
}

type ModelTryResult =
  | { success: true; image: GeneratedImage }
  | { success: false; error: string; modelMissing: boolean };

async function tryModel(
  model: string,
  prompt: string,
  key: string
): Promise<ModelTryResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
      temperature: 0.85,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "<no body>");
      const modelMissing = res.status === 404 || /not found|not supported|unknown model/i.test(errorText);
      console.warn(
        `[image] ${model}: HTTP ${res.status}${modelMissing ? " (modelo no encontrado, probando siguiente)" : ""} — ${errorText.slice(0, 240)}`
      );
      return {
        success: false,
        error: `${model} → HTTP ${res.status}: ${errorText.slice(0, 180)}`,
        modelMissing,
      };
    }

    const json = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inline_data?: { mime_type: string; data: string };
            inlineData?: { mimeType: string; data: string };
            text?: string;
          }>;
        };
      }>;
      promptFeedback?: { blockReason?: string };
    };

    if (json.promptFeedback?.blockReason) {
      console.warn(
        `[image] ${model}: prompt bloqueado por ${json.promptFeedback.blockReason}`
      );
      return {
        success: false,
        error: `Prompt bloqueado: ${json.promptFeedback.blockReason}`,
        modelMissing: false,
      };
    }

    const parts = json.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      const inline = p.inline_data ?? p.inlineData;
      if (!inline) continue;
      const mime =
        ("mime_type" in inline && inline.mime_type) ||
        ("mimeType" in inline && inline.mimeType) ||
        "image/png";
      const buffer = Buffer.from(inline.data, "base64");
      console.info(`[image] ${model}: OK (${buffer.length} bytes, ${mime})`);
      return {
        success: true,
        image: { buffer, contentType: String(mime) },
      };
    }

    return {
      success: false,
      error: `${model}: respuesta sin imagen`,
      modelMissing: false,
    };
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    console.warn(`[image] ${model}: error de red — ${msg}`);
    return { success: false, error: msg, modelMissing: false };
  }
}

function enrichPrompt(p: string): string {
  return `${p.trim()}. 16:9 aspect ratio, photographic, cinematic lighting, editorial composition, no text, no logos, no watermark.`;
}
