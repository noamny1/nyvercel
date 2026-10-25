const WEEKDAYS = ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "יום שבת"];
const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

function lastSunday(year: number, month: number) {
  const last = new Date(Date.UTC(year, month + 1, 0));
  return last.getUTCDate() - last.getUTCDay();
}

// Israel since 2013: Friday before the last Sunday of March, 02:00, until the last Sunday of October, 02:00.
export function israelOffsetHours(date: Date) {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 2, lastSunday(year, 2) - 2, 0, 0, 0);
  const end = Date.UTC(year, 9, lastSunday(year, 9) - 1, 23, 0, 0);
  const time = date.getTime();
  return time >= start && time < end ? 3 : 2;
}

export function israelWall(date = new Date()) {
  return new Date(date.getTime() + israelOffsetHours(date) * 3600000);
}

export function israelClock(date = new Date()) {
  const wall = israelWall(date);
  const hours = wall.getUTCHours();
  const minutes = wall.getUTCMinutes();
  return `${hours < 10 ? "0" : ""}${hours}:${minutes < 10 ? "0" : ""}${minutes}`;
}

export function israelCivil(date = new Date(), withYear = true) {
  const wall = israelWall(date);
  const line = `${WEEKDAYS[wall.getUTCDay()]}, ${wall.getUTCDate()} ב${MONTHS[wall.getUTCMonth()]}`;
  return withYear ? `${line} ${wall.getUTCFullYear()}` : line;
}

export function israelHour(date = new Date()) {
  return israelWall(date).getUTCHours();
}
