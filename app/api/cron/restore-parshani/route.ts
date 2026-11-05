import { createDecipheriv, createHash } from "crypto";
import { list } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/modules/data/prisma";
import { touchScreen } from "@/modules/data/publish";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ONCE = "99d5c06bf551e3d2146c6f239f245439d86c1bb1b4de308e";

type BackupSlide = {
  imageUrl: string;
  kind: string;
  templateId: string;
  title: string;
  detail: string;
  meta: string;
  sort: number;
  duration: number;
  active: boolean;
  weekdays: string;
  startsOn: string;
  endsOn: string;
};

type BackupNotice = { text: string; active: boolean };

type BackupScreen = {
  id: number;
  code: number | null;
  name: string;
  street: string;
  number: string;
  city: string;
  floor: string;
  theme: string;
  logoUrl: string;
  newsSource: string;
  newsCount: number;
  tickerSeconds: number;
  newsTicker: string;
  feedMode: string;
  groupId: number | null;
  musicPlaylist: string;
  slides: BackupSlide[];
  notices: BackupNotice[];
};

function decrypt(packed: Buffer, secret: string) {
  const key = createHash("sha256").update(secret).digest();
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const data = packed.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export async function GET(request: Request) {
  const header = request.headers.get("authorization");
  const cron = process.env.CRON_SECRET || "";
  if (header !== `Bearer ${ONCE}` && !(cron && header === `Bearer ${cron}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const secret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "missing-env" }, { status: 500 });
  }

  const blobs = await list({ prefix: "backups/" });
  const backup = blobs.blobs.find((item) => item.pathname === "backups/latest.bin") || blobs.blobs[0];
  if (!backup) return NextResponse.json({ error: "no-backup", names: blobs.blobs.map((item) => item.pathname) }, { status: 404 });

  const packed = Buffer.from(await (await fetch(backup.url)).arrayBuffer());
  let body: { at?: string; screens?: BackupScreen[] };
  try {
    body = JSON.parse(decrypt(packed, secret));
  } catch {
    return NextResponse.json({ error: "decrypt" }, { status: 500 });
  }

  const at = body.at || "";
  const matches = (body.screens || []).filter((screen) => {
    const street = screen.street || "";
    const city = screen.city || "";
    const number = String(screen.number || "");
    return street.includes("פרשני") && number === "4" && city.includes("רחובות");
  });
  if (!matches.length) {
    const near = (body.screens || [])
      .filter((screen) => (screen.street || "").includes("פרשני") || (screen.name || "").includes("פרשני"))
      .map((screen) => ({ id: screen.id, name: screen.name, street: screen.street, number: screen.number, city: screen.city, slides: screen.slides.length }));
    return NextResponse.json({ error: "not-found", at, near }, { status: 404 });
  }

  const restored = [];
  for (const source of matches) {
    const current = await prisma.screen.findUnique({
      where: { id: source.id },
      include: { slides: true, notices: true, updates: { select: { id: true, text: true, active: true } } },
    });
    if (!current) {
      restored.push({ id: source.id, error: "screen-missing" });
      continue;
    }
    if (!source.slides.length) {
      restored.push({ id: source.id, error: "backup-empty", currentSlides: current.slides.length });
      continue;
    }
    await prisma.$transaction([
      prisma.slide.deleteMany({ where: { screenId: source.id } }),
      prisma.notice.deleteMany({ where: { screenId: source.id } }),
      prisma.slide.createMany({
        data: source.slides.map((slide) => ({
          screenId: source.id,
          imageUrl: slide.imageUrl,
          kind: slide.kind || "image",
          templateId: slide.templateId || "",
          title: slide.title || "",
          detail: slide.detail || "",
          meta: slide.meta || "",
          sort: slide.sort || 0,
          duration: slide.duration || 8,
          active: slide.active !== false,
          weekdays: slide.weekdays || "01234",
          startsOn: slide.startsOn || "",
          endsOn: slide.endsOn || "",
        })),
      }),
      ...(source.notices.length
        ? [prisma.notice.createMany({ data: source.notices.map((notice) => ({ screenId: source.id, text: notice.text, active: notice.active !== false })) })]
        : []),
      prisma.screen.update({
        where: { id: source.id },
        data: {
          name: source.name,
          floor: source.floor,
          theme: source.theme,
          logoUrl: source.logoUrl,
          newsSource: source.newsSource,
          newsCount: source.newsCount,
          tickerSeconds: source.tickerSeconds,
          newsTicker: source.newsTicker,
          feedMode: source.feedMode,
          musicPlaylist: source.musicPlaylist,
        },
      }),
    ]);
    await touchScreen(source.id);
    restored.push({
      id: source.id,
      code: current.code,
      name: source.name,
      backupAt: at,
      slides: source.slides.length,
      notices: source.notices.length,
      updatesKept: current.updates.length,
      replacedSlides: current.slides.length,
      logo: source.logoUrl ? "yes" : "no",
    });
  }
  return NextResponse.json({ ok: true, at, restored });
}
