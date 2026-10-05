import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function nextCode() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = 100000 + Math.floor(Math.random() * 900000);
    const taken = await prisma.screen.findUnique({ where: { code }, select: { id: true } });
    if (!taken) return code;
  }
  throw new Error("לא נמצא מספר מסך פנוי");
}

export async function touchScreen(id: number) {
  if (!id) return;
  const screen = await prisma.screen.update({
    where: { id },
    data: { revision: { increment: 1 } },
    select: { code: true },
  }).catch(() => null);
  if (screen?.code) {
    revalidatePath(`/s/${screen.code}`);
    revalidatePath(`/s/${screen.code}`, "page");
  }
}

export async function touchGroup(groupId: number) {
  if (!groupId) return;
  const screens = await prisma.screen.findMany({ where: { groupId }, select: { code: true } });
  if (!screens.length) return;
  await prisma.screen.updateMany({ where: { groupId }, data: { revision: { increment: 1 } } });
  for (const screen of screens) {
    if (!screen.code) continue;
    revalidatePath(`/s/${screen.code}`);
    revalidatePath(`/s/${screen.code}`, "page");
  }
}

export async function touchOwner(owner: { screenId?: number | null; groupId?: number | null }) {
  if (owner.screenId) await touchScreen(owner.screenId);
  if (owner.groupId) await touchGroup(owner.groupId);
}
