import { NextResponse } from "next/server";
import { shabbatFor } from "@/lib/shabbat";

export async function GET(request: Request) {
  const city = new URL(request.url).searchParams.get("city") || "";
  const reading = await shabbatFor(city).catch(() => null);
  return NextResponse.json(reading || { candles: "", parsha: "", city, verses: [] });
}
