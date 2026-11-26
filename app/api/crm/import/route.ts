import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
          name: c.name || "ללא שם",
          city: c.city || null,
          status: c.status || null,
          workContent: c.workContent || null,
          notes: c.notes || null,
          monthlyPay: c.monthlyPay || null,
          clientType: c.clientType || null,
          infrastructure: c.infrastructure || null,
          paymentMethod: c.paymentMethod || null,
          theme: c.theme || null,
        },
      });
      imported++;
    } catch (e) {
      // Skip duplicates
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
