import { assertGoogleApiKey } from "./providers";

/**
 * Generación de imágenes con Gemini 2.0 Flash (image generation experimental).
 *
 * Fallback: si el modelo de imágenes no está disponible o falla, retorna null
 * y el render usa el placeholder SVG del slide builder.
 *
 * El endpoint REST devuelve una imagen inline base64 en `inline_data.data`.
 */

const IMAGE_MODEL = "gemini-2.0-flash-exp-image-generation";

export type GeneratedImage = {
  buffer: Buffer;
  contentType: string; // "image/png" | "image/jpeg"
};

export async function generateImage(prompt: string): Promise<GeneratedImage | null> {
  assertGoogleApiKey();
  const apiKey = process.env.GOOGLE_AI_API_KEY!;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: enrichPrompt(prompt) }],
      },
    ],
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
      console.warn("[image] Gemini returned", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inline_data?: { mime_type: string; data: string };
            inlineData?: { mimeType: string; data: string };
          }>;
        };
      }>;
    };

    const parts = json.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      const inline = p.inline_data ?? p.inlineData;
      if (!inline) continue;
      const mime =
        ("mime_type" in inline && inline.mime_type) ||
        ("mimeType" in inline && inline.mimeType) ||
        "image/png";
      const buffer = Buffer.from(inline.data, "base64");
      return { buffer, contentType: String(mime) };
    }
    return null;
  } catch (err) {
    console.warn("[image] generation failed:", err);
    return null;
  }
}

function enrichPrompt(p: string): string {
  // Asegura ratio 16:9 y consistencia editorial
  return `${p.trim()}. 16:9 aspect ratio, photographic, cinematic lighting, editorial composition, no text, no logos, no watermark.`;
}
