import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { Sparkles, Layers, Wand2, Download } from "lucide-react";

export default async function Landing() {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <LogoMark />
          <span className="font-serif text-xl tracking-tight">SlidesPro</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="brand-chip hidden sm:inline-block">By SoyPacoIA</span>
          {session?.user ? (
            <Button asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Iniciar sesión</Link>
              </Button>
              <Button asChild>
                <Link href="/login">Empezar gratis</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 max-w-5xl mx-auto w-full">
        <h1 className="editorial-display text-center text-5xl sm:text-7xl md:text-[88px] leading-[0.95]">
          Convierte cualquier{" "}
          <span className="editorial-italic">video</span>
          <br />
          en una <span className="editorial-italic">presentación</span>
        </h1>
        <p className="mt-8 max-w-2xl text-center text-lg text-slate-600 leading-relaxed">
          Pega un transcript, una URL de YouTube, un PDF o un brief — y recibe un deck
          con narrativa, diseño, imágenes y datos. <span className="font-medium text-slate-900">100% editable en PowerPoint.</span>
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Button asChild size="xl">
            <Link href={session?.user ? "/dashboard" : "/login"}>
              <Sparkles className="w-4 h-4" />
              {session?.user ? "Ir al dashboard" : "Crear mi primera presentación"}
            </Link>
          </Button>
          <Button asChild size="xl" variant="outline">
            <a href="https://github.com/wilking2k7/SlidesPro" target="_blank" rel="noreferrer">
              Ver en GitHub
            </a>
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-24 w-full">
          <FeatureCard
            icon={<Wand2 className="w-5 h-5" />}
            title="4 agentes IA en pipeline"
            body="Analista narrativo, diseñador visual, generador de imágenes y entrenador de presentación trabajan juntos."
          />
          <FeatureCard
            icon={<Layers className="w-5 h-5" />}
            title="Editor visual completo"
            body="Drag, resize, edición de texto inline, undo/redo de 100 niveles, auto-save. Sin tocar código."
          />
          <FeatureCard
            icon={<Download className="w-5 h-5" />}
            title="PPTX 100% editable"
            body="No screenshots. Texto, formas, charts y tablas nativos que editas en PowerPoint como tú."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-8 text-xs text-slate-500 max-w-7xl mx-auto w-full flex items-center justify-between">
        <div>© {new Date().getFullYear()} SlidesPro · Hosted on Railway · Built on Next.js</div>
        <div className="flex gap-4">
          <a href="https://github.com/wilking2k7/SlidesPro" className="hover:text-slate-900">GitHub</a>
        </div>
      </footer>
    </div>
  );
}

function LogoMark() {
  return (
    <div className="w-10 h-10 rounded-xl bg-blue-600 grid place-items-center shadow-sm shadow-blue-600/30">
      <div className="grid grid-cols-2 gap-[3px]">
        <div className="w-2 h-2 bg-white rounded-[1px]" />
        <div className="w-2 h-2 bg-white rounded-[1px]" />
        <div className="w-2 h-2 bg-white rounded-[1px]" />
        <div className="w-2 h-2 bg-white rounded-[1px]" />
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="card-editorial p-6">
      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 grid place-items-center mb-4">
        {icon}
      </div>
      <div className="font-serif text-xl tracking-tight mb-2">{title}</div>
      <div className="text-sm text-slate-600 leading-relaxed">{body}</div>
    </div>
  );
}
