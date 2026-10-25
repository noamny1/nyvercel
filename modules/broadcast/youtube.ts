export function youtubeId(url: string) {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0]?.slice(0, 11) || "";
    const watch = parsed.searchParams.get("v");
    if (watch) return watch.slice(0, 11);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const marker = parts.findIndex((part) => part === "embed" || part === "shorts" || part === "live" || part === "v");
    if (marker >= 0) return (parts[marker + 1] || "").slice(0, 11);
  } catch {
    return "";
  }
  return "";
}

export async function checkYoutube(url: string) {
  const id = youtubeId(url);
  if (!id || id.length < 11) return { ok: false, id: "", title: "", reason: "הקישור לא נראה כמו סרטון יוטיוב." };
  const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
  const response = await fetch(endpoint, { cache: "no-store" });
  if (response.status === 401 || response.status === 403) {
    return { ok: false, id, title: "", reason: "בעל הסרטון אסר ניגון באתרים אחרים." };
  }
  if (!response.ok) return { ok: false, id, title: "", reason: "הסרטון לא נמצא או לא ניתן לניגון." };
  const data = (await response.json()) as { title?: string };
  return { ok: true, id, title: data.title || "סרטון", reason: "" };
}
