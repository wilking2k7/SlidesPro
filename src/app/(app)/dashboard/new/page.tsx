import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { NewPresentationForm } from "./form";

export default async function NewPresentationPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const themes = await prisma.theme.findMany({
    where: { isPreset: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, tokens: true },
  });

  return (
    <main className="flex-1 px-8 py-10 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Nueva presentación</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Pega un transcript, una URL o un brief. La IA genera el deck en ~1 minuto.
        </p>
      </div>
      <NewPresentationForm
        themes={themes.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          accent:
            (t.tokens as { palette?: { accent?: string } })?.palette?.accent ?? "#000000",
          background:
            (t.tokens as { palette?: { background?: string } })?.palette?.background ??
            "#ffffff",
        }))}
      />
    </main>
  );
}
