import { redirect } from "next/navigation";
import { prisma } from "@/modules/data/prisma";
import { officialCity } from "@/modules/place/cities";
import { nextCode, touchGroup, touchScreen } from "@/modules/data/publish";
import { adoptGroup, gate, ownerGate, starterScreen } from "@/modules/admin/gate";
import { groupWhere, screenWhere } from "@/modules/identity/access";
import { isSystemAdmin } from "@/modules/identity/session";

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
  const session = await gate();
  const screenId = Number(formData.get("screenId")) || 0;
  const groupId = Number(formData.get("groupId")) || 0;
  if (!(await allowedFloors(session, screenId, groupId))) redirect("/admin");
  const name = String(formData.get("name") || "").trim().slice(0, 40);
  if (!name) redirect(floorReturn(formData));
  await prisma.floor.create({ data: { name, ...(screenId ? { screenId } : { groupId }) } });
  await touchFloors(screenId, groupId);
  redirect(floorReturn(formData));
}
export async function addRoom(formData: FormData) {
  const session = await gate();
  const floorId = Number(formData.get("floorId"));
  const floor = await prisma.floor.findUnique({ where: { id: floorId }, select: { screenId: true, groupId: true } });
  if (!floor || !(await allowedFloors(session, floor.screenId || 0, floor.groupId || 0))) redirect("/admin");
  const name = String(formData.get("name") || "").trim().slice(0, 80);
  if (!name) redirect(floorReturn(formData));
  const logo = String(formData.get("logoUrl") || "");
  await prisma.room.create({
    data: {
      floorId,
      name,
      detail: String(formData.get("detail") || "").trim().slice(0, 80),
      logoUrl: logo.startsWith("http") ? logo : "",
    },
  });
  await touchFloors(floor.screenId || 0, floor.groupId || 0);
  redirect(floorReturn(formData));
}
export async function deleteRoom(formData: FormData) {
  const session = await gate();
  const id = Number(formData.get("id"));
  const room = await prisma.room.findUnique({ where: { id }, include: { floor: { select: { screenId: true, groupId: true } } } });
  if (!room || !(await allowedFloors(session, room.floor.screenId || 0, room.floor.groupId || 0))) redirect("/admin");
  await prisma.room.delete({ where: { id } });
  await touchFloors(room.floor.screenId || 0, room.floor.groupId || 0);
  redirect(floorReturn(formData));
}
export async function setRoomLogo(formData: FormData) {
  const session = await gate();
  const id = Number(formData.get("id"));
  const room = await prisma.room.findUnique({ where: { id }, include: { floor: { select: { screenId: true, groupId: true } } } });
  if (!room || !(await allowedFloors(session, room.floor.screenId || 0, room.floor.groupId || 0))) redirect("/admin");
  const incoming = String(formData.get("logoUrl") || "");
  const clear = String(formData.get("clearLogo") || "") === "1";
  await prisma.room.update({
    where: { id },
    data: { logoUrl: clear ? "" : incoming.startsWith("http") ? incoming : room.logoUrl },
  });
  await touchFloors(room.floor.screenId || 0, room.floor.groupId || 0);
  redirect(floorReturn(formData));
}
export async function deleteFloor(formData: FormData) {
  const session = await gate();
  const id = Number(formData.get("id"));
  const floor = await prisma.floor.findUnique({ where: { id }, select: { screenId: true, groupId: true } });
  if (!floor || !(await allowedFloors(session, floor.screenId || 0, floor.groupId || 0))) redirect("/admin");
  await prisma.floor.delete({ where: { id } });
  await touchFloors(floor.screenId || 0, floor.groupId || 0);
  redirect(floorReturn(formData));
}

function floorReturn(formData: FormData) {
  const back = String(formData.get("returnTo") || "");
  if (/^\/admin\/screens\/\d+$/.test(back) || /^\/admin\/groups\/\d+$/.test(back) || back.startsWith("/admin/buildings") || back.startsWith("/admin/as/") || back === "/admin/directory") return back;
  return "/admin/directory";
}

async function allowedFloors(session: Awaited<ReturnType<typeof gate>>, screenId: number, groupId: number) {
  if (isSystemAdmin(session)) return true;
  if (screenId) return Boolean(await prisma.screen.findFirst({ where: { id: screenId, ...(await screenWhere(session)) }, select: { id: true } }));
  if (groupId) return Boolean(await prisma.screenGroup.findFirst({ where: { id: groupId, ...(await groupWhere(session)) }, select: { id: true } }));
  return false;
}

async function touchFloors(screenId: number, groupId: number) {
  if (screenId) await touchScreen(screenId);
  if (groupId) await touchGroup(groupId);
}
