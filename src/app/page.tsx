import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

export default async function Landing() {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-neutral-100">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="inline-block w-6 h-6 rounded bg-neutral-900" />
          SlidesPro
        </div>
        <nav className="flex items-center gap-2">
          {session?.user ? (
            <Button asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Iniciar sesión</Link>
              </Button>
              <Button asChild>
                <Link href="/login">Empezar gratis</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-6">
          AI presentations · Editable · Beautiful
        </p>
        <h1 className="max-w-3xl text-5xl md:text-7xl font-semibold leading-[1.05] tracking-tight">
          Presentaciones que no parecen hechas con IA.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-neutral-600">
          Pega un transcript, una URL de YouTube, un PDF o un brief.
          Recibe un deck con narrativa, diseño y datos — 100% editable en
          PowerPoint.
        </p>
        <div className="mt-10 flex gap-3">
          <Button asChild size="lg">
            <Link href={session?.user ? "/dashboard" : "/login"}>
              {session?.user ? "Ir al dashboard" : "Crear mi primera presentación"}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="https://github.com/wilking2k7/SlidesPro" target="_blank" rel="noreferrer">
              Ver en GitHub
            </a>
          </Button>
        </div>
      </main>

      <footer className="px-8 py-6 text-xs text-neutral-500 border-t border-neutral-100">
        © {new Date().getFullYear()} SlidesPro · Built on Next.js · Hosted on Railway
      </footer>
    </div>
  );
}
