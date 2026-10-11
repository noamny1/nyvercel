import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PACKAGE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

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
  const body = await request.json().catch(() => null) as { apps?: { name?: string; package?: string }[]; note?: string } | null;
  const apps = Array.isArray(body?.apps) ? body.apps.slice(0, 200).flatMap((item) => {
    const name = String(item?.name || "").replace(/[^\p{L}\p{N} ._+()-]/gu, "").slice(0, 60);
    const pkg = String(item?.package || "");
    if (!PACKAGE.test(pkg) || pkg === "com.example.nymediaapp") return [];
    return [{ name: name || pkg, package: pkg }];
  }) : [];
  const note = String(body?.note || "").replace(/[^\p{L}\p{N} .:_-]/gu, "").slice(0, 120);
  await prisma.remoteDesk.upsert({
    where: { screenId: id },
    update: { apps: JSON.stringify(apps), note },
    create: { screenId: id, apps: JSON.stringify(apps), note },
  });
  return NextResponse.json({ ok: true });
}
