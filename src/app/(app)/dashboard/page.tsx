import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";

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
      status: true,
      updatedAt: true,
      coverUrl: true,
    },
  });

  return (
    <main className="flex-1 px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mis presentaciones</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {presentations.length === 0
              ? "Aún no has creado ninguna. Empieza por la primera."
              : `${presentations.length} presentaciones guardadas.`}
          </p>
        </div>
        <Button disabled title="Disponible cuando termine la Fase 1">
          + Nueva presentación
        </Button>
      </div>

      {presentations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 px-8 py-16 text-center text-sm text-neutral-500">
          El generador estará habilitado al completar la Fase 1 del roadmap
          (portar el motor de IA al backend).
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {presentations.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-neutral-200 hover:border-neutral-400 transition-colors p-4"
            >
              <div className="aspect-video bg-neutral-100 rounded mb-3" />
              <div className="text-sm font-medium truncate">{p.title}</div>
              <div className="text-xs text-neutral-500 mt-1">
                {p.status} · {p.updatedAt.toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
