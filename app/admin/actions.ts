"use server";

import { redirect } from "next/navigation";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { screenWhere } from "@/lib/access";
import { requireSession, isSystemAdmin } from "@/lib/session";
import { nextCode, touchGroup, touchScreen } from "@/lib/publish";
import { normalizePlaylists } from "@/lib/music-catalog";
import { savedTheme } from "@/lib/themes";

async function gate() {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  return session;
}

function chosenNews(formData: FormData) {
  const ids = [...new Set(formData.getAll("newsSource").map((value) => String(value).trim()).filter(Boolean))].slice(0, 4);
  return ids.join(",") || "ynet";
}

function safeReturn(formData: FormData, fallback: string) {
  const back = String(formData.get("returnTo") || "");
  return back.startsWith("/admin/buildings") ? back : fallback;
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
  const current = await prisma.screen.findFirst({ where: { id, ...(await screenWhere(session)) } });
  if (!current) redirect("/admin/buildings");
  const owner = isSystemAdmin(session);
  const incomingLogo = String(formData.get("logoUrl") || "");
  const music = formData.get("musicForm") ? normalizePlaylists(formData.getAll("music").map(String)) : current.musicPlaylist;
  await prisma.screen.update({
    where: { id },
    data: {
      name: current.name,
      street: owner ? String(formData.get("street") || "") : current.street,
      number: owner ? String(formData.get("number") || "") : current.number,
      city: owner ? String(formData.get("city") || "") : current.city,
      floor: owner && formData.has("floor") ? (String(formData.get("floor") || "").trim().slice(0, 40) || "לובי") : current.floor,
      theme: await savedTheme(String(formData.get("theme") || "modern"), current.theme, owner),
      newsSource: chosenNews(formData),
      newsCount: owner ? Math.min(20, Math.max(1, Number(formData.get("newsCount")) || current.newsCount || 8)) : current.newsCount,
      tickerSeconds: owner ? Math.min(40, Math.max(6, Number(formData.get("tickerSeconds")) || current.tickerSeconds || 12)) : current.tickerSeconds,
      newsTicker: ["on", "weekend", "off"].includes(String(formData.get("newsTicker"))) ? String(formData.get("newsTicker")) : "on",
      ...( ["news", "notices", "both"].includes(String(formData.get("feedMode"))) ? { feedMode: String(formData.get("feedMode")) } : {}),
      musicPlaylist: music,
      logoUrl: String(formData.get("clearLogo") || "") === "1" ? "" : incomingLogo.startsWith("http") ? incomingLogo : current.logoUrl,
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
      await prisma.screen.updateMany({ where: { id: { in: ids } }, data: { musicPlaylist: music } });
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

async function fallbackLogo() {
  const starter = await starterScreen();
  return starter?.logoUrl || starter?.group?.logoUrl || "";
}

export async function createGroup(formData: FormData) {
  await gate();
  const group = await prisma.screenGroup.create({
    data: {
      name: String(formData.get("name") || "קבוצה חדשה"),
      street: String(formData.get("street") || ""),
      number: String(formData.get("number") || ""),
      city: String(formData.get("city") || ""),
      logoUrl: await fallbackLogo(),
    },
  });
  redirect(`/admin/groups/${group.id}`);
}

export async function setGroupLogo(formData: FormData) {
  await ownerGate();
  const id = Number(formData.get("id"));
  const file = formData.get("file");
  if (!id || !(file instanceof File) || !file.size || !file.type.startsWith("image/")) redirect("/admin");
  if (!process.env.BLOB_READ_WRITE_TOKEN) redirect("/admin");
  const blob = await put(`uploads/${Date.now()}-${file.name}`, file, { access: "public", contentType: file.type || "image/gif" });
  await prisma.screenGroup.update({ where: { id }, data: { logoUrl: blob.url } });
  await prisma.screen.updateMany({ where: { groupId: id }, data: { logoUrl: blob.url } });
  await touchGroup(id);
  redirect("/admin");
}

export async function syncGroupLogos(groups: { id: number; logoUrl: string }[]) {
  for (const group of groups) {
    if (!group.logoUrl) continue;
    const changed = await prisma.screen.updateMany({
      where: { groupId: group.id, NOT: { logoUrl: group.logoUrl } },
      data: { logoUrl: group.logoUrl },
    });
    if (changed.count) await touchGroup(group.id);
  }
}

export async function setGroupPromo(formData: FormData) {
  await ownerGate();
  const id = Number(formData.get("id"));
  const url = String(formData.get("url") || "");
  const duration = Math.max(8, Math.min(60, Math.round(Number(formData.get("duration")) || 20)));
  if (!id || !/^https:\/\/.+\.mp4(\?|$)/i.test(url)) redirect("/admin");
  await prisma.screenGroup.update({ where: { id }, data: { promoUrl: url, promoSeconds: duration } });
  await spreadGroupPromo(id, url, duration);
  redirect("/admin");
}

async function spreadGroupPromo(groupId: number, url: string, duration: number) {
  const screens = await prisma.screen.findMany({ where: { groupId }, select: { id: true } });
  if (!screens.length) {
    await touchGroup(groupId);
    return;
  }
  const ids = screens.map((screen) => screen.id);
  const existing = await prisma.slide.findMany({
    where: { screenId: { in: ids }, templateId: "group-promo" },
    select: { screenId: true },
  });
  const have = new Set(existing.map((slide) => slide.screenId));
  if (have.size) {
    await prisma.slide.updateMany({
      where: { screenId: { in: [...have].filter((id): id is number => id != null) }, templateId: "group-promo" },
      data: { imageUrl: url, duration, active: true, weekdays: "0123456", title: "", detail: "" },
    });
  }
  const missing = ids.filter((id) => !have.has(id));
  if (missing.length) {
    await prisma.slide.createMany({
      data: missing.map((screenId) => ({
        screenId,
        imageUrl: url,
        kind: "image",
        templateId: "group-promo",
        duration,
        weekdays: "0123456",
        sort: 1000,
        active: true,
      })),
    });
  }
  await touchGroup(groupId);
}

export async function setGroupUser(formData: FormData) {
  await ownerGate();
  const id = Number(formData.get("id"));
  const userId = Number(formData.get("userId")) || 0;
  if (!id || !userId) redirect("/admin");
  const user = await prisma.user.findFirst({ where: { id: userId, role: "client" }, select: { id: true } });
  if (!user) redirect("/admin");
  const screens = await prisma.screen.findMany({ where: { groupId: id }, select: { id: true } });
  await prisma.groupManager.upsert({
    where: { groupId_userId: { groupId: id, userId: user.id } },
    create: { groupId: id, userId: user.id },
    update: {},
  });
  if (screens.length) {
    await prisma.user.update({
      where: { id: user.id },
      data: { screens: { connect: screens.map((screen) => ({ id: screen.id })) } },
    });
  }
  redirect("/admin");
}

export async function removeGroupUser(formData: FormData) {
  await ownerGate();
  const id = Number(formData.get("id"));
  const userId = Number(formData.get("userId")) || 0;
  if (!id || !userId) redirect("/admin");
  const screens = await prisma.screen.findMany({ where: { groupId: id }, select: { id: true } });
  await prisma.groupManager.deleteMany({ where: { groupId: id, userId } });
  if (screens.length) {
    await prisma.user.update({
      where: { id: userId },
      data: { screens: { disconnect: screens.map((screen) => ({ id: screen.id })) } },
    });
  }
  redirect("/admin");
}

export async function renameGroup(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  if (id && name) await prisma.screenGroup.update({ where: { id }, data: { name } });
  redirect(id ? `/admin/groups/${id}` : "/admin");
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
  const session = await gate();
  const id = Number(formData.get("id"));
  const current = await prisma.screenGroup.findUnique({ where: { id } });
  if (!current) redirect("/admin");
  await prisma.screenGroup.update({
    where: { id },
    data: {
      name: String(formData.get("name") || ""),
      street: String(formData.get("street") || ""),
      number: String(formData.get("number") || ""),
      city: String(formData.get("city") || ""),
      theme: await savedTheme(String(formData.get("theme") || "modern"), current.theme, isSystemAdmin(session)),
      newsSource: chosenNews(formData),
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
    await adoptGroup(screenId, to);
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

async function starterScreen() {
  const name = "נועם בדיקה 33";
  const found = await prisma.screen.findMany({
    where: {
      OR: [
        { name },
        { name: { startsWith: `${name},` } },
        { street: "נועם בדיקה", number: "33" },
      ],
    },
    include: {
      slides: { orderBy: { sort: "asc" } },
      notices: { orderBy: { id: "asc" } },
      group: { include: { slides: { orderBy: { sort: "asc" } }, notices: { orderBy: { id: "asc" } } } },
    },
  });
  return found.find((screen) => screen.name === name) || found[0] || null;
}

async function adoptGroup(screenId: number, groupId: number) {
  const [target, starter] = await Promise.all([
    prisma.screenGroup.findUnique({ where: { id: groupId }, select: { logoUrl: true, promoUrl: true, promoSeconds: true, groupLinks: { select: { userId: true } } } }),
    starterScreen(),
  ]);
  const slides = starter && starter.slides.length > 0 ? starter.slides : starter?.group?.slides || [];
  const last = await prisma.screen.aggregate({ where: { groupId }, _max: { listSort: true } });
  await prisma.$transaction([
    prisma.slide.deleteMany({ where: { screenId } }),
    prisma.notice.deleteMany({ where: { screenId } }),
    ...(slides.length
      ? [prisma.slide.createMany({
          data: slides.map((slide) => ({
            screenId,
            imageUrl: slide.imageUrl,
            kind: slide.kind,
            templateId: slide.templateId,
            title: slide.title,
            detail: slide.detail,
            meta: slide.meta,
            sort: slide.sort,
            duration: slide.duration,
            active: slide.active,
            weekdays: slide.weekdays,
            startsOn: slide.startsOn,
            endsOn: slide.endsOn,
          })),
        })]
      : []),
    prisma.screen.update({
      where: { id: screenId },
      data: { groupId, logoUrl: target?.logoUrl || "", listSort: (last._max.listSort || 0) + 1, users: { set: (target?.groupLinks || []).map((link) => ({ id: link.userId })) } },
    }),
  ]);
  await touchScreen(screenId);
  if (target?.promoUrl) {
    await prisma.slide.create({
      data: {
        screenId,
        imageUrl: target.promoUrl,
        kind: "image",
        templateId: "group-promo",
        duration: target.promoSeconds || 20,
        weekdays: "0123456",
        sort: 1000,
        active: true,
      },
    });
    await touchScreen(screenId);
  }
}

export async function reorderGroupScreens(formData: FormData) {
  const session = await gate();
  const groupId = Number(formData.get("groupId"));
  const submitted = formData.getAll("id").map(Number).filter(Boolean);
  if (!groupId || !submitted.length) return;
  const visible = new Set((await prisma.screen.findMany({
    where: { id: { in: submitted }, groupId, ...(await screenWhere(session)) },
    select: { id: true },
  })).map((screen) => screen.id));
  const ordered = submitted.filter((id) => visible.has(id));
  const screens = await prisma.screen.findMany({
    where: { groupId },
    orderBy: [{ listSort: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  let index = 0;
  const next = screens.map((screen) => (visible.has(screen.id) ? ordered[index++] : screen.id)).filter((id): id is number => Boolean(id));
  await prisma.$transaction(next.map((id, sort) => prisma.screen.update({ where: { id }, data: { listSort: sort + 1 } })));
}

export async function createListedScreen(formData: FormData) {
  await gate();
  const street = String(formData.get("street") || "").trim();
  const number = String(formData.get("number") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const floor = String(formData.get("floor") || "").trim().slice(0, 40) || "לובי";
  const groupId = Number(formData.get("groupId")) || null;
  const place = [street, number].filter(Boolean).join(" ");
  const starter = await starterScreen();
  const slides = starter && starter.slides.length > 0 ? starter.slides : starter?.group?.slides || [];
  const notices = starter && starter.notices.length > 0 ? starter.notices : starter?.group?.notices || [];
  const managers = groupId
    ? await prisma.groupManager.findMany({ where: { groupId, user: { role: "client" } }, select: { userId: true } })
    : [];
  const groupRow = groupId
    ? await prisma.screenGroup.findUnique({ where: { id: groupId }, select: { promoUrl: true, promoSeconds: true, logoUrl: true } })
    : null;
  const last = groupId ? await prisma.screen.aggregate({ where: { groupId }, _max: { listSort: true } }) : null;
  await prisma.screen.create({
    data: {
      name: [place, city].filter(Boolean).join(", ") || "מסך",
      street,
      number,
      city,
      floor,
      listSort: (last?._max.listSort || 0) + 1,
      groupId,
      code: await nextCode(),
      theme: starter?.theme || starter?.group?.theme || "modern",
      logoUrl: groupRow?.logoUrl || starter?.logoUrl || starter?.group?.logoUrl || "",
      newsSource: starter?.newsSource || starter?.group?.newsSource || "ynet",
      newsCount: starter?.newsCount || 8,
      tickerSeconds: starter?.tickerSeconds || 12,
      newsTicker: starter?.newsTicker || "on",
      feedMode: starter?.feedMode || "both",
      musicPlaylist: starter?.musicPlaylist || "",
      ...(managers.length ? { users: { connect: managers.map((link) => ({ id: link.userId })) } } : {}),
      slides: {
        create: [
          ...slides.map((slide) => ({
            imageUrl: slide.imageUrl,
            kind: slide.kind,
            templateId: slide.templateId,
            title: slide.title,
            detail: slide.detail,
            meta: slide.meta,
            sort: slide.sort,
            duration: slide.duration,
            active: slide.active,
            weekdays: slide.weekdays,
            startsOn: slide.startsOn,
            endsOn: slide.endsOn,
          })),
          ...(groupRow?.promoUrl ? [{
            imageUrl: groupRow.promoUrl,
            kind: "image",
            templateId: "group-promo",
            title: "",
            detail: "",
            meta: "",
            sort: 1000,
            duration: groupRow.promoSeconds || 20,
            active: true,
            weekdays: "0123456",
            startsOn: "",
            endsOn: "",
          }] : []),
        ],
      },
      notices: {
        create: notices.map((notice) => ({ text: notice.text, active: notice.active })),
      },
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
  if (id && groupId) await adoptGroup(id, groupId);
  else if (id) {
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
  const allowed = new Set(["off", "spa", "country", "jazz", "classical", "lounge"]);
  const parts = playlist.split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length || parts.some((part) => !allowed.has(part))) redirect("/admin/music");
  const where = await screenWhere(session);
  const ids = formData.getAll("screenId").map(Number).filter((id) => id > 0);
  const screens = await prisma.screen.findMany({
    where: { AND: [where, { id: { in: ids } }] },
    select: { id: true },
  });
  if (screens.length) {
    await prisma.screen.updateMany({
      where: { id: { in: screens.map((screen) => screen.id) } },
      data: { musicPlaylist: parts.join(",") },
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
