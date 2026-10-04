import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { checkYoutube } from "@/lib/youtube";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  const body = (await request.json()) as { url?: string };
  return NextResponse.json(await checkYoutube(body.url || ""));
}
