import { createCipheriv, createHash, randomBytes } from "crypto";
import { del, list, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PATH = "backups/latest.bin";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  const header = request.headers.get("authorization");
  const fromVercel = request.headers.get("x-vercel-cron") === "1";
  if (!secret || (header !== `Bearer ${secret}` && !fromVercel)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "blob" }, { status: 500 });
  }

  const [screens, groups] = await Promise.all([
    prisma.screen.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        street: true,
        number: true,
        city: true,
        floor: true,
        theme: true,
        logoUrl: true,
        newsSource: true,
        newsCount: true,
        tickerSeconds: true,
        newsTicker: true,
        feedMode: true,
        groupId: true,
        musicPlaylist: true,
        listSort: true,
        active: true,
        slides: {
          select: {
            imageUrl: true,
            kind: true,
            templateId: true,
            title: true,
            detail: true,
            meta: true,
            sort: true,
            duration: true,
            active: true,
            weekdays: true,
            startsOn: true,
            endsOn: true,
          },
        },
        notices: { select: { text: true, active: true } },
      },
    }),
    prisma.screenGroup.findMany({
      select: { id: true, name: true, logoUrl: true, street: true, number: true, city: true, theme: true },
    }),
  ]);

  const body = Buffer.from(JSON.stringify({ at: new Date().toISOString(), screens, groups }));
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(body), cipher.final()]);
  const packed = Buffer.concat([iv, cipher.getAuthTag(), data]);
  const previous = await list({ prefix: "backups/" });
  await Promise.all(previous.blobs.map((item) => del(item.url)));
  const blob = await put(PATH, packed, {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/octet-stream",
  });
  return NextResponse.json({ ok: true, screens: screens.length, bytes: packed.length, url: blob.pathname });
}
