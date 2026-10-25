import { redirect } from "next/navigation";
import { prisma } from "@/modules/data/prisma";
import { screenWhere } from "@/modules/identity/access";
import { touchGroup, touchScreen } from "@/modules/data/publish";
import { gate } from "@/modules/admin/gate";

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
