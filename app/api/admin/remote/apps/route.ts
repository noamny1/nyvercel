import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const screenId = Number(new URL(request.url).searchParams.get("screenId"));
  if (!screenId) return NextResponse.json({ apps: [], note: "" });
  const desk = await prisma.remoteDesk.findUnique({ where: { screenId }, select: { apps: true, note: true } });
  let apps: { name: string; package: string }[] = [];
  try {
    const parsed = JSON.parse(desk?.apps || "[]");
    if (Array.isArray(parsed)) apps = parsed;
  } catch {
    apps = [];
  }
  return NextResponse.json({ apps, note: desk?.note || "" }, { headers: { "Cache-Control": "no-store" } });
}
