import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isSystemAdmin, requireSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const result = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: [
        "application/vnd.android.package-archive",
        "application/octet-stream",
        "application/zip",
        "application/pdf",
        "image/jpeg",
        "image/png",
        "video/mp4",
        "text/plain",
      ],
      maximumSizeInBytes: 80 * 1024 * 1024,
      addRandomSuffix: true,
    }),
    onUploadCompleted: async () => {},
  });
  return NextResponse.json(result);
}
