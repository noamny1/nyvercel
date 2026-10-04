import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  if (body.type === "blob.generate-client-token") {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  }
  const result = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: ["video/mp4", "video/webm", "video/quicktime"],
      maximumSizeInBytes: 200 * 1024 * 1024,
      addRandomSuffix: true,
    }),
    onUploadCompleted: async () => {},
  });
  return NextResponse.json(result);
}
