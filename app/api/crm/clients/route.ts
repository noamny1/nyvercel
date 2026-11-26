import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { recentPayMonths, UNPAID } from "@/modules/crm/pay-months";
import { NextResponse } from "next/server";

async function denied() {
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return null;
}

function clean(fields: unknown) {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
    const name = key.trim().slice(0, 80);
    if (!name) continue;
    out[name] = value == null ? "" : String(value).slice(0, 2000);
  }
  return out;
}

function money(value: string | undefined) {
  const number = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

export async function POST(req: Request) {
  const block = await denied();
  if (block) return block;
  const body = await req.json();
  const fields = clean(body.fields);
  const name = String(body.name || fields.Name || "").trim().slice(0, 200);
  if (!name) return NextResponse.json({ error: "missing name" }, { status: 400 });
  fields.Name = name;
  const board = String(body.board || "").slice(0, 80);
  if (board === "הוראות קבע וועד") {
    const current = recentPayMonths().at(-1);
    if (current && !String(fields[current] || "").trim()) fields[current] = UNPAID;
  }
  const client = await prisma.crmClient.create({
    data: {
      name,
      board,
      city: fields["עיר"] || null,
      status: fields["סטטוס"] || null,
      notes: fields["הערות"] || null,
      workContent: fields["תכולת העבודה"] || null,
      monthlyPay: money(fields["תשלום חודשי"]),
      clientType: fields["סוג לקוח"] || null,
      fields,
    },
  });
  return NextResponse.json({ id: client.id });
}
