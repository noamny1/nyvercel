import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  const body = (await request.json()) as { screenId?: number; groupId?: number; imageUrl?: string; duration?: number };
  const owner = body.groupId ? { groupId: body.groupId } : body.screenId ? { screenId: body.screenId } : null;
  if (!owner || !body.imageUrl) {
    return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
  }
  const last = await prisma.slide.findFirst({
    where: owner,
    orderBy: { sort: "desc" },
  });
  const slide = await prisma.slide.create({
    data: {
      ...owner,
      imageUrl: body.imageUrl,
      duration: Math.max(3, Number(body.duration) || 8),
      sort: (last?.sort ?? 0) + 1,
    },
  });
  return NextResponse.json(slide);
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  const body = (await request.json()) as { id?: number; duration?: number; direction?: "up" | "down"; weekdays?: string };
  if (!body.id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  const slide = await prisma.slide.findUnique({ where: { id: body.id } });
  if (!slide) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  if (body.duration) {
    await prisma.slide.update({
      where: { id: slide.id },
      data: { duration: Math.max(3, Number(body.duration) || slide.duration) },
    });
  }
  if (body.weekdays !== undefined) {
    const days = body.weekdays.replace(/[^0-6]/g, "");
    await prisma.slide.update({
      where: { id: slide.id },
      data: { weekdays: days || "0123456" },
    });
  }
  if (body.direction) {
    const sibling = await prisma.slide.findFirst({
      where: {
        ...(slide.groupId ? { groupId: slide.groupId } : { screenId: slide.screenId }),
        sort: body.direction === "up" ? { lt: slide.sort } : { gt: slide.sort },
      },
      orderBy: { sort: body.direction === "up" ? "desc" : "asc" },
    });
    if (sibling) {
      await prisma.$transaction([
        prisma.slide.update({ where: { id: slide.id }, data: { sort: sibling.sort } }),
        prisma.slide.update({ where: { id: sibling.id }, data: { sort: slide.sort } }),
      ]);
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  const body = (await request.json()) as { id?: number };
  if (!body.id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  await prisma.slide.delete({ where: { id: body.id } });
  return NextResponse.json({ ok: true });
}
