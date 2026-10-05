"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { screenWhere } from "@/lib/access";
import { requireSession, isSystemAdmin } from "@/lib/session";
import { nextCode, touchGroup, touchScreen } from "@/lib/publish";

async function gate() {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  return session;
}

async function ownerGate() {
  const session = await gate();
  if (!isSystemAdmin(session)) redirect("/admin");
  return session;
}

export async function createScreen(formData: FormData) {
  await gate();
  const screen = await prisma.screen.create({
    data: {
      name: String(formData.get("name") || "מסך חדש"),
      street: String(formData.get("street") || ""),
      number: String(formData.get("number") || ""),
      city: String(formData.get("city") || ""),
      code: await nextCode(),
    },
  });
  redirect(`/admin/screens/${screen.id}`);
}

export async function updateScreen(formData: FormData) {
  const session = await gate();
  const id = Number(formData.get("id"));
  const current = await prisma.screen.findUnique({ where: { id } });
  if (!current) redirect("/admin/buildings");
  const owner = isSystemAdmin(session);
  const incomingLogo = String(formData.get("logoUrl") || "");
  await prisma.screen.update({
    where: { id },
    data: {
      name: current.name,
      street: owner ? String(formData.get("street") || "") : current.street,
      number: owner ? String(formData.get("number") || "") : current.number,
      city: owner ? String(formData.get("city") || "") : current.city,
      theme: String(formData.get("theme") || "modern"),
      newsSource: String(formData.get("newsSource") || "ynet"),
      newsCount: Math.min(20, Math.max(1, Number(formData.get("newsCount")) || current.newsCount || 8)),
      tickerSeconds: Math.min(40, Math.max(6, Number(formData.get("tickerSeconds")) || current.tickerSeconds || 12)),
      newsTicker: ["on", "weekend", "off"].includes(String(formData.get("newsTicker"))) ? String(formData.get("newsTicker")) : "on",
      logoUrl: String(formData.get("clearLogo") || "") === "1" ? "" : incomingLogo.startsWith("http") ? incomingLogo : current.logoUrl,
    },
  });
  await touchScreen(id);
  redirect(`/admin/screens/${id}`);
}

export async function addNotice(formData: FormData) {
  await gate();
  const screenId = Number(formData.get("screenId"));
  const text = String(formData.get("text") || "").trim().slice(0, 120);
  if (text) await prisma.notice.create({ data: { screenId, text, active: true } });
  await touchScreen(screenId);
  redirect(`/admin/screens/${screenId}`);
}

export async function toggleNotice(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  const screenId = Number(formData.get("screenId"));
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (notice) await prisma.notice.update({ where: { id }, data: { active: !notice.active } });
  await touchScreen(screenId);
  redirect(`/admin/screens/${screenId}`);
}

export async function deleteNotice(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  const screenId = Number(formData.get("screenId"));
  await prisma.notice.delete({ where: { id } });
  await touchScreen(screenId);
  redirect(`/admin/screens/${screenId}`);
}

export async function updateNotice(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  const screenId = Number(formData.get("screenId"));
  const text = String(formData.get("text") || "").trim().slice(0, 120);
  if (text) await prisma.notice.update({ where: { id }, data: { text } });
  await touchScreen(screenId);
  redirect(`/admin/screens/${screenId}`);
}

export async function createGroup(formData: FormData) {
  await gate();
  const group = await prisma.screenGroup.create({
    data: {
      name: String(formData.get("name") || "קבוצה חדשה"),
      street: String(formData.get("street") || ""),
      number: String(formData.get("number") || ""),
      city: String(formData.get("city") || ""),
    },
  });
  redirect(`/admin/groups/${group.id}`);
}

export async function renameGroup(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  if (id && name) await prisma.screenGroup.update({ where: { id }, data: { name } });
  redirect("/admin");
}

export async function deleteGroup(formData: FormData) {
  await ownerGate();
  const id = Number(formData.get("id"));
  if (id) {
    await prisma.screen.deleteMany({ where: { groupId: id } });
    await prisma.screenGroup.delete({ where: { id } });
  }
  redirect("/admin");
}

