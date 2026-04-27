/**
 * Extracción de texto de PDFs. Server-only (Node runtime).
 * Usado por POST /api/ingest/file cuando el usuario sube un PDF.
 */

export async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdf-parse usa pdfjs internamente; lo importamos dinámicamente para que
  // Next no intente bundlear sus assets en edge.
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(buffer);
  const text = (result.text ?? "").trim();
  if (!text) throw new Error("No se pudo extraer texto del PDF (¿está escaneado?).");
  return text;
}
