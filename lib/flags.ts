import { prisma } from "@/lib/prisma";

export async function musicSilenced() {
  const row = await prisma.systemFlag.findUnique({ where: { id: "music" } }).catch(() => null);
  return row?.value === "off";
}
