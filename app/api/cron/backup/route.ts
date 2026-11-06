import { NextResponse } from "next/server";
import { saveBackup } from "@/modules/backup/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET || "";
  const header = request.headers.get("authorization");
  const fromVercel = request.headers.get("x-vercel-cron") === "1";
  if (!secret || (header !== `Bearer ${secret}` && !fromVercel)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const saved = await saveBackup();
    return NextResponse.json({ ok: true, ...saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "backup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
