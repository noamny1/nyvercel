"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { THEMES, isThemeId } from "@/lib/themes";

export async function saveClientThemes(formData: FormData) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  if (!isSystemAdmin(session)) redirect("/admin/buildings");
  const picked = new Set(formData.getAll("theme").map((value) => String(value)).filter(isThemeId));
  const ids = THEMES.map((theme) => theme.id).filter((id) => picked.has(id));
  if (!ids.length) ids.push("modern");
  await prisma.systemFlag.upsert({
    where: { id: "clientThemes" },
    create: { id: "clientThemes", value: ids.join(",") },
    update: { value: ids.join(",") },
  });
  redirect("/admin/themes?done=1");
}
