"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

async function gate() {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
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
    },
  });
  redirect(`/admin/groups/${id}`);
}

export async function addScreenToGroup(formData: FormData) {
  await gate();
  const groupId = Number(formData.get("groupId"));
  await prisma.screen.create({
    data: {
      name: String(formData.get("name") || "מסך"),
      groupId,
    },
  });
  redirect(`/admin/groups/${groupId}`);
}

export async function removeScreen(formData: FormData) {
  await gate();
  const id = Number(formData.get("id"));
  const groupId = Number(formData.get("groupId"));
  await prisma.screen.delete({ where: { id } });
  redirect(`/admin/groups/${groupId}`);
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
