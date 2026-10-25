import { redirect } from "next/navigation";
import { put } from "@vercel/blob";
import { prisma } from "@/modules/data/prisma";
import { officialCity } from "@/modules/place/cities";
import { screenWhere } from "@/modules/identity/access";
import { isSystemAdmin } from "@/modules/identity/session";
import { nextCode, touchGroup } from "@/modules/data/publish";
import { savedTheme } from "@/modules/slides/themes";
import { adoptGroup, chosenNews, fallbackLogo, gate, ownerGate, spreadGroupPromo, writtenAddress } from "@/modules/admin/gate";

export async function createGroup(formData: FormData) {
  await gate();
  const group = await prisma.screenGroup.create({
    data: {
      name: String(formData.get("name") || "קבוצה חדשה"),
      street: String(formData.get("street") || ""),
      number: String(formData.get("number") || ""),
      city: officialCity(String(formData.get("city") || "")),
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
      city: officialCity(String(formData.get("city") || "")),
      theme: await savedTheme(String(formData.get("theme") || "modern"), current.theme, isSystemAdmin(session)),
      newsSource: chosenNews(formData),
      logoUrl: String(formData.get("logoUrl") || ""),
      faultPhone: String(formData.get("faultPhone") || "").trim().slice(0, 40),
      faultLink: String(formData.get("faultLink") || "").trim().slice(0, 300),
      faultQrUrl: String(formData.get("clearFaultQr") || "") === "1" ? "" : String(formData.get("faultQrUrl") || "").startsWith("http") ? String(formData.get("faultQrUrl") || "") : current.faultQrUrl,
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
  const city = officialCity(String(formData.get("city") || ""));
  if (!street && !city) redirect(`/admin/groups/${groupId}`);
  const place = [street, number].filter(Boolean).join(" ");
  const name = [place, city].filter(Boolean).join(", ");
  await prisma.screen.create({
    data: { name, groupId, street, number, city, code: await nextCode() },
  });
  redirect(`/admin/groups/${groupId}`);
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
  const city = officialCity(String(formData.get("city") || fromGroup.city));
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
