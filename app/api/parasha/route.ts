import { NextResponse } from "next/server";
import { weeklyPortion } from "@/lib/shabbat";

export const revalidate = 43200;

export async function GET() {
  const portion = await weeklyPortion().catch(() => ({ parsha: "", verses: [] as string[] }));
  return NextResponse.json(portion, {
    headers: {
      "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400",
    },
  });
}
