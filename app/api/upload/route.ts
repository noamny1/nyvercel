import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "לא נבחרה תמונה" }, { status: 400 });
  }
  const kind = String(form.get("kind") || "image");
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
  const maxVideo = 50 * 1024 * 1024;
  if (kind === "video") {
    if (!isVideo) return NextResponse.json({ error: "אפשר להעלות קובץ וידאו (MP4, WebM, MOV)" }, { status: 400 });
    if (file.size > maxVideo) return NextResponse.json({ error: "הסרטון גדול מ-50 מגה" }, { status: 400 });
  } else if (kind === "slide" ? !(isImage || isPdf) : !isImage) {
    return NextResponse.json({ error: kind === "slide" ? "אפשר להעלות תמונה או PDF" : "אפשר להעלות תמונה או GIF" }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "אחסון התמונות לא מחובר" }, { status: 500 });
  }
  const blob = await put(`uploads/${Date.now()}-${file.name}`, file, {
    access: "public",
    contentType: file.type,
  });
  return NextResponse.json({ url: blob.url });
}
