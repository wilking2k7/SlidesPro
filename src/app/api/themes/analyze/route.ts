import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { analyzeStyle } from "@/lib/ai/agents/style-analyzer";
import { resolveSecret, getPersonalWorkspaceId } from "@/lib/secrets";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_IMAGES = 15;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB por imagen
const VALID_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * POST /api/themes/analyze
 *
 * Recibe multipart/form-data con:
 *   - name: string (nombre del estilo)
 *   - images: 1-15 archivos JPG/PNG/WEBP
 *
 * Ejecuta el style-analyzer (Gemini multimodal) y guarda el ThemeTokens
 * resultante como Theme custom (workspaceId set, isPreset:false).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const workspaceId = await getPersonalWorkspaceId(session.user.id);
  const apiKey = await resolveSecret(workspaceId, "GOOGLE_AI");
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "API key de Gemini no configurada. Añádela en /dashboard/settings antes de analizar estilos.",
      },
      { status: 412 }
    );
  }

  const fd = await req.formData().catch(() => null);
  if (!fd) {
    return NextResponse.json({ error: "form data inválida" }, { status: 400 });
  }

  const name = String(fd.get("name") ?? "").trim();
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "El nombre debe tener al menos 2 caracteres" }, { status: 400 });
  }
  if (name.length > 60) {
    return NextResponse.json({ error: "Nombre demasiado largo (max 60 chars)" }, { status: 400 });
  }

  const files = fd.getAll("images");
  if (files.length === 0) {
    return NextResponse.json({ error: "Subí al menos una imagen de referencia" }, { status: 400 });
  }
  if (files.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `Máximo ${MAX_IMAGES} imágenes` },
      { status: 400 }
    );
  }

  // Validar y leer buffers
  const images: { buffer: Buffer; mimeType: string }[] = [];
  for (const f of files) {
    if (!(f instanceof File)) continue;
    if (f.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `${f.name} excede 8MB` },
        { status: 413 }
      );
    }
    const type = f.type.toLowerCase();
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `${f.name}: tipo no soportado (${type}). Solo JPG/PNG/WEBP.` },
        { status: 415 }
      );
    }
    const buffer = Buffer.from(await f.arrayBuffer());
    images.push({ buffer, mimeType: type });
  }

  if (images.length === 0) {
    return NextResponse.json({ error: "Ninguna imagen válida recibida" }, { status: 400 });
  }

  // Analizar con Gemini
  let analysis;
  try {
    analysis = await analyzeStyle({ images, hintName: name, apiKey });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Error analizando las imágenes" },
      { status: 500 }
    );
  }

  // Persistir como Theme custom del workspace
  const slug = await uniqueSlug(workspaceId, name);
  const { description, designNotes, ...tokens } = analysis;

  const theme = await prisma.theme.create({
    data: {
      workspaceId,
      name,
      slug,
      isPreset: false,
      tokens: tokens as object,
      // Guardamos description y designNotes en metadata por si los queremos
      // mostrar/usar en el designer prompt en el futuro
      preview: null,
    },
    select: { id: true, slug: true, name: true, tokens: true },
  });

  return NextResponse.json({
    theme,
    description,
    designNotes,
  });
}

async function uniqueSlug(workspaceId: string, name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const stem = base || "estilo";
  // Slugs son globalmente únicos en la tabla (no por workspace) para mantener
  // stable URLs; añadimos un sufijo si choca.
  let candidate = `${stem}-${workspaceId.slice(0, 4)}`;
  let i = 0;
  while (await prisma.theme.findUnique({ where: { slug: candidate } })) {
    i++;
    candidate = `${stem}-${workspaceId.slice(0, 4)}-${i}`;
    if (i > 50) throw new Error("No se pudo generar un slug único");
  }
  return candidate;
}
