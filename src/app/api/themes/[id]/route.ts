import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPersonalWorkspaceId } from "@/lib/secrets";

export const runtime = "nodejs";

/**
 * DELETE /api/themes/[id] — solo si el theme pertenece al workspace del
 * usuario y NO es preset. Borra en cascada (cuidado: si hay presentaciones
 * que referencian este theme, themeId se vuelve null).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const workspaceId = await getPersonalWorkspaceId(session.user.id);

  const theme = await prisma.theme.findUnique({ where: { id } });
  if (!theme) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (theme.isPreset) {
    return NextResponse.json({ error: "No puedes eliminar themes preset" }, { status: 403 });
  }
  if (theme.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.theme.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
