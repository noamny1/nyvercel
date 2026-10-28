import { redirect } from "next/navigation";
import { prisma } from "@/modules/data/prisma";
import { screenWhere } from "@/modules/identity/access";
import { requireSession, isSystemAdmin } from "@/modules/identity/session";
import { nextCode, touchGroup, touchScreen } from "@/modules/data/publish";

export async function gate() {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  return session;
}

export function chosenNews(formData: FormData) {
  const ids = [...new Set(formData.getAll("newsSource").map((value) => String(value).trim()).filter(Boolean))].slice(0, 4);
  return ids.join(",") || "ynet";
}

export function safeReturn(formData: FormData, fallback: string) {
  const back = String(formData.get("returnTo") || "");
  return back.startsWith("/admin/buildings") || /^\/admin\/as\/\d+$/.test(back) ? back : fallback;
}

export async function ownerGate() {
  const session = await gate();
  if (!isSystemAdmin(session)) redirect("/admin");
  return session;
}

export async function fallbackLogo() {
  const starter = await starterScreen();
  return starter?.logoUrl || starter?.group?.logoUrl || "";
}

export async function spreadGroupPromo(groupId: number, url: string, duration: number) {
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

export function writtenAddress(street: string, number: string, city: string) {
  const place = [street, number].filter(Boolean).join(" ");
  return [place, city].filter(Boolean).join(", ");
}

export async function starterScreen() {
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

export async function adoptGroup(screenId: number, groupId: number) {
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

