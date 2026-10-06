const TURN_HOURS = 3;

export function currentTurn(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  const day = Math.floor(Date.UTC(read("year"), read("month") - 1, read("day")) / 86400000);
  return day * (24 / TURN_HOURS) + Math.floor(read("hour") / TURN_HOURS);
}
