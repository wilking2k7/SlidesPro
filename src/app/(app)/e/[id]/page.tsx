import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import type { ThemeTokens } from "@/lib/schema/theme";
import type { Slide } from "@/lib/schema/slide";
import { EditorShell } from "./shell";

export default async function EditorPage({
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
    },
  });
  if (!pres) notFound();
  if (pres.ownerId !== session.user.id) redirect("/dashboard");

  return (
    <EditorShell
      presentationId={pres.id}
      title={pres.title}
      tokens={(pres.theme?.tokens as unknown as ThemeTokens) ?? null}
      initialSlides={pres.slides.map((s) => ({
        id: s.id,
        position: s.position,
        data: s.data as unknown as Slide,
        notes: s.notes ?? "",
        backendId: s.id,
      }))}
    />
  );
}
