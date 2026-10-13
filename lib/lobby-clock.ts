const WEEKDAYS: Record<string, string> = {
  Sun: "יום ראשון",
  Mon: "יום שני",
  Tue: "יום שלישי",
  Wed: "יום רביעי",
  Thu: "יום חמישי",
  Fri: "יום שישי",
  Sat: "יום שבת",
};
const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

export function lobbyClock(date = new Date()) {
  const zone = "Asia/Jerusalem";
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short" }).format(date);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: zone, day: "numeric" }).format(date);
  const month = Number(new Intl.DateTimeFormat("en-US", { timeZone: zone, month: "numeric" }).format(date));
  const year = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric" }).format(date);
  const civil = `${WEEKDAYS[weekday] || weekday}, ${day} ב${MONTHS[month - 1] || ""} ${year}`;
  let hebrew = "";
  try {
    const parts = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", { timeZone: zone, day: "numeric", month: "long", year: "numeric" }).formatToParts(date);
    const hDay = Number(parts.find((part) => part.type === "day")?.value || "");
    const hMonth = parts.find((part) => part.type === "month")?.value || "";
    const hYear = Number(parts.find((part) => part.type === "year")?.value || "");
    if (hDay && hMonth) hebrew = `${hebrewNumber(hDay)} ב${hMonth}${hYear ? ` ${hebrewYear(hYear)}` : ""}`;
  } catch { /* keep the civil date if the Hebrew calendar is missing */ }
  return { time, civil, hebrew };
}

function hebrewYear(year: number) {
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const hundreds = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
  let rest = year % 1000;
  const head = hundreds[Math.floor(rest / 100)] || "";
  rest %= 100;
  let tail = "";
  if (rest === 15) tail = "ט״ו";
  else if (rest === 16) tail = "ט״ז";
  else if (rest > 0) {
    const letters = `${tens[Math.floor(rest / 10)] || ""}${ones[rest % 10] || ""}`;
    tail = letters.length < 2 ? `${letters}׳` : `${letters.slice(0, -1)}״${letters.slice(-1)}`;
  }
  return `${head}${tail}`;
}

function hebrewNumber(value: number) {
  if (value === 15) return "ט״ו";
  if (value === 16) return "ט״ז";
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל"];
  const letters = `${tens[Math.floor(value / 10)] || ""}${ones[value % 10] || ""}`;
  if (letters.length < 2) return `${letters}׳`;
  return `${letters.slice(0, -1)}״${letters.slice(-1)}`;
}
