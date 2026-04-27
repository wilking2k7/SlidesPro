import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const job = await prisma.generationJob.findUnique({
    where: { id },
    select: {
      id: true,
      kind: true,
      status: true,
      progress: true,
      error: true,
      startedAt: true,
      finishedAt: true,
      presentationId: true,
      presentation: { select: { ownerId: true } },
    },
  });
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (job.presentation && job.presentation.ownerId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: job.id,
    kind: job.kind,
    status: job.status,
    progress: job.progress,
    error: job.error,
    presentationId: job.presentationId,
  });
}