export async function updateGroup(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  await prisma.screenGroup.update({
    where: { id },
    data: {
      name: String(formData.get("name") || ""),
      street: String(formData.get("street") || ""),
      number: String(formData.get("number") || ""),
      city: String(formData.get("city") || ""),
      theme: String(formData.get("theme") || "modern"),
      newsSource: String(formData.get("newsSource") || "ynet"),
      logoUrl: String(formData.get("logoUrl") || ""),
      musicUrl: String(formData.get("musicUrl") || ""),
      buildingId: Number(formData.get("buildingId")) || null,
    },
  });
  await touchGroup(id);
  redirect(`/admin/groups/${id}`);
}

export async function addAddress(formData: FormData) {
  await gate();
  const groupId = Number(formData.get("groupId"));
  const street = String(formData.get("street") || "").trim();
  const number = String(formData.get("number") || "").trim();
  const city = String(formData.get("city") || "").trim();
  if (!street && !city) redirect(`/admin/groups/${groupId}`);
  const place = [street, number].filter(Boolean).join(" ");
  const name = [place, city].filter(Boolean).join(", ");
  await prisma.screen.create({
    data: { name, groupId, street, number, city, code: await nextCode() },
  });
  redirect(`/admin/groups/${groupId}`);
}

function writtenAddress(street: string, number: string, city: string) {
  const place = [street, number].filter(Boolean).join(" ");
  return [place, city].filter(Boolean).join(", ");
}

export async function deleteAddress(formData: FormData) {
  await ownerGate();
  const groupId = Number(formData.get("groupId"));
  const screenId = Number(formData.get("screenId")) || 0;
  const label = String(formData.get("label") || "");
  const group = await prisma.screenGroup.findUnique({ where: { id: groupId } });
  if (!group) redirect("/admin");
  if (screenId) {
    const screen = await prisma.screen.findUnique({ where: { id: screenId } });
    if (screen && (screen.street || screen.number || screen.city)) {
      await prisma.screen.delete({ where: { id: screenId } });
    }
  }
  if (label && label === writtenAddress(group.street, group.number, group.city)) {
    await prisma.screenGroup.update({
      where: { id: groupId },
      data: { street: "", number: "", city: "" },
    });
  }
  redirect(`/admin/groups/${groupId}`);
}

