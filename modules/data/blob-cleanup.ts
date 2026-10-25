import { del, list } from "@vercel/blob";
import { prisma } from "@/modules/data/prisma";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const LIMIT = 150;

export type UnusedFile = {
  path: string;
  name: string;
  bytes: number;
  days: number;
};

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

async function usedPaths() {
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
  return used;
}

async function staleBlobs(used: Set<string>) {
  const cutoff = Date.now() - WEEK;
  const found: { path: string; url: string; bytes: number; days: number }[] = [];
  let cursor: string | undefined;
  let more = false;
  do {
    const page = await list({ cursor, limit: 1000 });
    for (const blob of page.blobs) {
      const path = blob.pathname.replace(/^\/+/, "");
      if (path.startsWith("backups/") || path.endsWith(".apk")) continue;
      if (!path.startsWith("uploads/") && !path.startsWith("view/")) continue;
      const uploaded = new Date(blob.uploadedAt).getTime();
      if (!uploaded || uploaded > cutoff) continue;
      if (used.has(path)) continue;
      if (found.length >= LIMIT) {
        more = true;
        break;
      }
      found.push({
        path,
        url: blob.url,
        bytes: blob.size,
        days: Math.max(7, Math.floor((Date.now() - uploaded) / 86400000)),
      });
    }
    cursor = page.hasMore && !more ? page.cursor : undefined;
  } while (cursor);
  return { found, more };
}

export async function previewUnusedBlobs() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { files: [] as UnusedFile[], more: false, missing: true };
  const { found, more } = await staleBlobs(await usedPaths());
  return {
    files: found.map((file) => ({
      path: file.path,
      name: file.path.split("/").pop() || file.path,
      bytes: file.bytes,
      days: file.days,
    })),
    more,
    missing: false,
  };
}

export async function deleteUnusedBlobs(paths: string[]) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { deleted: 0 };
  const wanted = new Set(paths.filter((path) => path.startsWith("uploads/") || path.startsWith("view/")));
  if (!wanted.size) return { deleted: 0 };
  const { found } = await staleBlobs(await usedPaths());
  const urls = found.filter((file) => wanted.has(file.path)).map((file) => file.url);
  if (urls.length) await del(urls);
  return { deleted: urls.length };
}
