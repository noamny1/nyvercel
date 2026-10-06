"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { touchAll } from "@/lib/publish";
import { isSystemAdmin, requireSession } from "@/lib/session";

async function ownerGate() {
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) redirect("/admin/login");
}

export async function refreshAllScreens() {
  await ownerGate();
  await touchAll();
  redirect("/admin/manage?done=refresh");
}

export async function setGlobalMusic(formData: FormData) {
  await ownerGate();
  const off = String(formData.get("off") || "") === "1";
  await prisma.systemFlag.upsert({
    where: { id: "music" },
    create: { id: "music", value: off ? "off" : "on" },
    update: { value: off ? "off" : "on" },
  });
  await touchAll();
  redirect("/admin/manage?done=music");
}
