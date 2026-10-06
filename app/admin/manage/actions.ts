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

export async function setTakeover(formData: FormData) {
  await ownerGate();
  const on = String(formData.get("on") || "") === "1";
  const url = String(formData.get("url") || "");
  if (on && !url.startsWith("http")) redirect("/admin/manage?done=takeover-need");
  if (url.startsWith("http")) {
    await prisma.systemFlag.upsert({
      where: { id: "takeoverImage" },
      create: { id: "takeoverImage", value: url },
      update: { value: url },
    });
  }
  await prisma.systemFlag.upsert({
    where: { id: "takeover" },
    create: { id: "takeover", value: on ? "on" : "off" },
    update: { value: on ? "on" : "off" },
  });
  await touchAll();
  redirect("/admin/manage?done=takeover");
}
