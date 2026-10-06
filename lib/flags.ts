import { prisma } from "@/lib/prisma";

export async function musicSilenced() {
  const row = await prisma.systemFlag.findUnique({ where: { id: "music" } }).catch(() => null);
  return row?.value === "off";
}

export async function screenTakeover() {
  const rows = await prisma.systemFlag.findMany({
    where: { id: { in: ["takeover", "takeoverImage"] } },
  }).catch(() => []);
  const on = rows.find((row) => row.id === "takeover")?.value === "on";
  const image = rows.find((row) => row.id === "takeoverImage")?.value || "";
  return { on, image: image.startsWith("http") ? image : "" };
}
