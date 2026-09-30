import { locate } from "@/lib/place";

export async function shabbatFor(city: string) {
  const place = await locate(city || "ירושלים");
  if (!place) return null;
  const url =
    `https://www.hebcal.com/shabbat?cfg=json&M=on&lg=he&tzid=Asia/Jerusalem` +
    `&latitude=${place.latitude}&longitude=${place.longitude}`;
  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    items?: { category: string; title: string; hebrew?: string; date?: string }[];
  };
  const candles = data.items?.find((item) => item.category === "candles");
  const parsha = data.items?.find((item) => item.category === "parashat");
  const time = candles?.title.match(/(\d{1,2}:\d{2})/)?.[1] || "";
  return {
    candles: time,
    parsha: (parsha?.hebrew || parsha?.title || "").replace(/^פרשת\s*/, ""),
  };
}
