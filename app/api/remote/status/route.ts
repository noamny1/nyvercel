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
  const body = await request.json().catch(() => null) as {
    version?: string;
    resolution?: string;
    ip?: string;
    freeMb?: number;
    bootedAt?: number;
  } | null;
  const clean = (value: string) => value.replace(/[^\d.×xX:a-zA-Z]/g, "").slice(0, 40);
  const booted = Number(body?.bootedAt);
  await prisma.deviceStatus.upsert({
    where: { screenId: id },
    update: {
      version: clean(String(body?.version || "")),
      resolution: clean(String(body?.resolution || "")),
      ip: clean(String(body?.ip || "")),
      freeMb: Math.max(0, Math.min(1000000, Math.round(Number(body?.freeMb) || 0))),
      bootedAt: booted > 0 ? new Date(booted) : null,
      at: new Date(),
    },
    create: {
      screenId: id,
      version: clean(String(body?.version || "")),
      resolution: clean(String(body?.resolution || "")),
      ip: clean(String(body?.ip || "")),
      freeMb: Math.max(0, Math.min(1000000, Math.round(Number(body?.freeMb) || 0))),
      bootedAt: booted > 0 ? new Date(booted) : null,
    },
  });
  return NextResponse.json({ ok: true });
}
