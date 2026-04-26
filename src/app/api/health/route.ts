import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "ok", time: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { status: "degraded", db: "error", error: (err as Error).message },
      { status: 503 }
    );
  }
}
