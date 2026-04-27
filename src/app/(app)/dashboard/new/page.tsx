import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { NewPresentationForm } from "./form";
import { TEMPLATES } from "@/lib/templates";

export default async function NewPresentationPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const themes = await prisma.theme.findMany({
    where: { isPreset: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, tokens: true },
  });

  return (
    <main className="flex-1 px-6 py-12 max-w-3xl mx-auto w-full">
      <div className="mb-10">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600 mb-3">
          Nueva presentación
        </div>
        <h1 className="font-serif text-5xl sm:text-6xl tracking-tight leading-[1.05]">
          Convierte cualquier <span className="editorial-italic">video</span>
          <br />
          en una <span className="editorial-italic">presentación</span>
        </h1>
        <p className="mt-5 text-base text-slate-600 leading-relaxed max-w-xl">
          Pega un transcript, una URL de YouTube o un brief —
          slides únicos generados con IA en segundos.
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
          text:
            (t.tokens as { palette?: { text?: string } })?.palette?.text ?? "#0f172a",
          mood:
            (t.tokens as { mood?: string })?.mood ?? "minimal",
        }))}
        templates={TEMPLATES}
      />
    </main>
  );
}
