import { NextResponse } from "next/server";
import { weeklyPortion } from "@/lib/shabbat";

export const dynamic = "force-dynamic";

export async function GET() {
  const portion = await weeklyPortion().catch(() => ({ parsha: "", verses: [] as string[] }));
  const fresh = portion.verses.length > 0;
  return NextResponse.json(portion, {
    headers: {
      "Cache-Control": fresh ? "public, s-maxage=21600, stale-while-revalidate=86400" : "no-store",
    },
  });
}