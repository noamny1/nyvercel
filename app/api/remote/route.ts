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
  if (!id) return NextResponse.json({ watch: false });
  const desk = await prisma.remoteDesk.findUnique({ where: { screenId: id }, select: { watchedAt: true } });
  const watch = !!desk && Date.now() - desk.watchedAt.getTime() < 20000;
  const take = new URL(request.url).searchParams.get("take") === "1";
  const commands = take && watch ? await takeCommands(id) : [];
  return NextResponse.json({ watch, commands }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const id = await screenId(request);
  if (!id) return NextResponse.json({ commands: [] }, { status: 404 });
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
