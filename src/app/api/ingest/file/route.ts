import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractPdfText } from "@/lib/ingest/pdf";
import { extractDocxText } from "@/lib/ingest/docx";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB

/**
 * POST /api/ingest/file — extrae texto de PDF / DOCX subido por el usuario.
 *
 * Recibe multipart/form-data con campo "file". Devuelve { text, chars, kind }
 * que el form de Nueva Presentación envía como `source` al endpoint de generate.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "form data inválida" }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "archivo faltante" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `Archivo demasiado grande (max ${MAX_FILE_BYTES / 1024 / 1024}MB)` },
      { status: 413 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  try {
    let text = "";
    let kind: "pdf" | "docx";

    if (name.endsWith(".pdf") || type === "application/pdf") {
      text = await extractPdfText(buf);
      kind = "pdf";
    } else if (
      name.endsWith(".docx") ||
      type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      text = await extractDocxText(buf);
      kind = "docx";
    } else if (name.endsWith(".doc") || type === "application/msword") {
      return NextResponse.json(
        {
          error:
            "Formato .doc antiguo no soportado. Conviértelo a .docx o copia el texto.",
        },
        { status: 415 }
      );
    } else {
      return NextResponse.json(
        { error: `Formato no soportado: ${file.name}` },
        { status: 415 }
      );
    }

    return NextResponse.json({
      text,
      chars: text.length,
      kind,
      filename: file.name,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Error al extraer texto" },
      { status: 500 }
    );
  }
}
