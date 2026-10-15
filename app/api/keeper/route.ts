import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function screenId(request: Request) {
  const key = Number(new URL(request.url).searchParams.get("code"));
  if (!key) return 0;
  const screen = await prisma.screen.findUnique({ where: { code: key }, select: { id: true, active: true } })
    ?? (key < 100000 ? await prisma.screen.findUnique({ where: { id: key }, select: { id: true, active: true } }) : null);
  return screen?.active ? screen.id : 0;
}

function apk(url: string) {
  return url.startsWith("https://") && url.includes(".blob.vercel-storage.com/") && url.includes(".apk");
}

export async function GET(request: Request) {
  const id = await screenId(request);
  if (!id) return NextResponse.json({ upgrade: "", restore: "" });
  const now = new Date();
  try {
    await prisma.remoteDesk.upsert({
      where: { screenId: id },
      update: { keeperAt: now },
      create: { screenId: id, keeperAt: now },
    });
  } catch {
    return NextResponse.json({ upgrade: "", restore: "" });
  }
  const desk = await prisma.remoteDesk.findUnique({
    where: { screenId: id },
    select: { upgradeUrl: true, lastApk: true, wakeUntil: true, watchedAt: true },
  });
  const wake = (!!desk?.wakeUntil && desk.wakeUntil.getTime() > Date.now())
    || (!!desk?.watchedAt && Date.now() - desk.watchedAt.getTime() < 20000);
  return NextResponse.json({
    upgrade: desk?.upgradeUrl || "",
    restore: desk?.lastApk || "",
    wake,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const id = await screenId(request);
  if (!id) return NextResponse.json({ ok: false }, { status: 404 });
  const body = await request.json().catch(() => ({})) as { applied?: string };
  const applied = typeof body.applied === "string" ? body.applied : "";
  if (!apk(applied)) return NextResponse.json({ ok: false });
  await prisma.remoteDesk.update({
    where: { screenId: id },
    data: { lastApk: applied, upgradeUrl: "", keeperAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
