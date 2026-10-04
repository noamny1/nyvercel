export type SlideMeta = { day?: string; from?: string; to?: string };
export type ReadySlide = {
  id: string;
  category: string;
  title: string;
  line: string;
  image: string;
  day?: "weekday" | "text";
  from?: boolean;
  to?: boolean;
  defaults: SlideMeta;
};

export const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export const READY_CATEGORIES = [
  "הודעות וועד",
  "הודעות כלליות",
  "ברכות",
  "מועדים וחגים",
  "הודעות יומיות",
  "זכויות מדייר",
] as const;

export const READY_SLIDES: ReadySlide[] = [
  { id: "vaad-meeting", category: "הודעות וועד", title: "אסיפת דיירים", line: "ביום {day} בשעה {from} בלובי", image: "/ready-slides/vaad-meeting.jpg", day: "weekday", from: true, defaults: { day: "שלישי", from: "20:00" } },
  { id: "vaad-fee", category: "הודעות וועד", title: "דמי ועד בית", line: "התשלום מתבצע עד ה־{day} בחודש", image: "/ready-slides/vaad-fee.jpg", day: "text", defaults: { day: "10" } },
  { id: "vaad-vote", category: "הודעות וועד", title: "בחירות לוועד", line: "אפשר להצביע אצל נציג הוועד", image: "/ready-slides/vaad-vote.jpg", defaults: {} },
  { id: "vaad-work", category: "הודעות וועד", title: "עבודות תחזוקה", line: "העבודות ביום {day}", image: "/ready-slides/vaad-work.jpg", day: "weekday", defaults: { day: "רביעי" } },
  { id: "general-parking", category: "הודעות כלליות", title: "חניה", line: "החניה שמורה לדיירי הבניין", image: "/ready-slides/general-parking.jpg", defaults: {} },
  { id: "general-clean", category: "הודעות כלליות", title: "ניקיון", line: "ניקיון הלובי מתבצע בכל בוקר", image: "/ready-slides/general-clean.jpg", defaults: {} },
  { id: "general-hours", category: "הודעות כלליות", title: "קבלת קהל", line: "הוועד זמין בימים {day} עד {from}", image: "/ready-slides/general-hours.jpg", day: "text", from: true, defaults: { day: "א׳–ה׳", from: "19:00" } },
  { id: "general-cameras", category: "הודעות כלליות", title: "אבטחה", line: "הלובי והחניה מצולמים", image: "/ready-slides/general-cameras.jpg", defaults: {} },
  { id: "greet-shabbat", category: "ברכות", title: "שבת שלום", line: "מאחלים לכל הדיירים שבת שקטה", image: "/ready-slides/greet-shabbat.jpg", defaults: {} },
  { id: "greet-mazal", category: "ברכות", title: "מזל טוב", line: "ברכות למשפחה החדשה בבניין", image: "/ready-slides/greet-mazal.jpg", defaults: {} },
  { id: "greet-welcome", category: "ברכות", title: "ברוכים הבאים", line: "שמחים לארח אתכם בלובי", image: "/ready-slides/greet-welcome.jpg", defaults: {} },
  { id: "greet-holiday", category: "ברכות", title: "חג שמח", line: "הבניין מאחל חג שמח", image: "/ready-slides/greet-holiday.jpg", defaults: {} },
  { id: "holiday-rosh", category: "מועדים וחגים", title: "שנה טובה", line: "מאחלים שנה טובה ומתוקה", image: "/ready-slides/holiday-rosh.jpg", defaults: {} },
  { id: "holiday-kippur", category: "מועדים וחגים", title: "גמר חתימה טובה", line: "צום קל ומועיל לכל הדיירים", image: "/ready-slides/holiday-kippur.jpg", defaults: {} },
  { id: "holiday-hanukka", category: "מועדים וחגים", title: "חנוכה שמח", line: "הדלקת נרות בלובי בשעה {from}", image: "/ready-slides/holiday-hanukka.jpg", from: true, defaults: { from: "17:30" } },
  { id: "holiday-pesach", category: "מועדים וחגים", title: "חג פסח שמח", line: "חג כשר ושמח לכל דיירי הבניין", image: "/ready-slides/holiday-pesach.jpg", defaults: {} },
  { id: "daily-water", category: "הודעות יומיות", title: "הפסקת מים", line: "היום בין {from} ל־{to}", image: "/ready-slides/daily-water.jpg", from: true, to: true, defaults: { from: "09:00", to: "11:00" } },
  { id: "daily-elevator", category: "הודעות יומיות", title: "מעלית", line: "בדיקה בין {from} ל־{to}", image: "/ready-slides/daily-elevator.jpg", from: true, to: true, defaults: { from: "10:00", to: "12:00" } },
  { id: "daily-power", category: "הודעות יומיות", title: "הפסקת חשמל", line: "היום בין {from} ל־{to}", image: "/ready-slides/daily-power.jpg", from: true, to: true, defaults: { from: "14:00", to: "14:30" } },
  { id: "daily-trash", category: "הודעות יומיות", title: "פינוי אשפה", line: "הפינוי בימים {day}", image: "/ready-slides/daily-trash.jpg", day: "text", defaults: { day: "א׳, ג׳ ו־ה׳" } },
  { id: "rights-quiet", category: "זכויות מדייר", title: "שקט", line: "בין {from} ל־{to} ומשעה 23:00", image: "/ready-slides/rights-quiet.jpg", from: true, to: true, defaults: { from: "14:00", to: "16:00" } },
  { id: "rights-shared", category: "זכויות מדייר", title: "רכוש משותף", line: "הלובי והחצר שייכים לכל הדיירים", image: "/ready-slides/rights-shared.jpg", defaults: {} },
  { id: "rights-pets", category: "זכויות מדייר", title: "חיות מחמד", line: "יש לשמור על ניקיון השטחים המשותפים", image: "/ready-slides/rights-pets.jpg", defaults: {} },
  { id: "rights-reno", category: "זכויות מדייר", title: "שיפוץ", line: "עבודות רועשות בין {from} ל־{to}", image: "/ready-slides/rights-reno.jpg", from: true, to: true, defaults: { from: "08:00", to: "17:00" } },
];

export function fillLine(line: string, meta: SlideMeta) {
  return line.replaceAll("{day}", meta.day || "").replaceAll("{from}", meta.from || "").replaceAll("{to}", meta.to || "");
}

export function readMeta(value: string, fallback: SlideMeta): SlideMeta {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as SlideMeta;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}
