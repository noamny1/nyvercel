"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { open, randomSecret, seal, verifyTotp } from "@/lib/totp";

async function owner() {
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) redirect("/admin");
  const email = session.user?.email?.trim().toLowerCase() || "";
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user) redirect("/admin");
  return user;
}

export async function startTotp() {
  const user = await owner();
  await prisma.user.update({
    where: { id: user.id },
    data: { totpPending: seal(randomSecret()) },
  });
  redirect("/admin/security");
}

export async function confirmTotp(formData: FormData) {
  const user = await owner();
  const secret = open(user.totpPending);
  const code = String(formData.get("code") || "");
  if (!secret || !verifyTotp(secret, code)) redirect("/admin/security?error=1");
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: user.totpPending, totpPending: "" },
  });
  redirect("/admin/security?ready=1");
}