export async function moveAddress(formData: FormData) {
  await ownerGate();
  const from = Number(formData.get("groupId"));
  const to = Number(formData.get("targetGroupId"));
  const screenId = Number(formData.get("screenId")) || 0;
  const label = String(formData.get("label") || "");
  if (!to || to === from) redirect(`/admin/groups/${from}`);
  const [fromGroup, target] = await Promise.all([
    prisma.screenGroup.findUnique({ where: { id: from } }),
    prisma.screenGroup.findUnique({ where: { id: to } }),
  ]);
  if (!fromGroup || !target) redirect(`/admin/groups/${from}`);
  const street = String(formData.get("street") || fromGroup.street);
  const number = String(formData.get("number") || fromGroup.number);
  const city = String(formData.get("city") || fromGroup.city);
  if (screenId) {
    await prisma.screen.update({
      where: { id: screenId },
      data: { groupId: to, street, number, city, name: label || street },
    });
    await touchScreen(screenId);
  } else {
    await prisma.screen.create({
      data: { groupId: to, street, number, city, name: label || "כתובת", code: await nextCode() },
    });
  }
  if (label && label === writtenAddress(fromGroup.street, fromGroup.number, fromGroup.city)) {
    await prisma.screenGroup.update({
      where: { id: from },
      data: { street: "", number: "", city: "" },
    });
  }
  redirect(`/admin/groups/${from}`);
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

export async function addGroupNotice(formData: FormData) {
  await gate();
  const groupId = Number(formData.get("groupId"));
  const text = String(formData.get("text") || "").trim().slice(0, 120);
  if (text) {
    await prisma.notice.create({ data: { groupId, text, active: true } });
    await touchGroup(groupId);
  }
  redirect(`/admin/groups/${groupId}`);
}

export async function toggleGroupNotice(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  const groupId = Number(formData.get("groupId"));
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (notice) await prisma.notice.update({ where: { id }, data: { active: !notice.active } });
  await touchGroup(groupId);
  redirect(`/admin/groups/${groupId}`);
}

export async function deleteGroupNotice(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  const groupId = Number(formData.get("groupId"));
  await prisma.notice.delete({ where: { id } });
  await touchGroup(groupId);
  redirect(`/admin/groups/${groupId}`);
}

export async function updateGroupNotice(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  const groupId = Number(formData.get("groupId"));
  const text = String(formData.get("text") || "").trim().slice(0, 120);
  if (text) await prisma.notice.update({ where: { id }, data: { text } });
  await touchGroup(groupId);
  redirect(`/admin/groups/${groupId}`);
}

export async function createListedScreen(formData: FormData) {
  await gate();
  const street = String(formData.get("street") || "").trim();
  const number = String(formData.get("number") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const groupId = Number(formData.get("groupId")) || null;
  const place = [street, number].filter(Boolean).join(" ");
  await prisma.screen.create({
    data: {
      name: [place, city].filter(Boolean).join(", ") || "מסך",
      street,
      number,
      city,
      groupId,
      code: await nextCode(),
    },
  });
  redirect("/admin/buildings");
}

export async function deleteListedScreen(formData: FormData) {
  await ownerGate();
  const id = Number(formData.get("id"));
  if (id) await prisma.screen.delete({ where: { id } });
  redirect("/admin/buildings");
}

export async function moveListedScreen(formData: FormData) {
  await ownerGate();
  const id = Number(formData.get("id"));
  const groupId = Number(formData.get("groupId")) || null;
  if (id) {
    await prisma.screen.update({ where: { id }, data: { groupId } });
    await touchScreen(id);
  }
  redirect("/admin/buildings");
}

export async function deleteBuilding(formData: FormData) {
  await gate();
  await prisma.building.delete({ where: { id: Number(formData.get("id")) } });
  redirect("/admin/buildings");
}

export async function addTicker(formData: FormData) {
  await gate();
  const groupId = Number(formData.get("groupId"));
  const text = String(formData.get("text") || "").trim();
  if (text) {
    await prisma.ticker.create({ data: { groupId, text, active: true } });
    await touchGroup(groupId);
  }
  redirect("/admin/tickers");
}

export async function deleteTicker(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  const ticker = await prisma.ticker.findUnique({ where: { id }, select: { groupId: true } });
  await prisma.ticker.delete({ where: { id } });
  if (ticker) await touchGroup(ticker.groupId);
  redirect("/admin/tickers");
}

export async function setMusic(formData: FormData) {
  const session = await gate();
  const playlist = String(formData.get("playlist") || "");
  const allowed = new Set(["", "off", "spa", "country", "jazz", "classical"]);
  if (!allowed.has(playlist) || !playlist) redirect("/admin/music");
  const where = await screenWhere(session);
  const ids = formData.getAll("screenId").map(Number).filter((id) => id > 0);
  const screens = await prisma.screen.findMany({
    where: { AND: [where, { id: { in: ids } }] },
    select: { id: true },
  });
  if (screens.length) {
    await prisma.screen.updateMany({
      where: { id: { in: screens.map((screen) => screen.id) } },
      data: { musicPlaylist: playlist },
    });
    for (const screen of screens) await touchScreen(screen.id);
  }
  redirect("/admin/music");
}

export async function saveFeed(formData: FormData) {
  await gate();
  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const url = String(formData.get("url") || "").trim();
  if (id && name && url) await prisma.feed.upsert({ where: { id }, update: { name, url }, create: { id, name, url } });
  redirect("/admin/news");
}

export async function deleteFeed(formData: FormData) {
  await gate();
  await prisma.feed.delete({ where: { id: String(formData.get("id") || "") } });
  redirect("/admin/news");
}

export async function addFloor(formData: FormData) {
  await gate();
  const groupId = Number(formData.get("groupId"));
  await prisma.floor.create({
    data: { groupId, name: String(formData.get("name") || "קומה") },
  });
  await touchGroup(groupId);
  redirect("/admin/directory");
}

export async function addRoom(formData: FormData) {
  await gate();
  const floorId = Number(formData.get("floorId"));
  await prisma.room.create({
    data: {
      floorId,
      name: String(formData.get("name") || "חדר"),
      detail: String(formData.get("detail") || ""),
    },
  });
  const floor = await prisma.floor.findUnique({ where: { id: floorId }, select: { groupId: true } });
  if (floor) await touchGroup(floor.groupId);
  redirect("/admin/directory");
}

export async function deleteFloor(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  const floor = await prisma.floor.findUnique({ where: { id }, select: { groupId: true } });
  await prisma.floor.delete({ where: { id } });
  if (floor) await touchGroup(floor.groupId);
  redirect("/admin/directory");
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
