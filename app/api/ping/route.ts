import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ status: "error" }, { status: 400 });
  const screen = await prisma.screen.findUnique({ where: { id } });
  if (!screen || !screen.active) return NextResponse.json({ status: "error" }, { status: 404 });
  await prisma.screen.update({ where: { id }, data: { lastPing: new Date() } });
  return NextResponse.json({ status: "success", id });
}
