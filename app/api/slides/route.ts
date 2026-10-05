import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { touchOwner } from "@/lib/publish";
import { defaultWeekdays } from "@/lib/ready-slides";

function todayInIsrael() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

function dateOrEmpty(value: unknown) {
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  const body = (await request.json()) as {
    screenId?: number; groupId?: number; imageUrl?: string; duration?: number;
    kind?: string; templateId?: string; title?: string; detail?: string; meta?: string; startsOn?: string;
  };
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
      kind: body.kind === "template" || body.kind === "youtube" ? body.kind : "image",
      templateId: body.templateId || "",
      title: body.title || "",
      detail: body.detail || "",
      meta: body.meta || "",
      weekdays: defaultWeekdays(body.templateId || "", body.title || ""),
      startsOn: dateOrEmpty(body.startsOn) || todayInIsrael(),
      sort: (last?.sort ?? 0) + 1,
    },
  });
  await touchOwner(owner);
  return NextResponse.json(slide);
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  const body = (await request.json()) as { id?: number; duration?: number; direction?: "up" | "down"; weekdays?: string; startsOn?: string; endsOn?: string; imageUrl?: string; title?: string; detail?: string; meta?: string };
  if (!body.id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  const slide = await prisma.slide.findUnique({ where: { id: body.id } });
  if (!slide) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  if (body.title !== undefined || body.detail !== undefined || body.meta !== undefined) {
    await prisma.slide.update({
      where: { id: slide.id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.detail !== undefined ? { detail: body.detail } : {}),
        ...(body.meta !== undefined ? { meta: body.meta } : {}),
      },
    });
  }
  if (body.imageUrl) {
    await prisma.slide.update({ where: { id: slide.id }, data: { imageUrl: body.imageUrl } });
  }
  if (body.duration) {
    await prisma.slide.update({
      where: { id: slide.id },
      data: { duration: Math.max(3, Number(body.duration) || slide.duration) },
    });
  }
  if (body.weekdays !== undefined || body.startsOn !== undefined || body.endsOn !== undefined) {
    const days = (body.weekdays ?? slide.weekdays).replace(/[^0-6]/g, "");
    await prisma.slide.update({
      where: { id: slide.id },
      data: {
        weekdays: days,
        ...(body.startsOn !== undefined ? { startsOn: dateOrEmpty(body.startsOn) } : {}),
        ...(body.endsOn !== undefined ? { endsOn: dateOrEmpty(body.endsOn) } : {}),
      },
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
  await touchOwner(slide);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  const body = (await request.json()) as { id?: number };
  if (!body.id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  const slide = await prisma.slide.findUnique({ where: { id: body.id } });
  if (!slide) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  await prisma.slide.delete({ where: { id: body.id } });
  await touchOwner(slide);
  return NextResponse.json({ ok: true });
}
