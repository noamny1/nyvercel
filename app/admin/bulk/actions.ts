"use server";

import { prisma } from "@/lib/prisma";
import { screenWhere } from "@/lib/access";
import { requireSession, isSystemAdmin } from "@/lib/session";
import { touchScreen } from "@/lib/publish";
import { normalizePlaylists } from "@/lib/music-catalog";
import { savedTheme } from "@/lib/themes";

async function managerScreens(ids: number[]) {
  const session = await requireSession();
  if (!session) return { error: "נדרשת כניסה", ids: [] as number[] };
  const email = session.user?.email?.trim().toLowerCase();
  if (!email) return { error: "נדרשת כניסה", ids: [] as number[] };
  if (!isSystemAdmin(session)) {
    const link = await prisma.groupManager.findFirst({
      where: { user: { email: { equals: email, mode: "insensitive" } } },
      select: { groupId: true },
    });
    if (!link) return { error: "הפעולה זמינה רק לאחראי קבוצה", ids: [] as number[] };
  }
  const wanted = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
  if (!wanted.length) return { error: "בחרו לפחות מסך אחד", ids: [] as number[] };
  const rows = await prisma.screen.findMany({
    where: { id: { in: wanted }, ...(await screenWhere(session)) },
    select: { id: true },
  });
  if (!rows.length) return { error: "אין מסכים לעדכון", ids: [] as number[] };
  return { error: "", ids: rows.map((row) => row.id) };
}

async function refresh(ids: number[]) {
  for (const id of ids) await touchScreen(id);
}

export async function bulkSettings(input: {
  screenIds: number[];
  theme?: string;
  newsTicker?: string;
  feedMode?: string;
  newsSource?: string[];
  music?: string[];
  apply: { theme?: boolean; newsTicker?: boolean; feedMode?: boolean; news?: boolean; music?: boolean };
}) {
  const owned = await managerScreens(input.screenIds);
  if (owned.error) return { ok: false, error: owned.error };
  const data: {
    theme?: string;
    newsTicker?: string;
    feedMode?: string;
    newsSource?: string;
    musicPlaylist?: string;
  } = {};
  if (input.apply.theme && input.theme) data.theme = await savedTheme(input.theme, input.theme, false);
  if (input.apply.newsTicker && ["on", "weekend", "off"].includes(String(input.newsTicker))) data.newsTicker = String(input.newsTicker);
  if (input.apply.feedMode && ["news", "notices", "both"].includes(String(input.feedMode))) data.feedMode = String(input.feedMode);
  if (input.apply.news) {
    const ids = [...new Set((input.newsSource || []).map((item) => item.trim()).filter(Boolean))].slice(0, 4);
    if (!ids.length) return { ok: false, error: "בחרו לפחות מקור חדשות אחד" };
    data.newsSource = ids.join(",");
  }
  if (input.apply.music) data.musicPlaylist = normalizePlaylists(input.music || []);
  if (!Object.keys(data).length) return { ok: false, error: "סמנו מה לעדכן" };
  await prisma.screen.updateMany({ where: { id: { in: owned.ids } }, data });
  await refresh(owned.ids);
  return { ok: true, count: owned.ids.length };
}

export async function bulkAddSlide(input: { screenIds: number[]; imageUrl: string; duration: number }) {
  const owned = await managerScreens(input.screenIds);
  if (owned.error) return { ok: false, error: owned.error };
  const imageUrl = input.imageUrl.trim();
  if (!imageUrl.startsWith("https://")) return { ok: false, error: "חסר קובץ שקף" };
  const duration = Math.max(3, Math.min(120, Math.round(Number(input.duration) || 8)));
  const lasts = await prisma.slide.groupBy({
    by: ["screenId"],
    where: { screenId: { in: owned.ids } },
    _max: { sort: true },
  });
  const sortOf = new Map(lasts.map((row) => [row.screenId, row._max.sort || 0]));
  await prisma.slide.createMany({
    data: owned.ids.map((screenId) => ({
      screenId,
      imageUrl,
      duration,
      kind: "image",
      weekdays: "0123456",
      sort: (sortOf.get(screenId) || 0) + 1,
      active: true,
    })),
  });
  await refresh(owned.ids);
  return { ok: true, count: owned.ids.length };
}

export async function bulkRemoveSlide(input: { screenIds: number[]; imageUrl: string }) {
  const owned = await managerScreens(input.screenIds);
  if (owned.error) return { ok: false, error: owned.error };
  const imageUrl = input.imageUrl.trim();
  if (!imageUrl) return { ok: false, error: "חסר שקף" };
  await prisma.slide.deleteMany({ where: { screenId: { in: owned.ids }, imageUrl } });
  await refresh(owned.ids);
  return { ok: true, count: owned.ids.length };
}

export async function bulkAddNotice(input: { screenIds: number[]; text: string }) {
  const owned = await managerScreens(input.screenIds);
  if (owned.error) return { ok: false, error: owned.error };
  const text = input.text.trim().slice(0, 120);
  if (!text) return { ok: false, error: "חסרה הודעה" };
  await prisma.notice.createMany({
    data: owned.ids.map((screenId) => ({ screenId, text, active: true })),
  });
  await refresh(owned.ids);
  return { ok: true, count: owned.ids.length };
}

export async function bulkRemoveNotice(input: { screenIds: number[]; text: string }) {
  const owned = await managerScreens(input.screenIds);
  if (owned.error) return { ok: false, error: owned.error };
  const text = input.text.trim();
  if (!text) return { ok: false, error: "חסרה הודעה" };
  await prisma.notice.deleteMany({ where: { screenId: { in: owned.ids }, text } });
  await refresh(owned.ids);
  return { ok: true, count: owned.ids.length };
}
