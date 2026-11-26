import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function text(value: unknown) {
  if (value === null || value === undefined) return null;
  const out = String(value).trim();
  return out && out !== "None" ? out.slice(0, 500) : null;
}

function money(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

function whole(value: unknown) {
  const number = money(value);
  return number === null ? null : Math.round(number);
}

function when(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(req: Request) {
  const { clients } = await req.json();
  if (!Array.isArray(clients)) {
    return NextResponse.json({ error: "clients array required" }, { status: 400 });
  }

  let imported = 0;
  for (const c of clients) {
    try {
      await prisma.crmClient.create({
        data: {
          name: text(c.name) || "ללא שם",
          city: text(c.city),
          status: text(c.status),
          workContent: text(c.workContent),
          notes: text(c.notes),
          oneTimeCharge: money(c.oneTimeCharge),
          monthlyPay: money(c.monthlyPay),
          monthlyPay2: money(c.monthlyPay2),
          internetCost: money(c.internetCost),
          clientType: text(c.clientType),
          infrastructure: text(c.infrastructure),
          paymentMethod: text(c.paymentMethod),
          theme: text(c.theme),
          installDate: when(c.installDate),
          hotLine: text(c.hotLine),
          ipDns: text(c.ipDns),
          loginUser: text(c.loginUser),
          loginPass: text(c.loginPass),
          modemData: text(c.modemData),
          subscriberId: text(c.subscriberId),
          modemPass: text(c.modemPass),
          dvrType: text(c.dvrType),
          dvrIp: text(c.dvrIp),
          dvrPorts: text(c.dvrPorts),
          dvrUser: text(c.dvrUser),
          dvrPass: text(c.dvrPass),
          screenCount: whole(c.screenCount),
          addressCount: whole(c.addressCount),
          bank: text(c.bank),
          branch: text(c.branch),
          account: text(c.account),
          files: text(c.files),
          paidUntil: text(c.paidUntil),
          mondayId: text(c.mondayId),
        },
      });
      imported++;
    } catch {
      // Skip a bad row and continue the batch.
    }
  }
  return NextResponse.json({ imported });
}

export async function GET() {
  const count = await prisma.crmClient.count();
  return NextResponse.json({ count });
}

export async function DELETE() {
  await prisma.crmClient.deleteMany({});
  return NextResponse.json({ cleared: true });
}
