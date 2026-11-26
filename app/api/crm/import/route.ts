import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const CLIENTS = [
  { name: "מדנס", city: "תל אביב", status: "פעיל", monthlyPay: 500 },
  { name: "נעמי שמר 5", city: "קרית גת", status: "פעיל", monthlyPay: 300 },
  { name: "אורנבך 2", city: "תל אביב", status: "פעיל", monthlyPay: 151 },
];

export async function POST() {
  let imported = 0;
  for (const c of CLIENTS) {
    await prisma.crmClient.create({ data: c });
    imported++;
  }
  return NextResponse.json({ imported });
}

export async function GET() {
  const count = await prisma.crmClient.count();
  return NextResponse.json({ count });
}
