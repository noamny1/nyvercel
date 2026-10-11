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

export async function GET(request: Request) {
  const id = await screenId(request);
  if (!id) return NextResponse.json({ found: false, watch: false, needFrame: false, commands: [] });
  const now = new Date();
  const who = new URL(request.url).searchParams.get("who");
  if (who !== "keeper") {
    try {
      await prisma.heartbeat.upsert({
        where: { screenId: id },
        update: { at: now },
        create: { screenId: id, at: now },
      });
    } catch {
      // The screen can still be watched if the heartbeat table is briefly unavailable.
    }
  }
  if (who === "keeper") {
    try {
      await prisma.remoteDesk.upsert({
        where: { screenId: id },
        update: { seenAt: now, keeperAt: now },
        create: { screenId: id, seenAt: now, keeperAt: now },
      });
    } catch {
      // A missing column must not stop the screenshot channel.
    }
  } else {
    try {
      await prisma.remoteDesk.upsert({
        where: { screenId: id },
        update: { seenAt: now },
        create: { screenId: id, seenAt: now },
      });
    } catch {
      // seenAt is optional. A missing column must not stop the screenshot channel.
    }
  }
  let desk: { watchedAt: Date; frameAt: Date | null; keeperAt: Date | null } | null = null;
  try {
    desk = await prisma.remoteDesk.findUnique({ where: { screenId: id }, select: { watchedAt: true, frameAt: true, keeperAt: true } });
  } catch {
    const basic = await prisma.remoteDesk.findUnique({ where: { screenId: id }, select: { watchedAt: true, frameAt: true } });
    desk = basic ? { watchedAt: basic.watchedAt, frameAt: basic.frameAt, keeperAt: null } : null;
  }
  const keeperFresh = !!desk?.keeperAt && Date.now() - desk.keeperAt.getTime() < 12000;
  const watching = !!desk && Date.now() - desk.watchedAt.getTime() < 20000;
  const watch = watching && (who === "keeper" || !keeperFresh);
  const needFrame = watch && (!desk?.frameAt || Date.now() - desk.frameAt.getTime() > 2500);
  const take = new URL(request.url).searchParams.get("take") === "1";
  const commands = take && who === "keeper" ? await takeCommands(id) : [];
  return NextResponse.json({ found: true, watch, needFrame, commands }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const id = await screenId(request);
  if (!id) return NextResponse.json({ commands: [] }, { status: 404 });
  if (new URL(request.url).searchParams.get("who") !== "keeper") {
    return NextResponse.json({ ok: true });
  }
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    const body = await request.json().catch(() => null) as { note?: string } | null;
    const note = String(body?.note || "").replace(/[^\p{L}\p{N} .:_-]/gu, "").slice(0, 160);
    await prisma.remoteDesk.upsert({
      where: { screenId: id },
      update: { note },
      create: { screenId: id, note },
    });
    return NextResponse.json({ ok: true });
  }
  const width = Number(request.headers.get("x-remote-w")) || 0;
  const height = Number(request.headers.get("x-remote-h")) || 0;
  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length < 32 || bytes.length > 900000) return NextResponse.json({ commands: [] });
  await prisma.remoteDesk.upsert({
    where: { screenId: id },
    update: { frame: bytes, frameAt: new Date(), width, height },
    create: { screenId: id, frame: bytes, frameAt: new Date(), width, height },
  });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

async function takeCommands(screenId: number) {
  const commands = await prisma.remoteCommand.findMany({
    where: { screenId },
    orderBy: { id: "asc" },
    take: 4,
  });
  if (commands.length) {
    await prisma.remoteCommand.deleteMany({ where: { id: { in: commands.map((item) => item.id) } } });
  }
  return commands.map((item) => ({
    op: item.op,
    x: item.x,
    y: item.y,
    x2: item.x2,
    y2: item.y2,
    text: item.text,
  }));
}
