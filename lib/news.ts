import { prisma } from "@/lib/prisma";

export const NEWS_SOURCES = [
  { id: "ynet", name: "ynet", url: "https://www.ynet.co.il/Integration/StoryRss2.xml" },
  { id: "walla", name: "וואלה", url: "https://rss.walla.co.il/feed/1?type=main" },
  { id: "channel14", name: "חדשות 14", url: "https://news.google.com/rss/search?q=site:c14.co.il+when:2d&hl=he&gl=IL&ceid=IL:he" },
] as const;

function clean(value: string) {
  const entity = (name: string) => "&" + name + ";";
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, "")
    .replaceAll(entity("amp"), "&")
    .replaceAll(entity("quot"), '"')
    .replaceAll(entity("apos"), "'")
    .replaceAll(entity("lt"), "<")
    .replaceAll(entity("gt"), ">")
    .replaceAll("&#" + "39;", "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRss(xml: string) {
  const items: { title: string; link: string }[] = [];
  for (const block of xml.split(/<item[\s>]/i).slice(1, 21)) {
    const title = clean(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
    const link = clean(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || "");
    if (title) items.push({ title, link });
  }
  return items;
}

function parseC14(html: string) {
  const items: { title: string; link: string }[] = [];
  const re = /<a[^>]+href="(https:\/\/www\.c14\.co\.il\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) && items.length < 20) {
    const title = clean(match[2]);
    if (title.length > 18) items.push({ title, link: match[1] });
  }
  return items;
}

async function download(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/rss+xml, application/xml, text/html",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(String(response.status));
  return response.text();
}

async function sourcesFor(sourceId?: string) {
  const saved = await prisma.feed.findMany().catch(() => []);
  const base = saved.length > 0 ? saved : NEWS_SOURCES.map((source) => ({ ...source }));
  return base.filter((source) => !sourceId || source.id === sourceId);
}

export async function refreshNews(sourceId?: string) {
  const sources = await sourcesFor(sourceId);
  for (const source of sources) {
    let items: { title: string; link: string }[] = [];
    try {
      const text = await download(source.url);
      items = text.includes("<item") ? parseRss(text) : [];
    } catch {
      items = [];
    }
    if (source.id === "channel14" && items.length === 0) {
      try {
        items = parseC14(await download("https://www.c14.co.il/"));
      } catch {
        items = [];
      }
    }
    if (items.length === 0) continue;
    await prisma.newsItem.deleteMany({ where: { source: source.id } });
    await prisma.newsItem.createMany({
      data: items.map((item) => ({ source: source.id, title: item.title, link: item.link })),
    });
  }
}

export async function liveHeadlines(sourceId: string, take = 8) {
  const id = sourceId === "וואלה" ? "walla" : sourceId === "חדשות 14" ? "channel14" : sourceId || "ynet";
  const source = NEWS_SOURCES.find((item) => item.id === id) ?? NEWS_SOURCES[0];
  const limit = Math.min(20, Math.max(1, take));
  try {
    const text = await download(source.url);
    let items = text.includes("<item") ? parseRss(text) : [];
    if (source.id === "channel14") {
      items = items
        .map((item) => ({ ...item, title: item.title.replace(/\s+-\s+C14\s*$/i, "").trim() }))
        .filter((item) => item.title && !item.title.startsWith("site:"));
    }
    if (source.id === "channel14" && items.length === 0) {
      try {
        items = parseC14(await download("https://www.c14.co.il/"));
      } catch {
        items = [];
      }
    }
    if (items.length > 0) return items.slice(0, limit);
  } catch {
    /* fall through to the saved headlines */
  }
  return newsFor(source.id, limit).catch(() => []);
}

export async function newsFor(sourceId: string, take = 8) {
  const latest = await prisma.newsItem.findFirst({
    where: { source: sourceId },
    orderBy: { updatedAt: "desc" },
  });
  const stale = !latest || Date.now() - latest.updatedAt.getTime() > 15 * 60 * 1000;
  if (stale) {
    try {
      await refreshNews(sourceId);
    } catch {
      /* keep the previous headlines */
    }
  }
  const limit = Math.min(20, Math.max(1, take));
  return prisma.newsItem.findMany({
    where: { source: sourceId },
    orderBy: { id: "desc" },
    take: limit,
  });
}
