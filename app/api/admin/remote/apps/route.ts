import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const screenId = Number(new URL(request.url).searchParams.get("screenId"));
  if (!screenId) return NextResponse.json({ apps: [], note: "" });
  const desk = await prisma.remoteDesk.findUnique({
    where: { screenId },
    select: { apps: true, note: true, shellOut: true, shellUntil: true, logOut: true },
  });
  let apps: { name: string; package: string }[] = [];
  try {
    const parsed = JSON.parse(desk?.apps || "[]");
    if (Array.isArray(parsed)) apps = parsed;
  } catch {
    apps = [];
  }
  const screen = await prisma.screen.findUnique({
    where: { id: screenId },
    select: { heartbeat: { select: { at: true } }, remoteDesk: { select: { seenAt: true } } },
  });
  const now = Date.now();
  const screenOn = !!screen?.heartbeat && now - screen.heartbeat.at.getTime() < 8 * 60 * 1000;
  const remoteOn = !!screen?.remoteDesk?.seenAt && now - screen.remoteDesk.seenAt.getTime() < 30000;
  return NextResponse.json({
    apps,
    note: desk?.note || "",
    shell: desk?.shellOut || "",
    shellOpen: !!desk?.shellUntil && desk.shellUntil.getTime() > Date.now(),
    log: desk?.logOut || "",
    screenOn,
    remoteOn,
  }, { headers: { "Cache-Control": "no-store" } });
}
