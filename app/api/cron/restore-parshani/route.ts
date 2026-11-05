import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/modules/data/prisma";
import { touchScreen } from "@/modules/data/publish";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const AT = "2026-11-05T10:20:00Z";

function safe(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]").slice(0, 500);
}

function withOptions(raw: string, options: string) {
  const url = new URL(raw);
  url.searchParams.set("options", options);
  url.searchParams.set("connect_timeout", "20");
  return url.toString();
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

type Row = Awaited<ReturnType<PrismaClient["screen"]["findMany"]>>[number];

function isTarget(screen: { street: string; number: string; city: string; name: string }) {
  const number = String(screen.number || "").trim();
  const city = screen.city || "";
  const street = screen.street || "";
  const name = screen.name || "";
  return (street.includes("פרשני") || name.includes("פרשני")) && number === "4" && city.includes("רחובות");
}

function brief(screen: Row & { slides: { title: string; kind: string; sort: number }[]; notices: unknown[]; logoUrl: string }) {
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
    titles: screen.slides.map((slide) => ({
      sort: slide.sort,
      kind: slide.kind,
      title: (slide.title || "").slice(0, 80),
    })),
  };
}

function signature(screen: { slides: { sort: number; kind: string; title: string; imageUrl: string; templateId: string; active: boolean }[]; notices: { text: string; active: boolean }[]; theme: string; logoUrl: string; floor: string }) {
  return JSON.stringify({
    slides: screen.slides.map((slide) => [slide.sort, slide.kind, slide.title, slide.imageUrl, slide.templateId, slide.active]),
    notices: screen.notices.map((notice) => [notice.text, notice.active]),
    theme: screen.theme,
    logo: screen.logoUrl,
    floor: screen.floor,
  });
}

async function readScreens(client: PrismaClient) {
  return client.screen.findMany({
    where: { OR: [{ street: { contains: "פרשני" } }, { name: { contains: "פרשני" } }] },
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

  const attempts: Array<{ label: string; error?: string; targets?: ReturnType<typeof brief>[] }> = [];
  const optionSets = [
    ["timestamp", `timestamp:${AT}`],
    ["neon-timestamp", `-c neon.timestamp=${AT}`],
    ["plain-timestamp", `-c timestamp=${AT}`],
  ] as const;

  let chosen: { label: string; rows: typeof liveTargets } | null = null;
  for (const [label, options] of optionSets) {
    const client = new PrismaClient({ datasourceUrl: withOptions(base, options) });
    try {
      const rows = await readScreens(client);
      const targets = rows.filter(isTarget);
      attempts.push({ label, targets: targets.map(brief) });
      const sig = targets.map(signature).join("|");
      if (!chosen && targets.some((row) => row.slides.length > 0) && sig !== liveSig) {
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
    await prisma.$transaction([
      prisma.slide.deleteMany({ where: { screenId: current.id } }),
      prisma.notice.deleteMany({ where: { screenId: current.id } }),
      prisma.slide.createMany({
        data: source.slides.map((slide) => ({
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
      ...(source.notices.length
        ? [prisma.notice.createMany({
          data: source.notices.map((notice) => ({
            screenId: current.id,
            text: notice.text,
            active: notice.active !== false,
          })),
        })]
        : []),
      prisma.screen.update({
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
      }),
    ]);
    await touchScreen(current.id);
    restored.push({
      id: current.id,
      code: current.code,
      name: source.name,
      slides: source.slides.length,
      notices: source.notices.length,
      replacedSlides: current.slides.length,
      keptGroupId: current.groupId,
      pastGroupId: source.groupId,
      via: chosen.label,
    });
  }

  return NextResponse.json({ ok: true, at: AT, israel: "2026-11-05 12:20", restored });
}
