import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { screenId?: number; url?: string };
  const screenId = Number(body.screenId);
  const url = typeof body.url === "string" ? body.url : "";
  if (!screenId || !url.startsWith("https://") || !url.includes(".blob.vercel-storage.com/") || !url.includes(".apk")) {
    return NextResponse.json({ error: "bad" }, { status: 400 });
  }
  await prisma.remoteDesk.upsert({
    where: { screenId },
    update: { upgradeUrl: url },
    create: { screenId, upgradeUrl: url },
  });
  return NextResponse.json({ ok: true });
}
