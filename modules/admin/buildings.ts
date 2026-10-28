import { redirect } from "next/navigation";
import { prisma } from "@/modules/data/prisma";
import { officialCity } from "@/modules/place/cities";
import { nextCode, touchGroup, touchScreen } from "@/modules/data/publish";
import { adoptGroup, gate, ownerGate, starterScreen } from "@/modules/admin/gate";

export async function createListedScreen(formData: FormData) {
  await gate();
  const street = String(formData.get("street") || "").trim();
  const number = String(formData.get("number") || "").trim();
  const city = officialCity(String(formData.get("city") || ""));
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
