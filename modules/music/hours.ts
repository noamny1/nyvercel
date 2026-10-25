import { israelWall } from "@/modules/broadcast/israel-time";

export const MUSIC_DAYS = [
  ["0", "ראשון"],
  ["1", "שני"],
  ["2", "שלישי"],
  ["3", "רביעי"],
  ["4", "חמישי"],
  ["5", "שישי"],
  ["6", "שבת"],
] as const;

export const DEFAULT_MUSIC_DAYS = "0,1,2,3,4";
export const DEFAULT_MUSIC_FROM = "07:00";
export const DEFAULT_MUSIC_UNTIL = "22:30";

export function musicDaysField(values: string[]) {
  return [...new Set(values.filter((day) => /^[0-6]$/.test(day)))].sort().join(",");
}

export function musicClock(value: string, fallback: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;
}

function minutes(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function musicOnNow(days: string, from: string, until: string, date = new Date()) {
  if (days.trim() === "24/7") return true;
  const picked = new Set(days.split(",").map((day) => day.trim()).filter((day) => /^[0-6]$/.test(day)));
  if (!picked.size) return false;
  const wall = israelWall(date);
  if (!picked.has(String(wall.getUTCDay()))) return false;
  const start = minutes(from) ?? minutes(DEFAULT_MUSIC_FROM)!;
  const end = minutes(until) ?? minutes(DEFAULT_MUSIC_UNTIL)!;
  const now = wall.getUTCHours() * 60 + wall.getUTCMinutes();
  if (start === end) return true;
  if (start < end) return now >= start && now <= end;
  return now >= start || now <= end;
}
