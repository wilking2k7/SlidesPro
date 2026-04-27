import { prisma } from "@/lib/db";
import { ThemeTokens } from "@/lib/schema/theme";
import { runAnalyst } from "@/lib/ai/agents/analyst";
import { runDesigner } from "@/lib/ai/agents/designer";
import { runNotes } from "@/lib/ai/agents/notes";
import { generateImage } from "@/lib/ai/image";
import { buildSlide } from "@/lib/ai/layout-builders";
import { uploadBuffer, makeAssetKey } from "@/lib/storage/r2";
import { resolveSecret } from "@/lib/secrets";
import { getTemplate } from "@/lib/templates";
import type { Slide } from "@/lib/schema/slide";
import type { SlideContent } from "@/lib/ai/schemas";
import { z } from "zod";

/**
 * Job de generación end-to-end.
 *
 * Flujo:
 *   1. Marcar GenerationJob como RUNNING
 *   2. Analyst: extrae estructura narrativa
 *   3. Designer: elige layouts + escribe contenido
 *   4. Layout-builders: producen Slide Schema posicionado
 *   5. Imágenes (paralelas): Gemini → R2 → URL
 *      Re-aplica imágenes a los slides correspondientes
 *   6. Speaker notes (paralelo con imágenes)
 *   7. Persistir Slides en BD, marcar Presentation READY
 *   8. Marcar Job COMPLETED
 *
 * Errores: cualquier excepción marca el job FAILED y guarda mensaje.
 *
 * Esta función corre como "fire and forget" desde la API route — Next.js
 * Server Runtime mantiene la promesa viva mientras el contenedor esté arriba.
 * Para escalar a multi-instancia movemos a BullMQ + worker en Fase 5.
 */

export const GenerateJobPayload = z.object({
  presentationId: z.string(),
  source: z.string().min(20),
  language: z.enum(["es", "en", "pt"]).default("es"),
  slideCount: z.number().int().min(4).max(20).default(8),
  depth: z.enum(["executive", "detailed", "step-by-step"]).default("detailed"),
  themeId: z.string(),
  templateId: z.string().default("auto"),
  generateImages: z.boolean().default(true),
});

export type GenerateJobPayload = z.infer<typeof GenerateJobPayload>;

