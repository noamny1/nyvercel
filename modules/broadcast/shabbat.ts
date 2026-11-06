import { unstable_cache } from "next/cache";
import { locate } from "@/modules/place/locate";

export type ShabbatReading = {
  candles: string;
  havdalah: string;
  parsha: string;
  city: string;
  verses: string[];
};

export type ShabbatTimes = {
  candles: string;
  havdalah: string;
  parsha: string;
  city: string;
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

function saturdayStamp() {
  const saturday = upcomingSaturday();
  const month = saturday.month < 10 ? `0${saturday.month}` : String(saturday.month);
  const day = saturday.day < 10 ? `0${saturday.day}` : String(saturday.day);
  return `${saturday.year}-${month}-${day}`;
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

function cleanParsha(value: string) {
  return value.replace(/^פרשת\s*/, "").replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, "");
}

async function readTimes(city: string): Promise<ShabbatTimes> {
  const name = city.trim() || "ירושלים";
  const place = await locate(name);
  const saturday = upcomingSaturday();
  if (!place) return { candles: "", havdalah: "", parsha: "", city: name };
  const url = `https://www.hebcal.com/shabbat?cfg=json&lg=he&tzid=Asia/Jerusalem&latitude=${place.latitude}&longitude=${place.longitude}&gy=${saturday.year}&gm=${saturday.month}&gd=${saturday.day}&M=on`;
  const response = await fetch(url, { next: { revalidate: 21600 } });
  if (!response.ok) return { candles: "", havdalah: "", parsha: "", city: name };
  const times = (await response.json()) as { items?: { category: string; title: string; hebrew?: string }[] };
  const candles = times.items?.find((item) => item.category === "candles");
  const havdalah = times.items?.find((item) => item.category === "havdalah");
  const parsha = times.items?.find((item) => item.category === "parashat");
  return {
    candles: candles?.title.match(/(\d{1,2}:\d{2})/)?.[1] || "",
    havdalah: havdalah?.title.match(/(\d{1,2}:\d{2})/)?.[1] || "",
    parsha: cleanParsha(parsha?.hebrew || parsha?.title || ""),
    city: name,
  };
}

async function readPortion(stamp: string) {
  const headers = { Accept: "application/json", "User-Agent": "NYMedia/1.0 (nytv.app)" };
  const readingResponse = await fetch(`https://www.hebcal.com/leyning?cfg=json&i=on&date=${stamp}`, { cache: "no-store", headers });
  if (!readingResponse.ok) return { parsha: "", verses: [] as string[] };
  const reading = (await readingResponse.json()) as { items?: { summary?: string; name?: { he?: string } }[] };
  const item = reading.items?.find((entry) => entry.summary) || reading.items?.[0];
  const summary = item?.summary || "";
  const parsha = cleanParsha(item?.name?.he || "");
  if (!summary) return { parsha, verses: [] as string[] };
  const textResponse = await fetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(summary)}?context=0&commentary=0`, { cache: "no-store", headers });
  if (!textResponse.ok) return { parsha, verses: [] as string[] };
  const text = (await textResponse.json()) as { he?: unknown };
  const verses: string[] = [];
  versesFrom(text.he, verses);
  return { parsha, verses };
}

const timesFor = unstable_cache(readTimes, ["shabbat-times"], { revalidate: 21600 });
const portionFor = unstable_cache(readPortion, ["weekly-portion-v4"], { revalidate: 43200 });
const paceFor = unstable_cache(async (stamp: string) => {
  const portion = await portionFor(stamp);
  const count = portion.verses.length || 40;
  return Math.max(180, Math.round(count * 2.2));
}, ["parasha-pace"], { revalidate: 43200 });

export async function shabbatTimes(city: string) {
  return timesFor(city.trim() || "ירושלים");
}

export async function weeklyPortion() {
  return portionFor(saturdayStamp());
}

export async function parashaPace() {
  return paceFor(saturdayStamp());
}

export async function shabbatFor(city: string): Promise<ShabbatReading | null> {
  const [times, portion] = await Promise.all([
    shabbatTimes(city).catch(() => ({ candles: "", havdalah: "", parsha: "", city: city.trim() || "ירושלים" })),
    weeklyPortion().catch(() => ({ parsha: "", verses: [] as string[] })),
  ]);
  return {
    candles: times.candles,
    havdalah: times.havdalah,
    parsha: portion.parsha || times.parsha,
    city: times.city,
    verses: portion.verses,
  };
}
