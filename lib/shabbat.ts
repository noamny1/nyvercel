import { locate } from "@/lib/place";

export type ShabbatReading = {
  candles: string;
  havdalah: string;
  parsha: string;
  city: string;
  verses: string[];
};

function jerusalemNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(new Date());
  const pick = (type: string) => parts.find((part) => part.type === type)?.value || "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(pick("weekday"));
  return {
    year: Number(pick("year")),
    month: Number(pick("month")),
    day: Number(pick("day")),
    hour: Number(pick("hour")),
    weekday,
  };
}

function upcomingSaturday() {
  const now = jerusalemNow();
  let days = (6 - now.weekday + 7) % 7;
  if (now.weekday === 6 && now.hour >= 21) days = 7;
  const date = new Date(Date.UTC(now.year, now.month - 1, now.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function plain(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&thinsp;|&nbsp;|&#160;/g, " ")
    .replace(/\{[פס]\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function versesFrom(value: unknown, out: string[]) {
  if (typeof value === "string") {
    const text = plain(value);
    if (text) out.push(text);
    return;
  }
  if (Array.isArray(value)) value.forEach((item) => versesFrom(item, out));
}

export async function shabbatFor(city: string): Promise<ShabbatReading | null> {
  const name = city.trim() || "ירושלים";
  const place = await locate(name);
  if (!place) return null;
  const saturday = upcomingSaturday();
  const stamp = `${saturday.year}-${saturday.month}-${saturday.day}`;
  const base = `cfg=json&lg=he&tzid=Asia/Jerusalem&latitude=${place.latitude}&longitude=${place.longitude}&gy=${saturday.year}&gm=${saturday.month}&gd=${saturday.day}`;
  const [timesResponse, readingResponse] = await Promise.all([
    fetch(`https://www.hebcal.com/shabbat?${base}&M=on`, { next: { revalidate: 21600 } }),
    fetch(`https://www.hebcal.com/leyning?cfg=json&i=on&date=${stamp}`, { next: { revalidate: 21600 } }),
  ]);
  if (!timesResponse.ok) return null;
  const times = (await timesResponse.json()) as {
    items?: { category: string; title: string; hebrew?: string }[];
  };
  const candles = times.items?.find((item) => item.category === "candles");
  const havdalah = times.items?.find((item) => item.category === "havdalah");
  const parsha = times.items?.find((item) => item.category === "parashat");
  const reading = readingResponse.ok
    ? ((await readingResponse.json()) as { items?: { summary?: string; name?: { he?: string } }[] })
    : null;
  const summary = reading?.items?.[0]?.summary || "";
  let verses: string[] = [];
  if (summary) {
    const textResponse = await fetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(summary)}?context=0&commentary=0`, {
      next: { revalidate: 21600 },
    });
    if (textResponse.ok) {
      const text = (await textResponse.json()) as { he?: unknown };
      versesFrom(text.he, verses);
    }
  }
  return {
    candles: candles?.title.match(/(\d{1,2}:\d{2})/)?.[1] || "",
    havdalah: havdalah?.title.match(/(\d{1,2}:\d{2})/)?.[1] || "",
    parsha: (parsha?.hebrew || reading?.items?.[0]?.name?.he || parsha?.title || "").replace(/^פרשת\s*/, "").replace(/[֑-֯]/g, ""),
    city: name,
    verses,
  };
}
