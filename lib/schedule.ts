const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function jerusalem(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now).map((part) => [part.type, part.value]),
  );
  return {
    day: WEEK.indexOf(parts.weekday),
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function newsTickerOn(mode: string, now = new Date()) {
  if (mode === "off") return false;
  if (mode === "weekend") {
    const { day } = jerusalem(now);
    return day !== 5 && day !== 6;
  }
  return true;
}

export function slideIsOn(
  slide: { active: boolean; weekdays: string; startsOn?: string | null; endsOn?: string | null },
  now = new Date(),
) {
  if (!slide.active) return false;
  const { day, ymd } = jerusalem(now);
  const days = slide.weekdays ?? "01234";
  if (!days.includes(String(day))) return false;
  if (slide.startsOn && ymd < slide.startsOn) return false;
  if (slide.endsOn && ymd > slide.endsOn) return false;
  return true;
}

const SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

export function scheduleLabel(weekdays: string, startsOn = "", endsOn = "") {
  const days = SHORT.filter((_, index) => weekdays.includes(String(index)));
  const when = days.length === 7 ? "כל השבוע" : days.length === 0 ? "אף יום" : days.join(" ");
  const range = !startsOn && !endsOn ? "לעד" : `${startsOn || "—"} עד ${endsOn || "לעד"}`;
  return `${when} · ${range}`;
}