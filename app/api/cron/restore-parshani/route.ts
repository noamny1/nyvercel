import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/modules/data/prisma";
import { touchScreen } from "@/modules/data/publish";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const AT = "2026-11-05T10:20:00Z";
const NEEDLE = "פרשני";

function safe(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]").replace(/ep-[a-z0-9-]+/gi, "[host]").slice(0, 400);
}

function append(raw: string, extra: string) {
  return raw + (raw.includes("?") ? "&" : "?") + extra;
}

function isTarget(screen: { street: string; number: string; city: string; name: string }) {
  const number = String(screen.number || "").trim();
  const street = screen.street || "";
  const name = screen.name || "";
  return number === "4" && (street.includes(NEEDLE) || name.includes(NEEDLE));
}

function brief(screen: any) {
  return {
    id: screen.id,
    code: screen.code,
    name: screen.name,
    street: screen.street,
    number: screen.number,
    city: screen.city,
    floor: screen.floor,
    theme: screen.theme,
    groupId: screen.groupId,
    hasLogo: Boolean(screen.logoUrl),
    slides: screen.slides.length,
    notices: screen.notices.length,
    titles: screen.slides.map((slide: { sort: number; kind: string; title: string }) => ({
      sort: slide.sort,
      kind: slide.kind,
      title: (slide.title || "").slice(0, 80),
    })),
  };
}

function signature(screen: any) {
  return JSON.stringify({
    slides: screen.slides.map((slide: any) => [slide.sort, slide.kind, slide.title, slide.imageUrl, slide.templateId, slide.active]),
    notices: screen.notices.map((notice: any) => [notice.text, notice.active]),
    theme: screen.theme,
    logo: screen.logoUrl,
    floor: screen.floor,
  });
}

const screenSelect = {
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
  slides: {
    orderBy: { sort: "asc" as const },
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
};

async function readScreens(client: { screen: PrismaClient["screen"] }) {
  return client.screen.findMany({
    where: {
      OR: [
        { street: { contains: NEEDLE } },
        { name: { contains: NEEDLE } },
        { city: { contains: NEEDLE } },
      ],
    },
    select: screenSelect,
  });
}

export async function GET(request: Request) {
  const token = process.env["RESTORE_ONCE"] ?? "";
  const header = request.headers.get("authorization") ?? "";
  if (!token || header !== `Bearer ${token}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const base = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!base) return NextResponse.json({ error: "no-database" }, { status: 500 });

  const liveRows = await readScreens(prisma);
  const liveTargets = liveRows.filter(isTarget);
  const liveSig = liveTargets.map(signature).join("|");
  const groups = await prisma.screenGroup.findMany({
    where: { OR: [{ name: { contains: NEEDLE } }, { street: { contains: NEEDLE } }, { city: { contains: NEEDLE } }] },
    select: { id: true, name: true, street: true, number: true, city: true, _count: { select: { screens: true, slides: true } } },
  });

  const attempts: Array<{ label: string; error?: string; same?: boolean; targets?: ReturnType<typeof brief>[] }> = [];
  const urls: Array<[string, string]> = [
    ["plain", base],
    ["query-timestamp", append(base, "timestamp=" + encodeURIComponent(AT))],
    ["options-timestamp", append(base, "options=" + encodeURIComponent("timestamp:" + AT))],
  ];

  let chosen: { label: string; rows: any[] } | null = null;
  for (const [label, url] of urls) {
    const client = new PrismaClient({ datasourceUrl: url });
    try {
      const rows = await readScreens(client);
      const targets = rows.filter(isTarget);
      const sig = targets.map(signature).join("|");
      attempts.push({ label, same: sig === liveSig, targets: targets.map(brief) });
      if (label !== "plain" && !chosen && targets.some((row) => row.slides.length > 0) && sig !== liveSig) {
        chosen = { label, rows: targets };
      }
    } catch (error) {
      attempts.push({ label, error: safe(error) });
    } finally {
      await client.$disconnect().catch(() => undefined);
    }
  }

  const apply = new URL(request.url).searchParams.get("apply") === "1";
  if (!chosen) {
    return NextResponse.json({
      ok: false,
      at: AT,
      israel: "2026-11-05 12:20",
      error: "time-travel-unchanged",
      near: liveRows.map(brief),
      groups,
      live: liveTargets.map(brief),
      attempts,
    }, { status: 409 });
  }

  if (!apply) {
    return NextResponse.json({
      ok: true,
      preview: true,
      at: AT,
      israel: "2026-11-05 12:20",
      via: chosen.label,
      past: chosen.rows.map(brief),
      live: liveTargets.map(brief),
      near: liveRows.map(brief),
    });
  }

  const restored = [];
  for (const source of chosen.rows) {
    if (!source.slides.length) {
      restored.push({ id: source.id, error: "backup-empty" });
      continue;
    }
    const current = liveTargets.find((row) => row.id === source.id)
      || liveTargets.find((row) => row.code && row.code === source.code)
      || null;
    if (!current) {
      restored.push({ id: source.id, error: "screen-missing" });
      continue;
    }
    const ops: any[] = [
      prisma.slide.deleteMany({ where: { screenId: current.id } }),
      prisma.notice.deleteMany({ where: { screenId: current.id } }),
      prisma.slide.createMany({
        data: source.slides.map((slide: any) => ({
          screenId: current.id,
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
    ];
    if (source.notices.length) {
      ops.push(prisma.notice.createMany({
        data: source.notices.map((notice: any) => ({
          screenId: current.id,
          text: notice.text,
          active: notice.active !== false,
        })),
      }));
    }
    ops.push(prisma.screen.update({
      where: { id: current.id },
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
    }));
    await prisma.$transaction(ops);
    await touchScreen(current.id);
    restored.push({
      id: current.id,
      code: current.code,
      slides: source.slides.length,
      notices: source.notices.length,
      replacedSlides: current.slides.length,
      keptGroupId: current.groupId,
      pastGroupId: source.groupId,
    });
  }

  return NextResponse.json({ ok: true, at: AT, restored });
}
