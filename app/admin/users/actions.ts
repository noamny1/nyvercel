"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { sendClientMail } from "@/lib/mail";

async function ownerGate() {
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) redirect("/admin");
}

function line(screen: { id: number; code: number | null; street: string; number: string; city: string; name: string }) {
  const place = [screen.street, screen.number].filter(Boolean).join(" ");
  return `מסך ${screen.code || screen.id} · ${[place, screen.city].filter(Boolean).join(", ") || screen.name}`;
}

export async function createClientUser(formData: FormData) {
  await ownerGate();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "").trim();
  const ids = formData.getAll("screenId").map(Number).filter(Boolean);
  if (!email || password.length < 6) return { ok: false as const, error: "צריך אימייל וסיסמה של 6 תווים לפחות." };
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { ok: false as const, error: "האימייל כבר קיים." };
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await bcrypt.hash(password, 10),
      role: "client",
      screens: { connect: ids.map((id) => ({ id })) },
    },
    include: { screens: true },
  });
  const card = {
    name: user.name,
    email: user.email,
    password,
    screens: user.screens.map(line),
  };
  const send = formData.get("intent") === "send";
  if (!send) return { ok: true as const, card, sent: false as const };
  const mail = await sendClientMail(card);
  return { ok: true as const, card, sent: mail.ok, mailError: mail.ok ? "" : mail.error };
}

export async function saveAndSendUser(formData: FormData) {
  await ownerGate();
  const userId = Number(formData.get("userId"));
  const ids = formData.getAll("screenId").map(Number).filter(Boolean);
  const password = randomBytes(6).toString("base64url");
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      screens: { set: ids.map((id) => ({ id })) },
    },
    include: { screens: true },
  });
  const card = {
    name: user.name,
    email: user.email,
    password,
    screens: user.screens.map(line),
  };
  const mail = await sendClientMail(card);
  return { ok: true as const, card, sent: mail.ok, mailError: mail.ok ? "" : mail.error };
}

export async function assignScreens(formData: FormData) {
  await ownerGate();
  const userId = Number(formData.get("userId"));
  const ids = formData.getAll("screenId").map(Number).filter(Boolean);
  await prisma.user.update({
    where: { id: userId },
    data: { screens: { set: ids.map((id) => ({ id })) } },
  });
  const email = String(formData.get("q") || "").trim();
  redirect(email ? `/admin/users?q=${encodeURIComponent(email)}` : "/admin/users");
}

export async function deleteClientUser(formData: FormData) {
  await ownerGate();
  const userId = Number(formData.get("userId"));
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user && user.role !== "owner" && user.email !== "noam6683@gmail.com") {
    await prisma.user.delete({ where: { id: userId } });
  }
  redirect("/admin/users");
}
