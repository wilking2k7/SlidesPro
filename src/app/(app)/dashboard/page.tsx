import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  FileText,
  Clock,
  Layers,
  Users,
  Image as ImageIcon,
  BarChart3,
  Settings,
  HelpCircle,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const presentations = await prisma.presentation.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      updatedAt: true,
      coverUrl: true,
      _count: { select: { slides: true } },
    },
  });

  return (
    <main className="flex-1 flex">
      {/* Sidebar lateral — secciones del workspace + acceso rápido al historial */}
      <aside className="w-64 shrink-0 border-r border-slate-200/60 bg-white/60 backdrop-blur-sm p-4 hidden lg:flex lg:flex-col">
        <Button asChild className="w-full mb-6">
          <Link href="/dashboard/new">
            <Sparkles className="w-4 h-4" />
            Nueva presentación
          </Link>
        </Button>

        <nav className="space-y-1 mb-6">
          <SidebarItem icon={<Layers className="w-4 h-4" />} label="Mis presentaciones" active count={presentations.length} />
          <SidebarItem icon={<Users className="w-4 h-4" />} label="Compartido" disabled tooltip="Colaboración — Fase 5" />
          <SidebarItem icon={<ImageIcon className="w-4 h-4" />} label="Biblioteca" disabled tooltip="Recursos compartidos — Fase 7" />
          <SidebarItem icon={<BarChart3 className="w-4 h-4" />} label="Analítica" disabled tooltip="Métricas de uso — Fase 8" />
        </nav>

        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2 px-3">
          Recientes
        </div>
        {presentations.length === 0 ? (
          <p className="text-xs text-slate-400 leading-relaxed px-3">
            Tus presentaciones generadas aparecerán aquí.
          </p>
        ) : (
          <ul className="space-y-0.5 mb-auto overflow-y-auto">
            {presentations.slice(0, 8).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/p/${p.id}`}
                  className="block px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors group"
                >
                  <div className="text-sm text-slate-700 group-hover:text-blue-700 truncate font-medium">
                    {p.title || "Sin título"}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                    {p._count.slides} · {fmtRelative(p.updatedAt)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="pt-4 mt-4 border-t border-slate-200/80 space-y-1">
          <SidebarItem icon={<HelpCircle className="w-4 h-4" />} label="Ayuda" disabled />
          <SidebarItem
            icon={<Settings className="w-4 h-4" />}
            label="Configuración"
            href="/dashboard/settings"
          />
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 px-6 sm:px-12 py-12 max-w-6xl mx-auto w-full">
        <div className="mb-10">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600 mb-3">
            Resumen del workspace
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl tracking-tight leading-[1.05]">
            Proyectos <span className="editorial-italic">editoriales</span>
          </h1>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed max-w-2xl">
            Crea, refina y publica tus presentaciones de alto impacto. Tu retícula
            editorial activa, sincronizada en todos tus dispositivos.
          </p>
        </div>

        {/* CTA primaria solo en mobile (en desktop está en el sidebar) */}
        <div className="mb-8 lg:hidden">
          <Button asChild size="xl" className="w-full sm:w-auto">
            <Link href="/dashboard/new">
              <Sparkles className="w-4 h-4" />
              Nueva presentación
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-2xl tracking-tight">Tus presentaciones</h2>
          <span className="text-xs text-slate-500 tabular-nums">
            {presentations.length} guardadas
          </span>
        </div>

        {presentations.length === 0 ? (
          <Link
            href="/dashboard/new"
            className="block card-editorial p-12 text-center hover:border-blue-200 hover:shadow-lg transition-all group"
          >
            <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 grid place-items-center mb-4 group-hover:bg-blue-100 transition-colors">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <div className="font-serif text-2xl mb-2">Aún no tienes presentaciones</div>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Crea la primera en menos de un minuto. Solo necesitas un transcript o una URL.
            </p>
          </Link>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {presentations.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/p/${p.id}`}
                  className="card-editorial p-0 overflow-hidden hover:-translate-y-0.5 transition-all block group"
                >
                  <div
                    className="aspect-video bg-gradient-to-br from-slate-100 to-blue-50 relative"
                    style={
                      p.coverUrl
                        ? { backgroundImage: `url(${p.coverUrl})`, backgroundSize: "cover" }
                        : undefined
                    }
                  >
                    {!p.coverUrl && (
                      <div className="absolute inset-0 grid place-items-center">
                        <FileText className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                    {p.status === "GENERATING" && (
                      <div className="absolute inset-0 bg-blue-600/85 backdrop-blur-sm grid place-items-center">
                        <span className="text-white text-xs font-medium tracking-wide">
                          Generando…
                        </span>
                      </div>
                    )}
                    {p.status === "ERROR" && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-medium uppercase tracking-wider">
                        Error
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="font-medium text-slate-900 truncate group-hover:text-blue-700">
                      {p.title || "Sin título"}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {fmtRelative(p.updatedAt)}
                      {p._count.slides > 0 && <span>· {p._count.slides} slides</span>}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function SidebarItem({
  icon,
  label,
  active,
  disabled,
  tooltip,
  count,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  tooltip?: string;
  count?: number;
  href?: string;
}) {
  const className = `w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    active
      ? "bg-blue-50 text-blue-700"
      : disabled
        ? "text-slate-400 cursor-not-allowed"
        : "text-slate-700 hover:bg-slate-100"
  }`;

  const inner = (
    <>
      <span className="flex items-center gap-2.5">
        {icon}
        {label}
      </span>
      {typeof count === "number" && (
        <span className="text-[10px] font-mono text-slate-400 tabular-nums">{count}</span>
      )}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={className} title={tooltip}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" disabled={disabled} title={tooltip} className={className}>
      {inner}
    </button>
  );
}

function fmtRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `hace ${days}d`;
  return d.toLocaleDateString();
}
