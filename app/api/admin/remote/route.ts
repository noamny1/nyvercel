import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { open, verifyTotp } from "@/lib/totp";

export const dynamic = "force-dynamic";

const OPS = new Set(["tap", "key", "text", "swipe", "reboot", "apps", "uninstall", "install", "shell", "shell-open", "relaunch", "log"]);

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
  const watchOff = new URL(request.url).searchParams.get("watch") === "0";
  await prisma.remoteDesk.upsert({
    where: { screenId },
    update: { watchedAt: watchOff ? new Date(0) : new Date() },
    create: { screenId, watchedAt: watchOff ? new Date(0) : new Date() },
  });
  if (watchOff) return NextResponse.json({ image: "" });
  const desk = await prisma.remoteDesk.findUnique({
    where: { screenId },
    select: { frame: true, width: true, height: true, frameAt: true },
  });
  if (!desk?.frame || desk.frame.byteLength < 32) return NextResponse.json({ image: "" });
  const bytes = Buffer.from(desk.frame);
  const mime = bytes[0] === 0x89 && bytes[1] === 0x50 ? "image/png" : "image/jpeg";
  return NextResponse.json({
    image: bytes.toString("base64"),
    mime,
    w: desk.width || 0,
    h: desk.height || 0,
    at: desk.frameAt ? desk.frameAt.getTime() : 0,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const session = await admin();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as {
    screenId?: number;
    op?: string;
    x?: number;
    y?: number;
    x2?: number;
    y2?: number;
    text?: string;
    code?: string;
  } | null;
  const screenId = Number(body?.screenId);
  const op = String(body?.op || "");
  if (!screenId || !OPS.has(op)) return NextResponse.json({ error: "bad" }, { status: 400 });
  const screen = await prisma.screen.findUnique({ where: { id: screenId }, select: { id: true } });
  if (!screen) return NextResponse.json({ error: "missing" }, { status: 404 });
  const raw = String(body?.text || "");
  if (op === "install" && !/^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\/.+/i.test(raw)) {
    return NextResponse.json({ error: "bad file" }, { status: 400 });
  }
  if (op === "uninstall" && !/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(raw)) {
    return NextResponse.json({ error: "bad package" }, { status: 400 });
  }
  if (op === "uninstall" && (raw === "android" || raw.startsWith("com.android."))) {
    return NextResponse.json({ error: "protected" }, { status: 400 });
  }
  if (op === "shell-open" || op === "shell") {
    const email = session.user?.email?.trim().toLowerCase() || "";
    const account = email ? await prisma.user.findUnique({ where: { email } }) : null;
    if (op === "shell-open") {
      const pending = account?.totpSecret ? open(account.totpSecret) : "";
      const code = String(body?.code || "");
      if (!pending || !verifyTotp(pending, code)) return NextResponse.json({ error: "totp" }, { status: 401 });
      const ok = !!account && await bcrypt.compare(raw, account.passwordHash);
      if (!ok) return NextResponse.json({ error: "password" }, { status: 401 });
      const until = new Date(Date.now() + 10 * 60 * 1000);
      await prisma.remoteDesk.upsert({
        where: { screenId },
        update: { shellUntil: until },
        create: { screenId, shellUntil: until },
      });
      return NextResponse.json({ ok: true });
    }
    if (/[\r\n\0]/.test(raw) || !raw.trim() || raw.length > 240) {
      return NextResponse.json({ error: "bad command" }, { status: 400 });
    }
    const desk = await prisma.remoteDesk.findUnique({ where: { screenId }, select: { shellUntil: true } });
    if (!desk?.shellUntil || desk.shellUntil.getTime() < Date.now()) {
      return NextResponse.json({ error: "locked" }, { status: 401 });
    }
    await prisma.shellAudit.create({ data: { screenId, email, command: raw.slice(0, 240) } });
  }
  const num = (value: number | undefined) => Math.max(0, Math.min(8000, Math.round(Number(value) || 0)));
  await prisma.remoteCommand.create({
    data: {
      screenId,
      op,
      x: num(body?.x),
      y: num(body?.y),
      x2: num(body?.x2),
      y2: num(body?.y2),
      text: raw.slice(0, op === "install" ? 500 : 240),
    },
  });
  return NextResponse.json({ ok: true });
}
