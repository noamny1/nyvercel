import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { checkYoutube } from "@/lib/youtube";

async function storeImage(remote: string) {
  const image = await fetch(remote);
  if (!image.ok) throw new Error("התמונה לא ירדה");
  const type = image.headers.get("content-type") || "image/jpeg";
  if (!type.startsWith("image/")) throw new Error("התמונה לא תקינה");
  const bytes = Buffer.from(await image.arrayBuffer());
  if (!process.env.BLOB_READ_WRITE_TOKEN) return remote;
  const blob = await put(`slides/agent-${Date.now()}.jpg`, bytes, { access: "public", contentType: type });
  return blob.url;
}

async function generatedImage(topic: string) {
  const key = process.env.XAI_API_KEY;
  if (!key) return "";
  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "grok-imagine-image-2.0",
      prompt: `Wide elegant photo for a residential lobby screen, no text, no letters, no logos, no watermark: ${topic}`,
      aspect_ratio: "16:9",
      n: 1,
    }),
  });
  if (!response.ok) return "";
  const data = (await response.json()) as { data?: { url?: string }[]; url?: string };
  return data.data?.[0]?.url || data.url || "";
}

async function foundImage(topic: string) {
  const endpoint = new URL("https://commons.wikimedia.org/w/api.php");
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("generator", "search");
  endpoint.searchParams.set("gsrsearch", `${topic} filetype:bitmap`);
  endpoint.searchParams.set("gsrnamespace", "6");
  endpoint.searchParams.set("gsrlimit", "6");
  endpoint.searchParams.set("prop", "imageinfo");
  endpoint.searchParams.set("iiprop", "url|mime");
  endpoint.searchParams.set("iiurlwidth", "1280");
  const response = await fetch(endpoint, { headers: { "User-Agent": "NYtv/1.0 (https://nytv.app)" } });
  if (!response.ok) return "";
  const data = (await response.json()) as { query?: { pages?: Record<string, { imageinfo?: { thumburl?: string; mime?: string }[] }> } };
  const pages = Object.values(data.query?.pages || {});
  const hit = pages.find((page) => page.imageinfo?.[0]?.mime?.startsWith("image/") && page.imageinfo[0].thumburl);
  return hit?.imageinfo?.[0]?.thumburl || "";
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  const body = (await request.json()) as { action?: string; topic?: string; url?: string };

  if (body.action === "youtube") {
    const result = await checkYoutube(body.url || "");
    return NextResponse.json(result);
  }

  const topic = (body.topic || "").trim().slice(0, 180);
  if (topic.length < 2) return NextResponse.json({ error: "צריך נושא קצר לתמונה" }, { status: 400 });
  const remote = (await generatedImage(topic)) || (await foundImage(topic));
  if (!remote) return NextResponse.json({ error: "לא נמצאה תמונה לנושא הזה. אפשר לנסח אחרת." }, { status: 404 });
  const imageUrl = await storeImage(remote);
  const made = Boolean(process.env.XAI_API_KEY);
  return NextResponse.json({ imageUrl, made });
}
