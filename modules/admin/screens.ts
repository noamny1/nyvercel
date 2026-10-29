import { redirect } from "next/navigation";
import { prisma } from "@/modules/data/prisma";
import { officialCity } from "@/modules/place/cities";
import { musicClock, musicDaysField } from "@/modules/music/hours";
import { screenWhere } from "@/modules/identity/access";
import { isSystemAdmin } from "@/modules/identity/session";
import { nextCode, touchScreen } from "@/modules/data/publish";
import { normalizePlaylists } from "@/modules/music/catalog";
import { floorCaption, floorPace, savedTheme } from "@/modules/slides/themes";
import { chosenNews, gate, ownerGate, safeReturn } from "@/modules/admin/gate";

export async function createScreen(formData: FormData) {
  await gate();
  const screen = await prisma.screen.create({
    data: {
      name: String(formData.get("name") || "מסך חדש"),
      street: String(formData.get("street") || ""),
      number: String(formData.get("number") || ""),
      city: officialCity(String(formData.get("city") || "")),
      code: await nextCode(),
    },
  });
  redirect(`/admin/screens/${screen.id}`);
}
export async function updateScreen(formData: FormData) {
  const session = await gate();
  const id = Number(formData.get("id"));
  const current = await prisma.screen.findFirst({ where: { id, ...(await screenWhere(session)) } });
  if (!current) redirect("/admin/buildings");
  const owner = isSystemAdmin(session);
  const street = owner ? String(formData.get("street") || "") : current.street;
  const number = owner ? String(formData.get("number") || "") : current.number;
  const city = owner ? officialCity(String(formData.get("city") || "")) : current.city;
  const place = [street, number].filter(Boolean).join(" ");
  const incomingLogo = String(formData.get("logoUrl") || "");
  const musicForm = Boolean(formData.get("musicForm"));
  const musicAlways = musicForm && formData.get("musicAlways") === "1";
  const music = musicForm ? normalizePlaylists(formData.getAll("music").map(String)) : current.musicPlaylist;
  const musicDays = !musicForm ? current.musicDays : musicAlways ? "24/7" : musicDaysField(formData.getAll("musicDay").map(String));
  const musicFrom = musicForm && !musicAlways ? musicClock(String(formData.get("musicFrom") || ""), "07:00") : current.musicFrom;
  const musicUntil = musicForm && !musicAlways ? musicClock(String(formData.get("musicUntil") || ""), "22:30") : current.musicUntil;
  await prisma.screen.update({
    where: { id },
    data: {
      name: [place, city].filter(Boolean).join(", ") || current.name,
      street,
      number,
      city,
      floor: owner && formData.has("floor") ? (String(formData.get("floor") || "").trim().slice(0, 40) || "לובי") : current.floor,
      theme: owner ? await savedTheme(String(formData.get("theme") || current.theme), current.theme, true) : current.theme,
      newsSource: chosenNews(formData),
      newsCount: owner ? Math.min(20, Math.max(1, Number(formData.get("newsCount")) || current.newsCount || 8)) : current.newsCount,
      tickerSeconds: owner ? Math.min(40, Math.max(6, Number(formData.get("tickerSeconds")) || current.tickerSeconds || 12)) : current.tickerSeconds,
      ...(owner && formData.has("floorPace") ? { floorPace: floorPace(formData.get("floorPace")), floorCaption: floorCaption(formData.get("floorCaption")) } : {}),
      newsTicker: ["on", "weekend", "off"].includes(String(formData.get("newsTicker"))) ? String(formData.get("newsTicker")) : "on",
      ...( ["news", "notices", "both"].includes(String(formData.get("feedMode"))) ? { feedMode: String(formData.get("feedMode")) } : {}),
      musicPlaylist: music,
      musicDays,
      musicFrom,
      musicUntil,
      logoUrl: String(formData.get("clearLogo") || "") === "1" ? "" : incomingLogo.startsWith("http") ? incomingLogo : current.logoUrl,
      faultPhone: String(formData.get("faultPhone") || "").trim().slice(0, 40),
      faultLink: String(formData.get("faultLink") || "").trim().slice(0, 300),
      faultQrUrl: String(formData.get("clearFaultQr") || "") === "1" ? "" : String(formData.get("faultQrUrl") || "").startsWith("http") ? String(formData.get("faultQrUrl") || "") : current.faultQrUrl,
    },
  });
  if (String(formData.get("applyMusic") || "") === "1") {
    const peers = await prisma.screen.findMany({
      where: owner
        ? { users: { some: { screens: { some: { id } } } } }
        : await screenWhere(session),
      select: { id: true },
    });
    const ids = peers.map((screen) => screen.id).filter((peer) => peer !== id);
    if (ids.length) {
      await prisma.screen.updateMany({ where: { id: { in: ids } }, data: { musicPlaylist: music, musicDays, musicFrom, musicUntil } });
      for (const peer of ids) await touchScreen(peer);
    }
  }
  await touchScreen(id);
  redirect(safeReturn(formData, `/admin/screens/${id}`));
}
export async function addNotice(formData: FormData) {
  await gate();
  const screenId = Number(formData.get("screenId"));
  const text = String(formData.get("text") || "").trim().slice(0, 120);
  if (text) await prisma.notice.create({ data: { screenId, text, active: true } });
  await touchScreen(screenId);
  redirect(safeReturn(formData, `/admin/screens/${screenId}`));
}
export async function toggleNotice(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  const screenId = Number(formData.get("screenId"));
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (notice) await prisma.notice.update({ where: { id }, data: { active: !notice.active } });
  await touchScreen(screenId);
  redirect(safeReturn(formData, `/admin/screens/${screenId}`));
}
export async function deleteNotice(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  const screenId = Number(formData.get("screenId"));
  await prisma.notice.delete({ where: { id } });
  await touchScreen(screenId);
  redirect(safeReturn(formData, `/admin/screens/${screenId}`));
}
export async function updateNotice(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  const screenId = Number(formData.get("screenId"));
  const text = String(formData.get("text") || "").trim().slice(0, 120);
  if (text) await prisma.notice.update({ where: { id }, data: { text } });
  await touchScreen(screenId);
  redirect(safeReturn(formData, `/admin/screens/${screenId}`));
}
export async function removeScreen(formData: FormData) {
  await ownerGate();
  const id = Number(formData.get("id"));
  const groupId = Number(formData.get("groupId"));
  await prisma.screen.delete({ where: { id } });
  redirect(`/admin/groups/${groupId}`);
}
export async function moveScreen(formData: FormData) {
  await ownerGate();
  const id = Number(formData.get("id"));
  const from = Number(formData.get("groupId"));
  const to = Number(formData.get("targetGroupId"));
  if (!to || to === from) redirect(`/admin/groups/${from}`);
  const fromGroup = await prisma.screenGroup.findUnique({ where: { id: from } });
  const screen = await prisma.screen.findUnique({ where: { id } });
  if (!fromGroup || !screen) redirect(`/admin/groups/${from}`);
  const target = await prisma.screenGroup.findUnique({ where: { id: to } });
  if (!target) redirect(`/admin/groups/${from}`);
  await prisma.screen.update({
    where: { id },
    data: {
      groupId: to,
      street: screen.street || fromGroup.street,
      number: screen.number || fromGroup.number,
      city: screen.city || fromGroup.city,
    },
  });
  await touchScreen(id);
  redirect(`/admin/groups/${from}`);
}
export async function saveUpdate(formData: FormData) {
  const session = await gate();
  const id = Number(formData.get("id")) || 0;
  const returnId = Number(formData.get("returnId"));
  const text = String(formData.get("text") || "").trim();
  const requested = formData.getAll("screenId").map(Number).filter(Boolean);
  const allowed = await prisma.screen.findMany({ where: await screenWhere(session), select: { id: true } });
  const allowedIds = new Set(allowed.map((screen) => screen.id));
  const screenIds = requested.filter((screenId) => allowedIds.has(screenId));
  if (!text || !screenIds.length) redirect(`/admin/screens/${returnId}/updates`);
  const links = screenIds.map((screenId) => ({ id: screenId }));
  if (id) await prisma.update.update({ where: { id }, data: { text, screens: { set: links } } });
  else await prisma.update.create({ data: { text, active: true, screens: { connect: links } } });
  for (const screenId of screenIds) await touchScreen(screenId);
  redirect(`/admin/screens/${returnId}`);
}
export async function deleteUpdate(formData: FormData) {
  const session = await gate();
  const id = Number(formData.get("id"));
  const returnId = Number(formData.get("returnId"));
  const allowed = await prisma.screen.findMany({ where: await screenWhere(session), select: { id: true } });
  const allowedIds = new Set(allowed.map((screen) => screen.id));
  const update = id ? await prisma.update.findUnique({ where: { id }, include: { screens: { select: { id: true } } } }) : null;
  if (update && update.screens.every((screen) => allowedIds.has(screen.id))) {
    await prisma.update.delete({ where: { id } });
    for (const screen of update.screens) await touchScreen(screen.id);
  }
  redirect(`/admin/screens/${returnId}`);
}
