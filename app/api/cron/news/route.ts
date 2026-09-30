import { NextResponse } from "next/server";
import { refreshNews } from "@/lib/news";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  const fromVercel = request.headers.get("x-vercel-cron") === "1";
  if (secret && header !== `Bearer ${secret}` && !fromVercel) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await refreshNews();
  return NextResponse.json({ ok: true });
}
