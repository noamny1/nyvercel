import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const OPS = new Set(["tap", "key", "text", "swipe", "reboot", "apps", "uninstall", "install"]);

async function admin() {
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) return null;
  return session;
}

export async function GET(request: Request) {
  if (!await admin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const screenId = Number(new URL(request.url).searchParams.get("screenId"));
  if (!screenId) return NextResponse.json({ error: "missing" }, { status: 400 });
  const screen = await prisma.screen.findUnique({ where: { id: screenId }, select: { id: true } });
  if (!screen) return NextResponse.json({ error: "missing" }, { status: 404 });
  await prisma.remoteDesk.upsert({
    where: { screenId },
    update: { watchedAt: new Date() },
    create: { screenId, watchedAt: new Date() },
  });
  const desk = await prisma.remoteDesk.findUnique({ where: { screenId } });
  if (!desk?.frame) return new NextResponse(null, { status: 204 });
  return new NextResponse(new Uint8Array(desk.frame), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "no-store",
      "X-Remote-W": String(desk.width || 0),
      "X-Remote-H": String(desk.height || 0),
    },
  });
}

export async function POST(request: Request) {
  if (!await admin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as {
    screenId?: number;
    op?: string;
    x?: number;
    y?: number;
    x2?: number;
    y2?: number;
    text?: string;
  } | null;
  const screenId = Number(body?.screenId);
  const op = String(body?.op || "");
  if (!screenId || !OPS.has(op)) return NextResponse.json({ error: "bad" }, { status: 400 });
  const screen = await prisma.screen.findUnique({ where: { id: screenId }, select: { id: true } });
  if (!screen) return NextResponse.json({ error: "missing" }, { status: 404 });
  const raw = String(body?.text || "");
  if (op === "install" && !/^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\/.+\.apk(\?.*)?$/i.test(raw)) {
    return NextResponse.json({ error: "bad file" }, { status: 400 });
  }
  if (op === "uninstall" && !/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(raw)) {
    return NextResponse.json({ error: "bad package" }, { status: 400 });
  }
  if (op === "uninstall" && (raw === "com.example.nymediaapp" || raw === "android" || raw.startsWith("com.android."))) {
    return NextResponse.json({ error: "protected" }, { status: 400 });
  }
  const num = (value: number | undefined) => Math.max(0, Math.min(8000, Math.round(Number(value) || 0)));
  await prisma.remoteDesk.upsert({
    where: { screenId },
    update: { watchedAt: new Date() },
    create: { screenId, watchedAt: new Date() },
  });
  await prisma.remoteCommand.create({
    data: {
      screenId,
      op,
      x: num(body?.x),
      y: num(body?.y),
      x2: num(body?.x2),
      y2: num(body?.y2),
      text: raw.slice(0, op === "install" ? 500 : 80),
    },
  });
  return NextResponse.json({ ok: true });
}
