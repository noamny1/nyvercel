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

export async function POST(request: Request) {
  const id = await screenId(request);
  if (!id) return NextResponse.json({ ok: false }, { status: 404 });
  const body = await request.json().catch(() => null) as { output?: string } | null;
  const output = String(body?.output || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, 12000);
  await prisma.remoteDesk.upsert({
    where: { screenId: id },
    update: { logOut: output },
    create: { screenId: id, logOut: output },
  });
  return NextResponse.json({ ok: true });
}
