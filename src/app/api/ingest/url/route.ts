import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchArticleText } from "@/lib/ingest/url";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  url: z.string().url(),
});

/**
 * POST /api/ingest/url — fetcha un artículo y extrae el texto principal.
 * NO se usa para YouTube (que va directo al analyst como video).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  try {
    const text = await fetchArticleText(parsed.data.url);
    return NextResponse.json({ text, chars: text.length });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Error al cargar la URL" },
      { status: 500 }
    );
  }
}
