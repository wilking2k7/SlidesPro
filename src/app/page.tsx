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
      <main className="flex flex-1 flex-col items-center px-6 pt-12 pb-16 max-w-6xl mx-auto w-full">
        <span className="brand-chip mb-6">Editorial · IA · Pro</span>
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
              Ver demo
            </a>
          </Button>
        </div>

        {/* Slide preview mockup en el hero */}
        <div className="mt-20 w-full max-w-4xl">
          <SlidePreview />
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

/**
 * Mock visual de un slide editorial — estilo "preview" del producto en el hero.
 * Toma la estética de los layouts de los themes preset (Editorial / Apple).
 */
function SlidePreview() {
  return (
    <div className="card-editorial overflow-hidden aspect-[16/9] relative bg-white">
      <div className="absolute inset-0 grid grid-cols-2">
        {/* Texto izquierda */}
        <div className="p-10 sm:p-16 flex flex-col justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600 mb-3 sm:mb-5">
            Narrativa Editorial
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl tracking-tight leading-[1.05]">
            La nueva era del{" "}
            <span className="editorial-italic">diseño generativo</span>
          </h2>
          <p className="mt-3 sm:mt-5 text-xs sm:text-sm text-slate-500 italic border-l-2 border-slate-200 pl-3 sm:pl-4 hidden sm:block">
            &ldquo;La inteligencia no reemplaza la visión, sino que expande el lienzo
            de lo posible para el creador moderno.&rdquo;
          </p>
        </div>

        {/* Imagen derecha (gradient + decoración SVG) */}
        <div className="relative bg-gradient-to-br from-blue-100 via-blue-200 to-indigo-300 overflow-hidden">
          <svg
            className="absolute inset-0 w-full h-full opacity-50 mix-blend-overlay"
            viewBox="0 0 400 300"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="silk" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#dbeafe" />
              </linearGradient>
            </defs>
            <path
              d="M0,200 Q100,50 200,150 T400,100 L400,300 L0,300 Z"
              fill="url(#silk)"
            />
            <path
              d="M0,250 Q150,100 300,200 T400,180 L400,300 L0,300 Z"
              fill="white"
              opacity="0.3"
            />
          </svg>
          {/* Slide number en serif italic */}
          <div className="absolute bottom-3 right-4 sm:bottom-4 sm:right-6 font-serif italic text-white/70 text-2xl sm:text-3xl">
            01
          </div>
        </div>
      </div>

      {/* Footer con "framework" */}
      <div className="absolute bottom-0 left-0 right-1/2 px-10 sm:px-16 pb-3 sm:pb-5">
        <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
          SlidesPro · Editorial Framework
        </span>
      </div>

      {/* Etiqueta "preview" arriba derecha */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 brand-chip text-white bg-blue-600 hover:bg-blue-600 cursor-default pointer-events-none">
        Preview
      </div>
    </div>
  );
}
