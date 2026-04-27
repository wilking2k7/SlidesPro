import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateYouTube } from "@/lib/ingest/validate";

export const runtime = "nodejs";

/**
 * POST /api/validate/youtube
 * Body: { url: string }
 * Devuelve metadata si el video existe y es público (oEmbed sin API key).
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
  const result = await validateYouTube(body.url);
  return NextResponse.json(result);
}
