const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

export const PAID = "שולם";
export const UNPAID = "לא שולם";

export function recentPayMonths(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", year: "numeric", month: "numeric" }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value || "0");
  const month = Number(parts.find((part) => part.type === "month")?.value || "1");
  return [2, 1, 0].map((offset) => {
    const point = new Date(Date.UTC(year, month - 1 - offset, 1));
    return `${MONTHS[point.getUTCMonth()]} ${String(point.getUTCFullYear()).slice(2)}`;
  });
}

export function isPaid(value: string) {
  const text = value.trim();
  if (!text || text === UNPAID || text.includes("ממתין") || text.includes("לא שולם")) return false;
  return text === PAID || text.includes("חשבונית") || text.includes("קבלה") || text.includes("שולם");
}
