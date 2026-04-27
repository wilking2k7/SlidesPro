/**
 * Extracción de texto de archivos Word (.docx). Server-only.
 * mammoth maneja el formato Office Open XML (.docx, NO .doc).
 */

export async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  const text = (result.value ?? "").trim();
  if (!text) throw new Error("No se pudo extraer texto del documento Word.");
  return text;
}
