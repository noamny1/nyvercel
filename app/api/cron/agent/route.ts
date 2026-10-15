import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAdviceMail } from "@/lib/mail";
import { mailResourceReport, checkResources } from "@/lib/resource-check";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const THEME_MS = 8 * 60 * 1000;
const ACCESS_MS = 20 * 1000;

function jerusalemHour() {
  const value = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  return Number(value);
}

function place(screen: { name: string; street: string; number: string; city: string; floor: string; code: number | null }) {
  const line = [screen.street, screen.number].filter(Boolean).join(" ");
  const city = [line, screen.city].filter(Boolean).join(", ");
  return [city || screen.name, screen.floor || "לובי", screen.code ? `מסך ${screen.code}` : ""].filter(Boolean).join(" · ");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  const fromVercel = request.headers.get("x-vercel-cron") === "1";
  if (secret && header !== `Bearer ${secret}` && !fromVercel) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const hour = jerusalemHour();
  if (hour !== 8 && hour !== 9 && hour !== 10) return NextResponse.json({ ok: true, skipped: true, hour });

  if (hour === 10) {
    const report = await checkResources();
    const mailed = await mailResourceReport(report);
    if (!mailed.ok) return NextResponse.json({ ok: false, error: mailed.error }, { status: 500 });
    return NextResponse.json({ ok: true, hour, subject: report.subject });
  }

  const now = Date.now();
  const screens = await prisma.screen.findMany({
    where: { active: true },
    select: {
      id: true,
      code: true,
      name: true,
      street: true,
      number: true,
      city: true,
      floor: true,
      heartbeat: { select: { at: true } },
      remoteDesk: { select: { keeperAt: true } },
    },
  });
  const reachable = screens.filter((screen) => {
    const at = screen.remoteDesk?.keeperAt?.getTime() || 0;
    return at > 0 && now - at <= ACCESS_MS;
  });

  if (hour === 8) {
    const stalled = reachable.filter((screen) => {
      const at = screen.heartbeat?.at?.getTime() || 0;
      return now - at > THEME_MS;
    });
    let started = 0;
    for (const screen of stalled) {
      const pending = await prisma.remoteCommand.findFirst({
        where: { screenId: screen.id, op: "media", text: "1" },
        select: { id: true },
      });
      if (pending) continue;
      await prisma.remoteCommand.create({
        data: { screenId: screen.id, op: "media", text: "1" },
      });
      started += 1;
    }
    return NextResponse.json({ ok: true, hour, checked: screens.length, reachable: reachable.length, started });
  }

  const missing = screens.filter((screen) => !reachable.includes(screen));
  const lines = missing.map(place);
  const to = Array.from(new Set([process.env.ADMIN_EMAIL?.trim(), "noam6683@gmail.com"].filter((item): item is string => Boolean(item))));
  const subject = lines.length ? `אין גישה ל-${lines.length} כתובות` : "כל הכתובות עם גישה";
  const text = lines.length
    ? ["כתובות בלי גישה לסטרימר. אפשר לשלוח טכנאי.", "", ...lines].join("\n")
    : "כל הכתובות הפעילות עם גישה לסטרימר.";
  const items = (lines.length ? lines : ["כל הכתובות הפעילות עם גישה לסטרימר."])
    .map((line) => `<li style="margin:0 0 8px;font-size:18px;line-height:1.7">${escapeHtml(line)}</li>`)
    .join("");
  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;color:#252525"><p style="font-size:18px">בדיקת גישה יומית</p><ul style="padding:0 20px 0 0">${items}</ul></div>`;
  const mail = await sendAdviceMail({ to, replyTo: to[0], subject, text, html });
  if (!mail.ok) return NextResponse.json({ ok: false, error: mail.error, missing: lines.length }, { status: 500 });
  return NextResponse.json({ ok: true, hour, missing: lines.length });
}
