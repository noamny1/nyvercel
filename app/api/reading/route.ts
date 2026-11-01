import { NextResponse } from "next/server";
import { shabbatFor } from "@/lib/shabbat";

export const revalidate = 21600;

export async function GET(request: Request) {
  const city = new URL(request.url).searchParams.get("city") || "";
  const reading = await shabbatFor(city).catch(() => null);
  return NextResponse.json(reading || { candles: "", havdalah: "", parsha: "", city, verses: [] }, {
    headers: {
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
    },
  });
}
