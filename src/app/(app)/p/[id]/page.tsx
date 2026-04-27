import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { PresentationViewer } from "./viewer";
import type { ThemeTokens } from "@/lib/schema/theme";
import type { Slide } from "@/lib/schema/slide";

export default async function PresentationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const pres = await prisma.presentation.findUnique({
    where: { id },
    include: {
      theme: true,
      slides: { orderBy: { position: "asc" } },
      jobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!pres) notFound();
  if (pres.ownerId !== session.user.id) redirect("/dashboard");

  return (
    <PresentationViewer
      id={pres.id}
      title={pres.title}
      status={pres.status}
      tokens={(pres.theme?.tokens as unknown as ThemeTokens) ?? null}
      slides={pres.slides.map((s) => ({
        id: s.id,
        position: s.position,
        data: s.data as unknown as Slide,
        notes: s.notes ?? "",
      }))}
      latestJobId={pres.jobs[0]?.id ?? null}
    />
  );
}
