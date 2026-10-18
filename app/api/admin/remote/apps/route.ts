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
  let screenOn = false;
  let remoteOn = false;
  try {
    const beat = await prisma.heartbeat.findUnique({ where: { screenId } });
    screenOn = !!beat && Date.now() - beat.at.getTime() < 18 * 60 * 1000;
  } catch {
    screenOn = false;
  }
  let keeperOn = false;
  let keeper2On = false;
  let waking = false;
  let wakeReady = false;
  try {
    const link = await prisma.remoteDesk.findUnique({ where: { screenId }, select: { seenAt: true, frameAt: true, keeperAt: true, keeper2At: true, wakeUntil: true } });
    const now = Date.now();
    remoteOn = (!!link?.seenAt && now - link.seenAt.getTime() < 30000)
      || (!!link?.frameAt && now - link.frameAt.getTime() < 20000);
    keeperOn = !!link?.keeperAt && now - link.keeperAt.getTime() < 75000;
    keeper2On = !!link?.keeper2At && now - link.keeper2At.getTime() < 75000;
    const until = link?.wakeUntil?.getTime() || 0;
    const seen = link?.keeper2At?.getTime() || 0;
    waking = until > now;
    wakeReady = waking && seen >= until - 5 * 60 * 1000;
  } catch {
    remoteOn = false;
  }
  return NextResponse.json({
    apps,
    note: desk?.note || "",
    shell: desk?.shellOut || "",
    shellOpen: !!desk?.shellUntil && desk.shellUntil.getTime() > Date.now(),
    log: desk?.logOut || "",
    screenOn,
    remoteOn,
    keeperOn,
    keeper2On,
    waking,
    wakeReady,
  }, { headers: { "Cache-Control": "no-store" } });
}
