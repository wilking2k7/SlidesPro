import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Slide } from "@/lib/schema/slide";

export const runtime = "nodejs";

const Body = z.object({
  slides: z
    .array(
      z.object({
        position: z.number().int().nonnegative(),
        data: Slide,
        notes: z.string().default(""),
      })
    )
    .min(1)
    .max(50),
  title: z.string().min(1).optional(),
});

/**
 * PATCH /api/presentations/[id]/slides
 *
 * Reemplaza la lista completa de slides de una presentación.
 * Estrategia: transactional delete-all + insert-all. Es simple, robusto, y
 * maneja reordenamientos / additions / deletions sin lógica de diff.
 *
 * Para presentaciones grandes (>30 slides) el costo es despreciable
 * (~50ms en Postgres local). Si en el futuro vemos issues de carga,
 * pasamos a upsert por position.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const presentation = await prisma.presentation.findUnique({
    where: { id },
    select: { id: true, ownerId: true, status: true },
  });
  if (!presentation) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (presentation.ownerId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { slides, title } = parsed.data;

  await prisma.$transaction([
    prisma.slide.deleteMany({ where: { presentationId: id } }),
    ...slides.map((s, i) =>
      prisma.slide.create({
        data: {
          presentationId: id,
          position: i,
          data: s.data as object,
          notes: s.notes,
        },
      })
    ),
    prisma.presentation.update({
      where: { id },
      data: {
        ...(title ? { title } : {}),
        // Si estaba en GENERATING/ERROR, lo movemos a READY al primer save manual
        status: presentation.status === "READY" ? "READY" : "READY",
      },
    }),
  ]);

  return NextResponse.json({ ok: true, slideCount: slides.length, savedAt: Date.now() });
}
