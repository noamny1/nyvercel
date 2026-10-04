import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) return NextResponse.json({ users: [] }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (!query) return NextResponse.json({ users: [] });
  const users = await prisma.user.findMany({
    where: {
      role: "client",
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    take: 8,
    include: { screens: { select: { id: true } } },
  });
  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      screenIds: user.screens.map((screen) => screen.id),
    })),
  });
}
