import { NextResponse } from "next/server";
import { shabbatFor } from "@/lib/shabbat";
import { prisma } from "@/lib/prisma";
import { CITIES } from "@/lib/cities";

export const revalidate = 21600;

async function cityFor(value: string) {
  const key = Number(value);
  if (!Number.isInteger(key) || key <= 0) return "";
  const screen = await prisma.screen.findFirst({
    where: { OR: [{ code: key }, { id: key }] },
    select: { city: true, name: true, street: true, group: { select: { city: true, name: true, street: true } } },
  }).catch(() => null);
  if (!screen) return "";
  const saved = (screen.city || screen.group?.city || "").trim();
  if (saved) return saved;
  const text = [screen.name, screen.street, screen.group?.name, screen.group?.street].filter(Boolean).join(" ");
  return CITIES.find((city) => text.includes(city)) || "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const asked = url.searchParams.get("city") || "";
  const fromScreen = url.searchParams.get("screen") ? await cityFor(url.searchParams.get("screen") || "") : "";
  const city = asked.trim() || fromScreen;
  const reading = await shabbatFor(city).catch(() => null);
  return NextResponse.json(reading || { candles: "", havdalah: "", parsha: "", city, verses: [] }, {
    headers: {
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
    },
  });
}