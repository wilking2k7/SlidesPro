import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateUrl } from "@/lib/ingest/validate";

export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * POST /api/validate/url
 * Body: { url: string }
 * Devuelve metadata (title, og:image, domain) sin descargar todo el HTML.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { url?: string } | null;
  if (!body?.url) {
    return NextResponse.json({ ok: false, error: "URL faltante" }, { status: 400 });
  }
  const result = await validateUrl(body.url);
  return NextResponse.json(result);
}
