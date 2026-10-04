"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession, isSystemAdmin } from "@/lib/session";

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
    },
  });
  redirect(`/admin/screens/${screen.id}`);
}

export async function updateScreen(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  await prisma.screen.update({
    where: { id },
    data: {
      name: String(formData.get("name") || ""),
      street: String(formData.get("street") || ""),
      number: String(formData.get("number") || ""),
      city: String(formData.get("city") || ""),
      theme: String(formData.get("theme") || "modern"),
      newsSource: String(formData.get("newsSource") || "ynet"),
      logoUrl: String(formData.get("logoUrl") || ""),
    },
  });
  redirect(`/admin/screens/${id}`);
}

export async function addNotice(formData: FormData) {
  await gate();
  const screenId = Number(formData.get("screenId"));
  const text = String(formData.get("text") || "").trim();
  if (text) await prisma.notice.create({ data: { screenId, text, active: true } });
  redirect(`/admin/screens/${screenId}`);
}

export async function toggleNotice(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  const screenId = Number(formData.get("screenId"));
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (notice) await prisma.notice.update({ where: { id }, data: { active: !notice.active } });
  redirect(`/admin/screens/${screenId}`);
}

export async function deleteNotice(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  const screenId = Number(formData.get("screenId"));
  await prisma.notice.delete({ where: { id } });
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
    data: { name, groupId, street, number, city },
  });
  redirect(`/admin/groups/${groupId}`);
}

export async function clearGroupAddress(formData: FormData) {
  await ownerGate();
  const groupId = Number(formData.get("groupId"));
  await prisma.screenGroup.update({
    where: { id: groupId },
    data: { street: "", number: "", city: "" },
  });
  redirect(`/admin/groups/${groupId}`);
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
  redirect(`/admin/groups/${from}`);
}

export async function addGroupNotice(formData: FormData) {
  await gate();
  const groupId = Number(formData.get("groupId"));
  const text = String(formData.get("text") || "").trim();
  if (text) await prisma.notice.create({ data: { groupId, text, active: true } });
  redirect(`/admin/groups/${groupId}`);
}

export async function toggleGroupNotice(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  const groupId = Number(formData.get("groupId"));
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (notice) await prisma.notice.update({ where: { id }, data: { active: !notice.active } });
  redirect(`/admin/groups/${groupId}`);
}

export async function deleteGroupNotice(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  const groupId = Number(formData.get("groupId"));
  await prisma.notice.delete({ where: { id } });
  redirect(`/admin/groups/${groupId}`);
}

export async function createBuilding(formData: FormData) {
  await gate();
  await prisma.building.create({
    data: {
      name: String(formData.get("name") || "בניין"),
      street: String(formData.get("street") || ""),
      number: String(formData.get("number") || ""),
      city: String(formData.get("city") || ""),
    },
  });
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
  if (text) await prisma.ticker.create({ data: { groupId, text, active: true } });
  redirect("/admin/tickers");
}

export async function deleteTicker(formData: FormData) {
  await gate();
  await prisma.ticker.delete({ where: { id: Number(formData.get("id")) } });
  redirect("/admin/tickers");
}

export async function setMusic(formData: FormData) {
  await gate();
  await prisma.screenGroup.update({
    where: { id: Number(formData.get("id")) },
    data: { musicUrl: String(formData.get("musicUrl") || "") },
  });
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
  await prisma.floor.create({
    data: { groupId: Number(formData.get("groupId")), name: String(formData.get("name") || "קומה") },
  });
  redirect("/admin/directory");
}

export async function addRoom(formData: FormData) {
  await gate();
  await prisma.room.create({
    data: {
      floorId: Number(formData.get("floorId")),
      name: String(formData.get("name") || "חדר"),
      detail: String(formData.get("detail") || ""),
    },
  });
  redirect("/admin/directory");
}

export async function deleteFloor(formData: FormData) {
  await gate();
  await prisma.floor.delete({ where: { id: Number(formData.get("id")) } });
  redirect("/admin/directory");
}
