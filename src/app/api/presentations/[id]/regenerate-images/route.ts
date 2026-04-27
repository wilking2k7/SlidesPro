import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveSecret, getPersonalWorkspaceId } from "@/lib/secrets";
import { generateImage } from "@/lib/ai/image";
import { uploadBuffer, makeAssetKey } from "@/lib/storage/r2";
import type { Slide } from "@/lib/schema/slide";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/presentations/[id]/regenerate-images
 *
 * Regenera las imágenes de la presentación reusando los aiPrompt que ya están
 * guardados en cada elemento `image` con `aiPrompt`. Reemplaza el `src` de
 * esos elementos in-place y persiste.
 *
 * Útil cuando el batch original falló (por ej. modelo de imagen no
 * disponible al momento) y el usuario quiere reintentar sin regenerar todo
 * el deck.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const pres = await prisma.presentation.findUnique({
    where: { id },
    include: { slides: { orderBy: { position: "asc" } } },
  });
  if (!pres) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (pres.ownerId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const workspaceId = await getPersonalWorkspaceId(session.user.id);
  const apiKey = await resolveSecret(workspaceId, "GOOGLE_AI");
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key de Gemini no configurada en /dashboard/settings" },
      { status: 412 }
    );
  }

  // Encontrar todos los image elements con aiPrompt
  type Task = { slideIdx: number; elementId: string; prompt: string };
  const tasks: Task[] = [];
  pres.slides.forEach((s, slideIdx) => {
    const data = s.data as unknown as Slide;
    for (const el of data.elements) {
      if (el.type === "image" && el.aiPrompt) {
        tasks.push({ slideIdx, elementId: el.id, prompt: el.aiPrompt });
      }
    }
  });

  if (tasks.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No hay imágenes IA en esta presentación",
      success: 0,
      failed: 0,
    });
  }

  // Generar concurrentemente (max 3)
  const results = new Map<string, string>();
  let cursor = 0;
  let success = 0;
  let failed = 0;
  const conc = Math.min(3, tasks.length);

  async function worker() {
    while (true) {
      const myIdx = cursor++;
      if (myIdx >= tasks.length) return;
      const t = tasks[myIdx];
      try {
        const result = await generateImage(t.prompt, apiKey ?? undefined);
        if (!result) {
          failed++;
          continue;
        }
        const key = makeAssetKey({
          workspaceId,
          presentationId: id,
          kind: "ai-image",
          ext: result.contentType.includes("jpeg") ? "jpg" : "png",
        });
        const upload = await uploadBuffer({
          buffer: result.buffer,
          key,
          contentType: result.contentType,
        });
        await prisma.asset.create({
          data: {
            presentationId: id,
            workspaceId,
            kind: "AI_IMAGE",
            url: upload.url,
            key: upload.key,
            contentType: upload.contentType,
            size: upload.size,
            prompt: t.prompt,
          },
        });
        results.set(t.elementId, upload.url);
        success++;
      } catch (err) {
        console.warn("[regenerate-images] error:", err);
        failed++;
      }
    }
  }

  await Promise.all(Array.from({ length: conc }, () => worker()));

  // Aplicar URLs a los slides y persistir
  for (const slide of pres.slides) {
    const data = slide.data as unknown as Slide;
    let mutated = false;
    for (const el of data.elements) {
      if (el.type === "image" && results.has(el.id)) {
        el.src = results.get(el.id)!;
        mutated = true;
      }
    }
    if (mutated) {
      await prisma.slide.update({
        where: { id: slide.id },
        data: { data: data as object },
      });
    }
  }

  return NextResponse.json({ ok: true, success, failed, total: tasks.length });
}
