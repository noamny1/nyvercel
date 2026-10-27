import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAdviceMail } from "@/lib/mail";
import { mailResourceReport, checkResources } from "@/lib/resource-check";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HEARTBEAT_MS = 18 * 60 * 1000;
const ACCESS_MS = 16 * 60 * 1000;

function age(date: Date | null | undefined, now: number) {
  const at = date?.getTime() || 0;
  return at > 0 && now - at <= ACCESS_MS;
}

function screenSelect() {
  return {
    id: true,
    code: true,
    name: true,
    street: true,
    number: true,
    city: true,
    floor: true,
    heartbeat: { select: { at: true } },
    remoteDesk: { select: { keeperAt: true, keeper2At: true, k2Beat: true, nykAt: true, nykBeat: true } },
  } as const;
}

type CheckedScreen = {
  id: number;
  code: number | null;
  name: string;
  street: string;
  number: string;
  city: string;
  floor: string;
  heartbeat: { at: Date } | null;
  remoteDesk: {
    keeperAt: Date | null;
    keeper2At: Date | null;
    k2Beat: Date | null;
    nykAt: Date | null;
    nykBeat: Date | null;
  } | null;
};

function hasAccess(screen: CheckedScreen, now: number) {
  const beat = screen.heartbeat?.at?.getTime() || 0;
  if (beat > 0 && now - beat <= HEARTBEAT_MS) return true;
  const desk = screen.remoteDesk;
  return [desk?.keeperAt, desk?.keeper2At, desk?.k2Beat, desk?.nykAt, desk?.nykBeat].some((date) => age(date, now));
}

async function confirmedFaults() {
  const first = await prisma.screen.findMany({ where: { active: true }, select: screenSelect() });
  const suspects = first.filter((screen) => !hasAccess(screen, Date.now()));
  if (!suspects.length) return [];
  await new Promise((resolve) => setTimeout(resolve, 25000));
  const again = await prisma.screen.findMany({
    where: { id: { in: suspects.map((screen) => screen.id) }, active: true },
    select: screenSelect(),
  });
  const now = Date.now();
  return again.filter((screen) => !hasAccess(screen, now));
}

function jerusalemClock() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value || "0");
  return { hour: pick("hour"), minute: pick("minute") };
}

function place(screen: { name: string; street: string; number: string; city: string; floor: string; code: number | null }) {
  const line = [screen.street, screen.number].filter(Boolean).join(" ");
  const city = [line, screen.city].filter(Boolean).join(", ");
  return [city || screen.name, screen.floor || "לובי", screen.code ? `מסך ${screen.code}` : ""].filter(Boolean).join(" · ");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}

async function reviveThemes() {
  return 0;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  const fromVercel = request.headers.get("x-vercel-cron") === "1";
  if (secret && header !== `Bearer ${secret}` && !fromVercel) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { hour, minute } = jerusalemClock();
  const revived = await reviveThemes();

  if (hour === 10 && minute < 15) {
    const report = await checkResources();
    const mailed = await mailResourceReport(report);
    if (!mailed.ok) return NextResponse.json({ ok: false, error: mailed.error, revived }, { status: 500 });
    return NextResponse.json({ ok: true, hour, revived, subject: report.subject });
  }

  if (hour !== 9 || minute >= 15) return NextResponse.json({ ok: true, hour, minute, revived });

  const missing = await confirmedFaults();
  if (!missing.length) return NextResponse.json({ ok: true, hour, missing: 0, mailed: false });
  const lines = missing.map(place);
  const to = Array.from(new Set([process.env.ADMIN_EMAIL?.trim(), "noam6683@gmail.com"].filter((item): item is string => Boolean(item))));
  const subject = `אין גישה ל-${lines.length} כתובות`;
  const text = ["כתובות בלי גישה לסטרימר, אחרי בדיקה חוזרת. אפשר לשלוח טכנאי.", "", ...lines].join("\n");
  const items = lines
    .map((line) => `<li style="margin:0 0 8px;font-size:18px;line-height:1.7">${escapeHtml(line)}</li>`)
    .join("");
  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;color:#252525"><p style="font-size:18px">בדיקת גישה יומית. נשלחות רק כתובות שנשארו בלי גישה גם בבדיקה השנייה.</p><ul style="padding:0 20px 0 0">${items}</ul></div>`;
  const mail = await sendAdviceMail({ to, replyTo: to[0], subject, text, html });
  if (!mail.ok) return NextResponse.json({ ok: false, error: mail.error, missing: lines.length }, { status: 500 });
  return NextResponse.json({ ok: true, hour, missing: lines.length });
}
