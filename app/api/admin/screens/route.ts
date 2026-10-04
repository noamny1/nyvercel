import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function shape(screen: { id: number; street: string; number: string; city: string; name: string; group: { street: string; number: string; city: string } | null }) {
  return {
    id: screen.id,
    street: screen.street || screen.group?.street || "",
    number: screen.number || screen.group?.number || "",
    city: screen.city || screen.group?.city || "",
    name: screen.name,
  };
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ screens: [] }, { status: 401 });
  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") || "").split(",").map(Number).filter(Boolean).slice(0, 30);
  if (ids.length) {
    const screens = await prisma.screen.findMany({ where: { id: { in: ids } }, include: { group: true } });
    return NextResponse.json({ screens: screens.map(shape) });
  }
  const query = url.searchParams.get("q")?.trim() || "";
  if (!query) return NextResponse.json({ screens: [] });
  const id = Number(query);
  const screens = await prisma.screen.findMany({
    where: {
      OR: [
        ...(Number.isInteger(id) && id > 0 ? [{ id }] : []),
        { street: { contains: query, mode: "insensitive" } },
        { number: { contains: query, mode: "insensitive" } },
        { city: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { id: "asc" },
    take: 8,
    include: { group: true },
  });
  return NextResponse.json({ screens: screens.map(shape) });
}
