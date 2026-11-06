import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { del, list, put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { touchScreen } from "@/modules/data/publish";

const LATEST = "backups/latest.bin";
const KEEP_MS = 21 * 24 * 60 * 60 * 1000;

type BackupSlide = {
  imageUrl: string;
  kind?: string;
  templateId?: string;
  title?: string;
  detail?: string;
  meta?: string;
  sort?: number;
  duration?: number;
  active?: boolean;
  weekdays?: string;
  startsOn?: string;
  endsOn?: string;
};

type BackupNotice = { text: string; active?: boolean };
type BackupUpdate = { id?: number; text: string; active?: boolean };
type BackupRoom = { name: string; detail?: string; logoUrl?: string };
type BackupFloor = { name: string; rooms?: BackupRoom[] };

export type BackupScreen = {
  id: number;
  code: number | null;
  name: string;
  street: string;
  number: string;
  city: string;
  floor: string;
  listSort?: number;
  theme: string;
  logoUrl: string;
  faultPhone?: string;
  faultLink?: string;
  faultQrUrl?: string;
  newsSource?: string;
  newsCount?: number;
  tickerSeconds?: number;
  floorPace?: number;
  floorCaption?: string;
  newsTicker?: string;
  feedMode?: string;
  groupId: number | null;
  active?: boolean;
  musicPlaylist?: string;
  musicDays?: string;
  musicFrom?: string;
  musicUntil?: string;
  userIds?: number[];
  slides?: BackupSlide[];
  notices?: BackupNotice[];
  updates?: BackupUpdate[];
  floors?: BackupFloor[];
};

export type BackupFile = {
  at?: string;
  screens?: BackupScreen[];
  groups?: unknown[];
  buildings?: unknown[];
  users?: unknown[];
  feeds?: unknown[];
  flags?: unknown[];
};

function secret() {
  return process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET || "";
}

function pack(body: Buffer) {
  const key = createHash("sha256").update(secret()).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(body), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]);
}

export function unpack(packed: Buffer): BackupFile {
  const key = createHash("sha256").update(secret()).digest();
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const data = packed.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8"));
}

const slideSelect = {
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
} as const;

const floorSelect = {
  name: true,
  rooms: { select: { name: true, detail: true, logoUrl: true } },
} as const;

export async function snapshot() {
  const [screens, groups, buildings, users, feeds, flags] = await Promise.all([
    prisma.screen.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        street: true,
        number: true,
        city: true,
        floor: true,
        listSort: true,
        theme: true,
        logoUrl: true,
        faultPhone: true,
        faultLink: true,
        faultQrUrl: true,
        newsSource: true,
        newsCount: true,
        tickerSeconds: true,
        floorPace: true,
        floorCaption: true,
        newsTicker: true,
        feedMode: true,
        groupId: true,
        active: true,
        musicPlaylist: true,
        musicDays: true,
        musicFrom: true,
        musicUntil: true,
        users: { select: { id: true } },
        slides: { select: slideSelect },
        notices: { select: { text: true, active: true } },
        updates: { select: { id: true, text: true, active: true } },
        floors: { select: floorSelect },
      },
    }),
    prisma.screenGroup.findMany({
      select: {
        id: true,
        name: true,
        street: true,
        number: true,
        city: true,
        theme: true,
        logoUrl: true,
        faultPhone: true,
        faultLink: true,
        faultQrUrl: true,
        promoUrl: true,
        promoSeconds: true,
        newsSource: true,
        musicUrl: true,
        floorPace: true,
        floorCaption: true,
        buildingId: true,
        groupLinks: { select: { userId: true } },
        slides: { select: slideSelect },
        notices: { select: { text: true, active: true } },
        tickers: { select: { text: true, active: true } },
        floors: { select: floorSelect },
      },
    }),
    prisma.building.findMany(),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        passwordCopy: true,
        totpSecret: true,
        totpPending: true,
        screens: { select: { id: true } },
        groupLinks: { select: { groupId: true } },
      },
    }),
    prisma.feed.findMany(),
    prisma.systemFlag.findMany(),
  ]);
  return {
    at: new Date().toISOString(),
    screens: screens.map((screen) => ({
      ...screen,
      userIds: screen.users.map((user) => user.id),
      users: undefined,
    })),
    groups,
    buildings,
    users,
    feeds,
    flags,
  };
}

