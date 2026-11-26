import { prisma } from "@/lib/prisma";
import { sendFileMail } from "@/modules/data/mail";
import { crmWorkbook, type WorkRow } from "@/modules/crm/workbook";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function fieldsOf(value: unknown, name: string) {
  const fields: Record<string, string> = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, item] of Object.entries(value)) fields[key] = item == null ? "" : String(item);
  }
  if (!fields.Name) fields.Name = name;
  return fields;
}

function jerusalemHour() {
  const part = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date())
    .find((item) => item.type === "hour");
  return part?.value || "";
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET || "";
  const header = request.headers.get("authorization");
  const fromVercel = request.headers.get("x-vercel-cron") === "1";
  if (!secret || (header !== `Bearer ${secret}` && !fromVercel)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (jerusalemHour() !== "23") return NextResponse.json({ ok: true, skipped: "hour" });
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  const flag = await prisma.systemFlag.findUnique({ where: { id: "crm-backup-day" } });
  if (flag?.value === day) return NextResponse.json({ ok: true, skipped: "sent" });

  const clients = await prisma.crmClient.findMany({ orderBy: [{ board: "asc" }, { name: "asc" }] });
  const rows: WorkRow[] = clients.map((client) => ({
    id: client.id,
    board: client.board || "כתובות פעילות",
    name: client.name,
    updatedAt: client.updatedAt,
    fields: fieldsOf(client.fields, client.name),
  }));
  const book = crmWorkbook(rows);
  const to = Array.from(new Set([process.env.ADMIN_EMAIL?.trim(), "noam6683@gmail.com"].filter((item): item is string => Boolean(item))));
  const sent = await sendFileMail({
    to,
    subject: `גיבוי CRM ${day}`,
    text: `גיבוי מלא של ה-CRM ל-${day}.\n${book.count} רשומות בקובץ המצורף.`,
    filename: book.filename,
    content: Buffer.from(book.xml, "utf8"),
  });
  if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 500 });
  await prisma.systemFlag.upsert({
    where: { id: "crm-backup-day" },
    update: { value: day },
    create: { id: "crm-backup-day", value: day },
  });
  return NextResponse.json({ ok: true, count: book.count, to });
}
