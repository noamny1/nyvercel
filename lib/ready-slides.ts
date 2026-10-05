export type SlideMeta = { day?: string; from?: string; to?: string; flow?: "scroll" | "static" };
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
  "תוכן לדרך",
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
  { id: "weekly-parasha", category: "ברכות", title: "פרשת השבוע", line: "השם מתעדכן לבד בכל שבוע", image: "/ready-slides/greet-shabbat.jpg", defaults: {} },
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
  { id: "daily-health", category: "תוכן לדרך", title: "טיפ בריאות יומי", line: "כל יום טיפ אחר, עם כמה משפטים קצרים", image: "/decks/water.jpg", defaults: {} },
  { id: "did-you-know", category: "תוכן לדרך", title: "הידעת", line: "כל יום נושא אחר לעוברים בלובי", image: "/decks/city.jpg", defaults: {} },
  { id: "street-people", category: "תוכן לדרך", title: "אנשים", line: "כל יום אדם שעל שמו יש רחוב בישראל", image: "/decks/stone.jpg", defaults: {} },
];

export function defaultWeekdays(templateId = "", title = "") {
  return templateId === "greet-shabbat" || templateId === "weekly-parasha" || /שבת|פרש/.test(title) ? "56" : "01234";
}

export function fillLine(line: string, meta: SlideMeta) {
  return line.replaceAll("{day}", meta.day || "").replaceAll("{from}", meta.from || "").replaceAll("{to}", meta.to || "");
}

export function templateSeconds(id: string) {
  if (id === "weekly-parasha") return 180;
  if (id === "daily-health" || id === "did-you-know" || id === "street-people") return 32;
  return 10;
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

// The six character clips in public/safety are finished videos:
// full head, the site logo printed on the shirt, Hebrew title in the frame.
// Do not rerun scripts/stamp-shirt.py over them.
export const FIXED_VIDEOS = [
  { id: "fixed-alarm", title: "אזעקה", line: "נכנסים למרחב המוגן וסוגרים את הדלת", url: "/safety/alarm.mp4?v=3", poster: "/safety/alarm.jpg?v=3", duration: 10 },
  { id: "fixed-fire-own", title: "שריפה", line: "לא במעלית. יורדים במדרגות ומתקשרים 102", url: "/safety/fire.mp4?v=3", poster: "/safety/fire.jpg?v=3", duration: 10 },
  { id: "fixed-gas", title: "ריח גז", line: "סוגרים את הברז, פותחים חלון, לא מדליקים חשמל", url: "/safety/gas.mp4?v=3", poster: "/safety/gas.jpg?v=3", duration: 10 },
  { id: "fixed-quake", title: "רעידת אדמה", line: "שטח פתוח, מרחב מוגן או מדרגות. לא מעלית", url: "/safety/quake.mp4?v=3", poster: "/safety/quake.jpg?v=3", duration: 10 },
  { id: "fixed-tidy", title: "ניקיון וסדר", line: "בלי שקיות, קרטונים ועגלות בלובי", url: "/safety/tidy.mp4?v=3", poster: "/safety/tidy.jpg?v=3", duration: 10 },
  { id: "fixed-clear", title: "מעבר פנוי", line: "המדרגות והמסדרון נשארים פתוחים", url: "/safety/clear.mp4?v=3", poster: "/safety/clear.jpg?v=3", duration: 10 },
  { id: "fixed-mda", title: "מד״א", line: "עזרה ראשונה רשמית: אדם שהתמוטט. חייגו 101", url: "https://www.youtube.com/watch?v=R8h0SwzNW2I", poster: "https://i.ytimg.com/vi/R8h0SwzNW2I/hqdefault.jpg", duration: 45 },
  { id: "fixed-oref", title: "פיקוד העורף", line: "הנחיות רשמיות, בלי כיתוב שלנו", url: "https://www.youtube.com/watch?v=5ad9OJxVSd0", poster: "https://i.ytimg.com/vi/5ad9OJxVSd0/hqdefault.jpg", duration: 94 },
  { id: "fixed-oref-room", title: "מרחב מוגן", line: "איך בוחרים מרחב מוגן. סרטון פיקוד העורף", url: "https://www.youtube.com/watch?v=Vd7hpbQatvY", poster: "https://i.ytimg.com/vi/Vd7hpbQatvY/hqdefault.jpg", duration: 151 },
  { id: "fixed-fire", title: "כיבוי אש", line: "בטיחות אש ברבי קומות. הסרטון הרשמי", url: "https://www.youtube.com/watch?v=sgnYcSj5qok", poster: "https://i.ytimg.com/vi/sgnYcSj5qok/hqdefault.jpg", duration: 102 },
] as const;
