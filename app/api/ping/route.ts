import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const params = new URL(request.url).searchParams;
  const key = Number(params.get("code") || params.get("id"));
  if (!key) return NextResponse.json({ status: "error" }, { status: 400 });
  const screen = await prisma.screen.findUnique({ where: { code: key }, select: { id: true, active: true, revision: true } })
    ?? (key < 100000 ? await prisma.screen.findUnique({ where: { id: key }, select: { id: true, active: true, revision: true } }) : null);
  if (!screen?.active) return NextResponse.json({ status: "error" }, { status: 404 });
  if (params.get("beat") === "1") {
    const at = new Date();
    await prisma.heartbeat.upsert({
      where: { screenId: screen.id },
      update: { at },
      create: { screenId: screen.id, at },
    });
  }
  return NextResponse.json({ status: "success", r: screen.revision }, {
    headers: { "Cache-Control": "no-store" },
  });
}
