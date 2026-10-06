import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(token)) return new NextResponse("לא נמצא", { status: 404 });
  const link = await prisma.fileLink.findUnique({ where: { token } }).catch(() => null);
  if (!link?.url) return new NextResponse("לא נמצא", { status: 404 });

  const upstream = await fetch(link.url, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) return new NextResponse("לא נמצא", { status: 404 });
  const type = link.mime.startsWith("text/") ? "text/plain; charset=utf-8" : link.mime || "application/octet-stream";
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
