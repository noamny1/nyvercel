"use server";

import { prisma } from "@/lib/prisma";
import { screenWhere } from "@/lib/access";
import { sendAdviceMail } from "@/lib/mail";
import { requireSession } from "@/lib/session";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">");
}

export async function sendAdvice(formData: FormData) {
  const session = await requireSession();
  const email = session?.user?.email?.trim().toLowerCase() || "";
  if (!email) return { ok: false as const, error: "צריך להיכנס מחדש." };
  const text = String(formData.get("text") || "").trim().slice(0, 4000);
  const screenId = Number(formData.get("screenId"));
  if (!text) return { ok: false as const, error: "נא לכתוב את ההמלצה." };
  if (!screenId) return { ok: false as const, error: "המסך לא נמצא." };

  const screen = await prisma.screen.findFirst({
    where: { id: screenId, ...(await screenWhere(session)) },
    include: { group: true },
  });
  if (!screen) return { ok: false as const, error: "המסך לא נמצא." };
  const account = await prisma.user.findUnique({ where: { email }, select: { name: true, email: true } });
  const street = screen.street || screen.group?.street || "";
  const number = screen.number || screen.group?.number || "";
  const city = screen.city || screen.group?.city || "";
  const place = [street, number].filter(Boolean).join(" ");
  const address = [place, city].filter(Boolean).join(", ") || screen.name;
  const name = account?.name || "";
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const to = [...new Set([admin, "noam6683@gmail.com"].filter((item): item is string => Boolean(item)))];
  const lines = [
    "המלצה חדשה מלקוח",
    "",
    `שם: ${name || "—"}`,
    `אימייל: ${email}`,
    `מסך: ${screen.code || screen.id}`,
    `כתובת: ${address}`,
    "",
    "ההמלצה:",
    text,
  ];
  const html = `<div dir="rtl" style="font-family:Calibri,Arial,sans-serif;color:#252525">
    <p>המלצה חדשה מלקוח</p>
    <p>שם: ${escapeHtml(name || "—")}<br>אימייל: ${escapeHtml(email)}<br>מסך: ${screen.code || screen.id}<br>כתובת: ${escapeHtml(address)}</p>
    <p>ההמלצה:</p>
    <p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>
  </div>`;
  return sendAdviceMail({
    to,
    replyTo: email,
    subject: `המלצה מ${name || email} · ${address}`,
    text: lines.join("\n"),
    html,
  });
}