export async function processGenerationJob(jobId: string): Promise<void> {
  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job ${jobId} not found`);

  const payload = GenerateJobPayload.parse(job.payload);

  try {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "RUNNING", startedAt: new Date(), progress: 5 },
    });

    // Resolve theme tokens
    const theme = await prisma.theme.findUnique({ where: { id: payload.themeId } });
    if (!theme) throw new Error("Theme not found");
    const tokens = theme.tokens as unknown as ThemeTokens;
    const themeMood = tokens.mood;

    // Resolve API key del workspace (BD cifrado) o fallback a env
    const workspaceId = await getWorkspaceId(payload.presentationId);
    const googleAiKey = await resolveSecret(workspaceId, "GOOGLE_AI");
    if (!googleAiKey) {
      throw new Error(
        "API key de Gemini no configurada. Añádela en /dashboard/settings (https://aistudio.google.com/app/apikey)"
      );
    }

    // 1) Analyst
    await updateProgress(jobId, 15, "analyzing");
    const analyst = await runAnalyst({
      source: payload.source,
      language: payload.language,
      slideCount: payload.slideCount,
      depth: payload.depth,
      apiKey: googleAiKey,
    });

    // 2) Designer (con template hint si el usuario eligió uno)
    await updateProgress(jobId, 35, "designing");
    const template = getTemplate(payload.templateId);
    const designer = await runDesigner({
      analyst,
      slideCount: payload.slideCount,
      themeMood,
      language: payload.language,
      templateHint: template.designerHint || undefined,
      apiKey: googleAiKey,
    });

    // 3) Build Slides without images first (placeholders)
    const slides: Slide[] = designer.slides.map((content) =>
      buildSlide({ content, theme: tokens })
    );

    // Persist initial state so the user sees something while images render
    await persistSlides(payload.presentationId, slides);
    await updateProgress(jobId, 50, "rendering");

    // 4) Images + speaker notes en paralelo
    const imagesPromise = payload.generateImages
      ? generateAndAttachImages({
          jobId,
          presentationId: payload.presentationId,
          workspaceId,
          designerSlides: designer.slides,
          imagePrompts: analyst.imagePrompts,
          theme: tokens,
          apiKey: googleAiKey,
        })
      : Promise.resolve(slides);

    const notesPromise = runNotes({
      analyst,
      designer,
      language: payload.language,
      apiKey: googleAiKey,
    });

    const [slidesWithImages, notes] = await Promise.all([imagesPromise, notesPromise]);

    // 5) Apply notes
    const finalSlides: Slide[] = slidesWithImages.map((s, i) => ({
      ...s,
      notes: notes.notes[i] ?? "",
    }));

    await persistSlides(payload.presentationId, finalSlides);

    await prisma.presentation.update({
      where: { id: payload.presentationId },
      data: {
        title: analyst.title,
        description: analyst.thesis,
        status: "READY",
      },
    });

    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        progress: 100,
        finishedAt: new Date(),
        result: { slideCount: finalSlides.length },
      },
    });
  } catch (err) {
    // Logging completo en server, mensaje friendly al usuario
    const fullMessage = err instanceof Error ? err.message : String(err);
    console.error("[generation] failed:", {
      jobId,
      presentationId: payload.presentationId,
      error: fullMessage,
      stack: err instanceof Error ? err.stack : undefined,
    });

    // Mensaje amigable según patrón del error
    let userMessage = fullMessage;
    if (/invalid argument|INVALID_ARGUMENT/i.test(fullMessage)) {
      userMessage =
        "Gemini rechazó el request. Si usaste YouTube: prueba con un video público más corto, o pega el transcript directamente. Si usaste texto: el contenido puede tener caracteres no soportados.";
    } else if (/api key|unauthorized|permission denied/i.test(fullMessage)) {
      userMessage =
        "API key inválida o sin permisos. Verifica /dashboard/settings y que tu key tenga acceso a Gemini.";
    } else if (/quota|rate limit|429/i.test(fullMessage)) {
      userMessage =
        "Cuota de Gemini agotada o demasiados requests. Intenta de nuevo en unos minutos.";
    } else if (/timeout|aborted/i.test(fullMessage)) {
      userMessage =
        "Tiempo de espera agotado. El video o documento puede ser demasiado largo.";
    }

    await prisma.presentation
      .update({ where: { id: payload.presentationId }, data: { status: "ERROR" } })
      .catch(() => {});
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error: userMessage,
        finishedAt: new Date(),
      },
    });
  }
}

async function updateProgress(jobId: string, progress: number, _label: string) {
  await prisma.generationJob.update({ where: { id: jobId }, data: { progress } });
}

async function getWorkspaceId(presentationId: string): Promise<string> {
  const p = await prisma.presentation.findUnique({
    where: { id: presentationId },
    select: { workspaceId: true },
  });
  if (!p) throw new Error("presentation not found");
  return p.workspaceId;
}

async function persistSlides(presentationId: string, slides: Slide[]) {
  await prisma.$transaction([
    prisma.slide.deleteMany({ where: { presentationId } }),
    ...slides.map((s, i) =>
      prisma.slide.create({
        data: {
          presentationId,
          position: i,
          data: s as object,
          notes: s.notes ?? "",
        },
      })
    ),
  ]);
}

async function generateAndAttachImages(opts: {
  jobId: string;
  presentationId: string;
  workspaceId: string;
  designerSlides: SlideContent[];
  imagePrompts: string[];
  theme: ThemeTokens;
  apiKey: string;
}): Promise<Slide[]> {
  // Para cada slide del designer que use imagen, encolar generación.
  const tasks: Array<{ slideIdx: number; prompt: string }> = [];
  opts.designerSlides.forEach((s, idx) => {
    const i = "imagePromptIndex" in s ? s.imagePromptIndex : undefined;
    if (typeof i === "number" && opts.imagePrompts[i]) {
      tasks.push({ slideIdx: idx, prompt: opts.imagePrompts[i] });
    }
  });

  if (tasks.length === 0) {
    return opts.designerSlides.map((content) => buildSlide({ content, theme: opts.theme }));
  }

  // Limitar concurrencia (3 a la vez)
  const imageMap = new Map<number, string>();
  const conc = 3;
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (true) {
      const myIdx = cursor++;
      if (myIdx >= tasks.length) return;
      const t = tasks[myIdx];
      try {
        const result = await generateImage(t.prompt, opts.apiKey);
        if (result) {
          const key = makeAssetKey({
            workspaceId: opts.workspaceId,
            presentationId: opts.presentationId,
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
              presentationId: opts.presentationId,
              workspaceId: opts.workspaceId,
              kind: "AI_IMAGE",
              url: upload.url,
              key: upload.key,
              contentType: upload.contentType,
              size: upload.size,
              prompt: t.prompt,
            },
          });
          imageMap.set(t.slideIdx, upload.url);
        }
      } catch (e) {
        console.warn("[images] failed for slide", t.slideIdx, e);
      } finally {
        done++;
        const progress = 50 + Math.floor((done / tasks.length) * 40);
        await updateProgress(opts.jobId, Math.min(progress, 90), "images").catch(() => {});
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(conc, tasks.length) }, () => worker()));

  // Rebuild slides with image URLs
  return opts.designerSlides.map((content, idx) =>
    buildSlide({
      content,
      theme: opts.theme,
      imageUrl: imageMap.get(idx),
    })
  );
}
