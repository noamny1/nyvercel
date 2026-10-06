import { NextResponse } from "next/server";
import { liveHeadlines } from "@/lib/news";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") || "ynet";
  const take = Number(searchParams.get("take") || "8");
  const items = await liveHeadlines(source, Number.isFinite(take) ? take : 8).catch(() => []);
  return NextResponse.json({
    items: items.map((item) => ({ title: item.title, source: item.source || "" })).filter((item) => item.title),
  });
}
