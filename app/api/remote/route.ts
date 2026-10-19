import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function hold(id: number, who: string) {
  const started = Date.now();
  let touched = 0;
  while (Date.now() - started < 8000) {
    const now = new Date();
    if (Date.now() - touched > 4000) {
      touched = Date.now();
      const mark = who === "nyk" ? { nykAt: now } : who === "keeper2" ? { keeper2At: now } : { keeperAt: now };
      try {
        await prisma.remoteDesk.upsert({
          where: { screenId: id },
          update: { seenAt: now, ...mark },
          create: { screenId: id, seenAt: now, ...mark },
        });
      } catch {
        // A missing column must not stop the live command channel.
      }
    }
    const commands = await prisma.remoteCommand.findMany({
      where: { screenId: id },
      orderBy: { id: "asc" },
      take: 8,
    });
    const desk = await prisma.remoteDesk.findUnique({ where: { screenId: id }, select: { watchedAt: true } });
    const watching = !!desk && Date.now() - desk.watchedAt.getTime() < 20000;
    if (commands.length || !watching) {
      if (commands.length) {
        await prisma.remoteCommand.deleteMany({ where: { id: { in: commands.map((item) => item.id) } } });
      }
      return NextResponse.json({
        found: true,
        watch: watching,
        commands: commands.map((item) => ({ op: item.op, x: item.x, y: item.y, x2: item.x2, y2: item.y2, text: item.text })),
      }, { headers: { "Cache-Control": "no-store" } });
    }
    await sleep(200);
  }
  return NextResponse.json({ found: true, watch: true, commands: [] }, { headers: { "Cache-Control": "no-store" } });
}

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
  const who = new URL(request.url).searchParams.get("who");
  const device = who === "keeper" || who === "keeper2" || who === "nyk";
  if (device && new URL(request.url).searchParams.get("wait") === "1") return hold(id, who || "keeper");
  const now = new Date();
  if (device) {
    const mark = who === "nyk" ? { nykAt: now } : who === "keeper2" ? { keeper2At: now } : { keeperAt: now };
    try {
      await prisma.remoteDesk.upsert({
        where: { screenId: id },
        update: { seenAt: now, ...mark },
        create: { screenId: id, seenAt: now, ...mark },
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
  const keeperFresh = !!desk?.keeperAt && Date.now() - desk.keeperAt.getTime() < 75000;
  const watching = !!desk && Date.now() - desk.watchedAt.getTime() < 20000;
  const watch = watching && (device || !keeperFresh);
  const needFrame = watch && (!desk?.frameAt || Date.now() - desk.frameAt.getTime() > 2500);
  const take = new URL(request.url).searchParams.get("take") === "1";
  const commands = take && device ? await takeCommands(id) : [];
  return NextResponse.json({ found: true, watch, needFrame, commands }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const id = await screenId(request);
  if (!id) return NextResponse.json({ commands: [] }, { status: 404 });
  const who = new URL(request.url).searchParams.get("who");
  if (who !== "keeper" && who !== "keeper2" && who !== "nyk") {
    return NextResponse.json({ ok: true });
  }
  const now = new Date();
  const stamp = who === "nyk" ? { nykAt: now } : who === "keeper2" ? { keeper2At: now } : {};
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    const body = await request.json().catch(() => null) as { note?: string } | null;
    const note = String(body?.note || "").replace(/[^\p{L}\p{N} .:_-]/gu, "").slice(0, 160);
    await prisma.remoteDesk.upsert({
      where: { screenId: id },
      update: { note, ...stamp },
      create: { screenId: id, note, ...stamp },
    });
    return NextResponse.json({ ok: true });
  }
  const width = Number(request.headers.get("x-remote-w")) || 0;
  const height = Number(request.headers.get("x-remote-h")) || 0;
  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length < 32 || bytes.length > 900000) return NextResponse.json({ commands: [] });
  await prisma.remoteDesk.upsert({
    where: { screenId: id },
    update: { frame: bytes, frameAt: new Date(), width, height, ...stamp },
    create: { screenId: id, frame: bytes, frameAt: new Date(), width, height, ...stamp },
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