export async function saveBackup() {
  if (!secret()) throw new Error("missing-secret");
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("missing-blob");
  const body = await snapshot();
  const packed = pack(Buffer.from(JSON.stringify(body)));
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const dated = await put(`backups/${stamp}.bin`, packed, {
    access: "public",
    addRandomSuffix: true,
    contentType: "application/octet-stream",
  });
  const previous = await list({ prefix: "backups/" });
  await Promise.all(
    previous.blobs.filter((item) => item.pathname === LATEST).map((item) => del(item.url)),
  );
  await put(LATEST, packed, {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/octet-stream",
  });
  const cutoff = Date.now() - KEEP_MS;
  const again = await list({ prefix: "backups/" });
  await Promise.all(
    again.blobs
      .filter((item) => item.pathname !== LATEST && item.pathname !== dated.pathname && item.uploadedAt && new Date(item.uploadedAt).getTime() < cutoff)
      .map((item) => del(item.url)),
  );
  return { at: body.at, screens: body.screens.length, groups: body.groups.length, bytes: packed.length, copy: dated.pathname };
}

export async function listBackups() {
  const rows = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "backups/", cursor, limit: 1000 });
    rows.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return rows
    .filter((item) => item.pathname !== LATEST && item.pathname.endsWith(".bin"))
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export async function restoreScreen(code: number, url: string, restoreUsers: boolean) {
  const packed = Buffer.from(await (await fetch(url)).arrayBuffer());
  const file = unpack(packed);
  const saved = (file.screens || []).find((screen) => screen.code === code);
  if (!saved) return { error: "המסך לא נמצא בגיבוי הזה" };
  const live = await prisma.screen.findUnique({ where: { code }, select: { id: true } });
  if (!live) return { error: "המסך לא נמצא עכשיו" };
  const userIds = restoreUsers
    ? (await prisma.user.findMany({ where: { id: { in: saved.userIds || [] } }, select: { id: true } })).map((user) => user.id)
    : [];
  const updateIds: number[] = [];
  for (const update of saved.updates || []) {
    const exists = update.id ? await prisma.update.findUnique({ where: { id: update.id }, select: { id: true } }) : null;
    if (exists) updateIds.push(exists.id);
    else {
      const created = await prisma.update.create({
        data: { text: update.text, active: update.active !== false, screens: { connect: { id: live.id } } },
        select: { id: true },
      });
      updateIds.push(created.id);
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.slide.deleteMany({ where: { screenId: live.id } });
    await tx.notice.deleteMany({ where: { screenId: live.id } });
    await tx.floor.deleteMany({ where: { screenId: live.id } });
    if (saved.slides?.length) {
      await tx.slide.createMany({
        data: saved.slides.map((slide) => ({
          screenId: live.id,
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
      });
    }
    if (saved.notices?.length) {
      await tx.notice.createMany({
        data: saved.notices.map((notice) => ({
          screenId: live.id,
          text: notice.text,
          active: notice.active !== false,
        })),
      });
    }
    for (const floor of saved.floors || []) {
      await tx.floor.create({
        data: {
          screenId: live.id,
          name: floor.name,
          rooms: { create: (floor.rooms || []).map((room) => ({ name: room.name, detail: room.detail || "", logoUrl: room.logoUrl || "" })) },
        },
      });
    }
    await tx.screen.update({
      where: { id: live.id },
      data: {
        name: saved.name,
        street: saved.street,
        number: saved.number,
        city: saved.city,
        floor: saved.floor || "לובי",
        listSort: saved.listSort || 0,
        theme: saved.theme,
        logoUrl: saved.logoUrl || "",
        faultPhone: saved.faultPhone || "",
        faultLink: saved.faultLink || "",
        faultQrUrl: saved.faultQrUrl || "",
        newsSource: saved.newsSource || "ynet",
        newsCount: saved.newsCount || 8,
        tickerSeconds: saved.tickerSeconds || 12,
        floorPace: saved.floorPace || 28,
        floorCaption: saved.floorCaption || "name",
        newsTicker: saved.newsTicker || "on",
        feedMode: saved.feedMode || "both",
        active: saved.active !== false,
        musicPlaylist: saved.musicPlaylist || "",
        musicDays: saved.musicDays || "0,1,2,3,4",
        musicFrom: saved.musicFrom || "07:00",
        musicUntil: saved.musicUntil || "22:30",
        updates: { set: updateIds.map((id) => ({ id })) },
        ...(restoreUsers ? { users: { set: userIds.map((id) => ({ id })) } } : {}),
      },
    });
  });
  await touchScreen(live.id);
  return { ok: true, slides: saved.slides?.length || 0, notices: saved.notices?.length || 0, at: file.at || "" };
}
