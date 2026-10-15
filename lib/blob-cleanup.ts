import { del, list } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const LIMIT = 150;

function pathOf(value: string) {
  if (!value.includes("blob.vercel-storage.com")) return "";
  try {
    return new URL(value.split("?")[0]).pathname.replace(/^\/+/, "");
  } catch {
    return "";
  }
}

function remember(used: Set<string>, value: string) {
  const path = pathOf(value);
  if (path) used.add(path);
  const extra = value.match(/https:\/\/[^"'\s]+blob\.vercel-storage\.com\/[^"'\s]+/g) || [];
  for (const url of extra) {
    const found = pathOf(url);
    if (found) used.add(found);
  }
}

export async function cleanUnusedBlobs() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { deleted: 0, skipped: true };
  const [screens, groups, slides, desks, files] = await Promise.all([
    prisma.screen.findMany({ select: { logoUrl: true } }),
    prisma.screenGroup.findMany({ select: { logoUrl: true, promoUrl: true, musicUrl: true } }),
    prisma.slide.findMany({ select: { imageUrl: true, meta: true } }),
    prisma.remoteDesk.findMany({ select: { upgradeUrl: true, lastApk: true } }),
    prisma.fileLink.findMany({ select: { url: true } }),
  ]);
  const used = new Set<string>();
  for (const row of screens) remember(used, row.logoUrl);
  for (const row of groups) {
    remember(used, row.logoUrl);
    remember(used, row.promoUrl);
    remember(used, row.musicUrl);
  }
  for (const row of slides) {
    remember(used, row.imageUrl);
    remember(used, row.meta);
  }
  for (const row of desks) {
    remember(used, row.upgradeUrl);
    remember(used, row.lastApk);
  }
  for (const row of files) remember(used, row.url);

  const cutoff = Date.now() - WEEK;
  const stale: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ cursor, limit: 1000 });
    for (const blob of page.blobs) {
      const path = blob.pathname.replace(/^\/+/, "");
      if (path.startsWith("backups/") || path.endsWith(".apk")) continue;
      if (!path.startsWith("uploads/") && !path.startsWith("view/")) continue;
      const uploaded = new Date(blob.uploadedAt).getTime();
      if (!uploaded || uploaded > cutoff) continue;
      if (used.has(path)) continue;
      stale.push(blob.url);
      if (stale.length >= LIMIT) break;
    }
    cursor = page.hasMore && stale.length < LIMIT ? page.cursor : undefined;
  } while (cursor);

  if (stale.length) await del(stale);
  return { deleted: stale.length, skipped: false };
}
