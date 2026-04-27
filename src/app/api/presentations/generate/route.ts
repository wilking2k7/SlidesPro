import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processGenerationJob } from "@/server/jobs/generation";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — la respuesta es inmediata, el job corre en bg

const Body = z.object({
  source: z.string().min(20, "La fuente debe tener al menos 20 caracteres"),
  language: z.enum(["es", "en", "pt"]).default("es"),
  slideCount: z.number().int().min(4).max(20).default(8),
  depth: z.enum(["executive", "detailed", "step-by-step"]).default("detailed"),
  themeId: z.string().min(1),
  generateImages: z.boolean().default(true),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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

  // Workspace personal del usuario (siempre OWNER)
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id, role: "OWNER" },
    select: { workspaceId: true },
  });
  if (!member) {
    return NextResponse.json({ error: "no workspace" }, { status: 403 });
  }

  // Verifica theme
  const theme = await prisma.theme.findUnique({ where: { id: parsed.data.themeId } });
  if (!theme) {
    return NextResponse.json({ error: "theme not found" }, { status: 404 });
  }

  // Crea Presentation + Job
  const presentation = await prisma.presentation.create({
    data: {
      workspaceId: member.workspaceId,
      ownerId: session.user.id,
      title: "Generando…",
      status: "GENERATING",
      themeId: parsed.data.themeId,
      sourceBrief: {
        source: parsed.data.source.slice(0, 500),
        language: parsed.data.language,
        slideCount: parsed.data.slideCount,
        depth: parsed.data.depth,
        generateImages: parsed.data.generateImages,
      },
    },
    select: { id: true },
  });

  const job = await prisma.generationJob.create({
    data: {
      presentationId: presentation.id,
      kind: "GENERATE_PRESENTATION",
      status: "PENDING",
      payload: {
        presentationId: presentation.id,
        source: parsed.data.source,
        language: parsed.data.language,
        slideCount: parsed.data.slideCount,
        depth: parsed.data.depth,
        themeId: parsed.data.themeId,
        generateImages: parsed.data.generateImages,
      },
    },
    select: { id: true },
  });

  // Fire and forget — el job corre en background
  processGenerationJob(job.id).catch((err) =>
    console.error("[generation] uncaught:", err)
  );

  return NextResponse.json({ presentationId: presentation.id, jobId: job.id });
}
