import { randomBytes } from "node:crypto";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { safeFileTitle, viewFileError, viewMime } from "@/lib/view-file";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "אחסון הקבצים לא מחובר" }, { status: 500 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });
  }
  const head = Buffer.from(await file.slice(0, 16).arrayBuffer());
  const error = viewFileError(file, head);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const token = randomBytes(18).toString("base64url");
  const mime = viewMime(file.name);
  const title = String(form.get("title") || "").trim().slice(0, 80);
  const blob = await put(`view/${token}`, file, { access: "public", contentType: mime.split(";")[0] });
  await prisma.fileLink.create({
    data: { token, url: blob.url, name: title || safeFileTitle(file.name), mime },
  });
  return NextResponse.json({ token, name: title || safeFileTitle(file.name) });
}
