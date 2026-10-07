export type SlideMeta = { day?: string; from?: string; to?: string; flow?: "scroll" | "static" };
export type ReadySlide = {
  id: string;
  category: string;
  title: string;
  line: string;
  image: string;
  day?: "weekday" | "text";
  prompt?: string;
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
  "ימים לאומיים",
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
  { id: "rule-smoke", category: "הודעות כלליות", title: "איסור עישון", line: "העישון אסור בלובי, במדרגות ובמעלית.\nתודה ששומרים על אוויר נקי לכל הדיירים.", image: "/ready-slides/rule-smoke.jpg", defaults: {} },
  { id: "rule-bikes", category: "הודעות כלליות", title: "אופניים וקורקינט", line: "אופניים וקורקינט לא משאירים במעבר.\nהלובי, המדרגות והמסדרון נשארים פנויים.", image: "/ready-slides/rule-bikes.jpg", defaults: {} },
  { id: "rule-guests", category: "הודעות כלליות", title: "חניות אורחים", line: "חניות האורחים מיועדות לאורחים בלבד.\nדיירים מחנים בחניה השמורה להם.", image: "/ready-slides/rule-guests.jpg", defaults: {} },
  { id: "rule-packages", category: "הודעות כלליות", title: "איסוף חבילות", line: "חבילה מחכה בלובי? אפשר לאסוף אותה אצל הוועד.\nלא משאירים קרטונים וחבילות במעבר.", image: "/ready-slides/rule-packages.jpg", defaults: {} },
  { id: "rule-recycle", category: "הודעות כלליות", title: "מחזור", line: "מפרידים פסולת: נייר, אריזות, בקבוקים ופסולת רגילה.\nכך הלובי נשאר נקי, וכולם נהנים.", image: "/ready-slides/rule-recycle.jpg", defaults: {} },
  { id: "greet-shabbat", category: "ברכות", title: "שבת שלום", line: "מאחלים לכל הדיירים שבת שקטה", image: "/ready-slides/greet-shabbat.jpg", defaults: {} },
  { id: "weekly-parasha", category: "ברכות", title: "פרשת השבוע", line: "השם מתעדכן לבד בכל שבוע", image: "/ready-slides/greet-shabbat.jpg", defaults: {} },
  { id: "greet-mazal", category: "ברכות", title: "מזל טוב", line: "מזל טוב.\nשתהיה זו שמחה גדולה, ובריאות לכל המשפחה.", image: "/ready-slides/greet-mazal.jpg", defaults: {} },
  { id: "greet-welcome", category: "ברכות", title: "ברוכים הבאים", line: "שמחים לארח אתכם בלובי", image: "/ready-slides/greet-welcome.jpg", defaults: {} },
  { id: "greet-holiday", category: "ברכות", title: "חג שמח", line: "חג שמח לכל דיירי הבניין.\nמאחלים ימים של שמחה, בריאות ושקט בבית.", image: "/ready-slides/greet-holiday.jpg", defaults: {} },
  { id: "greet-building", category: "ברכות", title: "ברכת הבניין", line: "הבית הזה הוא המקום של כולנו.\nכאן אנחנו שכנים, וגם קהילה אחת.\nשומרים זה על זה, על הלובי ועל השקט.\nמאחלים לכל דייר ודיירת בריאות, פרנסה ושכנות טובה.\nשנזכה תמיד לעלות ולרדת בשלום.", image: "/ready-slides/greet-building.jpg", defaults: {} },
  { id: "greet-family", category: "ברכות", title: "משפחה חדשה", line: "ברוכים הבאים למשפחת {day} שהצטרפה לבניין.\nשמחים שהגעתם. מאחלים לכם בית חם ושכנות טובה.", image: "/ready-slides/greet-family.jpg", day: "text", prompt: "שם המשפחה", defaults: { day: "ישראל" } },
  { id: "greet-birthday", category: "ברכות", title: "יום הולדת", line: "יום הולדת שמח ל{day}.\nמאחלים שנה של בריאות, שמחה והרבה רגעים טובים.", image: "/ready-slides/greet-birthday.jpg", day: "text", prompt: "שם", defaults: { day: "ישראל" } },
  { id: "greet-birth", category: "ברכות", title: "לידה", line: "מזל טוב למשפחת {day} על הלידה.\nמאחלים בריאות להורים ולתינוק, ושמחה גדולה בבית.", image: "/ready-slides/greet-birth.jpg", day: "text", prompt: "שם המשפחה", defaults: { day: "ישראל" } },
  { id: "greet-barmitzvah", category: "ברכות", title: "בר או בת מצווה", line: "מזל טוב ל{day} לבר או לבת המצווה.\nמאחלים המשך דרך של שמחה, בריאות וברכה.", image: "/ready-slides/greet-barmitzvah.jpg", day: "text", prompt: "שם", defaults: { day: "ישראל" } },
  { id: "greet-wedding", category: "ברכות", title: "חתונה", line: "מזל טוב ל{day} לחתונה.\nמאחלים בית של שמחה, בריאות ואהבה.", image: "/ready-slides/greet-wedding.jpg", day: "text", prompt: "שמות", defaults: { day: "הזוג" } },
  { id: "greet-refua", category: "ברכות", title: "רפואה שלמה", line: "רפואה שלמה ל{day}.\nכל הבניין מאחל החלמה מהירה וחזרה הביתה בשלום.", image: "/ready-slides/greet-refua.jpg", day: "text", prompt: "שם", defaults: { day: "ישראל" } },
  { id: "greet-condolence", category: "ברכות", title: "השתתפות בצער", line: "הבניין משתתף בצער משפחת {day}.\nיהי זכרם ברוך. מאחלים נחמה וכוח.", image: "/ready-slides/greet-condolence.jpg", day: "text", prompt: "שם המשפחה", defaults: { day: "ישראל" } },
  { id: "custom-text", category: "הודעות כלליות", title: "ההודעה שלכם", line: "כאן כותבים את ההודעה לדיירים.\nאפשר למחוק את המשפט הזה ולכתוב כל מלל שתרצו.", image: "/ready-slides/custom-text.jpg", defaults: {} },
  { id: "holiday-rosh", category: "מועדים וחגים", title: "שנה טובה", line: "שנה טובה ומתוקה לכל דיירי הבניין.\nשתהיה זו שנה של בריאות, שקט וברכה.", image: "/ready-slides/holiday-rosh.jpg", defaults: {} },
  { id: "holiday-gedalia", category: "מועדים וחגים", title: "צום גדליה", line: "צום גדליה.\nצום קל ומועיל, ושתהיה זו שנה של אחדות בבית.", image: "/ready-slides/holiday-fast.jpg", defaults: {} },
  { id: "holiday-kippur", category: "מועדים וחגים", title: "גמר חתימה טובה", line: "גמר חתימה טובה.\nצום קל ומועיל, ושנזכה לשנה של שלום בבית.", image: "/ready-slides/holiday-kippur.jpg", defaults: {} },
  { id: "holiday-sukkot", category: "מועדים וחגים", title: "חג סוכות שמח", line: "חג סוכות שמח.\nמאחלים חג של שמחה, אורחים טובים וסוכה של שלום.", image: "/ready-slides/holiday-sukkot.jpg", defaults: {} },
  { id: "holiday-simchat", category: "מועדים וחגים", title: "שמחת תורה", line: "שמיני עצרת ושמחת תורה שמח.\nשמחים בתורה, ומאחלים לכל הבית חג של אור.", image: "/ready-slides/holiday-simchat.jpg", defaults: {} },
  { id: "holiday-hanukka", category: "מועדים וחגים", title: "חנוכה שמח", line: "חנוכה שמח.\nשיהיה אור בבית, ושמחה בכל דירה.", image: "/ready-slides/holiday-hanukka.jpg", defaults: {} },
  { id: "holiday-asara", category: "מועדים וחגים", title: "עשרה בטבת", line: "עשרה בטבת, יום של זיכרון.\nמאחלים לכל הבית בשורות טובות.", image: "/ready-slides/holiday-fast.jpg", defaults: {} },
  { id: "holiday-tubishvat", category: "מועדים וחגים", title: "ט״ו בשבט", line: "ט״ו בשבט שמח.\nשנה של צמיחה, פריחה וברכה לכל הבניין.", image: "/ready-slides/holiday-tubishvat.jpg", defaults: {} },
  { id: "holiday-esther", category: "מועדים וחגים", title: "תענית אסתר", line: "תענית אסתר.\nצום קל, ומכאן לפורים שמח.", image: "/ready-slides/holiday-fast.jpg", defaults: {} },
  { id: "holiday-purim", category: "מועדים וחגים", title: "פורים שמח", line: "פורים שמח.\nשתהיה שמחה בבניין, ומשלוח מנות של שכנות טובה.", image: "/ready-slides/holiday-purim.jpg", defaults: {} },
  { id: "holiday-pesach", category: "מועדים וחגים", title: "חג פסח שמח", line: "חג פסח כשר ושמח.\nמאחלים חג של חירות, משפחה ושולחן מלא ברכה.", image: "/ready-slides/holiday-pesach.jpg", defaults: {} },
  { id: "holiday-lag", category: "מועדים וחגים", title: "ל״ג בעומר", line: "ל״ג בעומר שמח.\nיום של אור, שמחה ואחדות לכל דיירי הבית.", image: "/ready-slides/holiday-lag.jpg", defaults: {} },
  { id: "holiday-shavuot", category: "מועדים וחגים", title: "חג שבועות שמח", line: "חג שבועות שמח.\nחג של תורה, ביכורים וברכה לכל הבניין.", image: "/ready-slides/holiday-shavuot.jpg", defaults: {} },
  { id: "holiday-tamuz", category: "מועדים וחגים", title: "י״ז בתמוז", line: "י״ז בתמוז.\nצום קל לכל דיירי הבניין.", image: "/ready-slides/holiday-fast.jpg", defaults: {} },
  { id: "holiday-av", category: "מועדים וחגים", title: "תשעה באב", line: "תשעה באב, יום של זיכרון.\nשנזכה לנחמה, לאחדות ולבשורות טובות.", image: "/ready-slides/holiday-av.jpg", defaults: {} },
  { id: "holiday-tubav", category: "מועדים וחגים", title: "ט״ו באב", line: "ט״ו באב שמח.\nיום של אהבה, שמחה וברכה לכל הבית.", image: "/ready-slides/holiday-tubav.jpg", defaults: {} },
  { id: "nation-shoah", category: "ימים לאומיים", title: "יום השואה", line: "יום הזיכרון לשואה ולגבורה.\nזוכרים. מאחלים שהזיכרון יישאר חי בכל בית.", image: "/ready-slides/nation-shoah.jpg", defaults: {} },
  { id: "nation-zikaron", category: "ימים לאומיים", title: "יום הזיכרון", line: "יום הזיכרון לחללי מערכות ישראל.\nעומדים דום בזיכרון, ומאחלים נחמה למשפחות.", image: "/ready-slides/nation-zikaron.jpg", defaults: {} },
  { id: "nation-atzmaut", category: "ימים לאומיים", title: "יום העצמאות", line: "יום העצמאות שמח.\nמאחלים לכל דיירי הבניין יום של שמחה, אחדות ושקט.", image: "/ready-slides/nation-atzmaut.jpg", defaults: {} },
  { id: "nation-yerushalayim", category: "ימים לאומיים", title: "יום ירושלים", line: "יום ירושלים שמח.\nמאחלים לכל הבית ימים של שמחה, אחדות וברכה.", image: "/ready-slides/nation-yerushalayim.jpg", defaults: {} },
  { id: "daily-water", category: "הודעות יומיות", title: "הפסקת מים", line: "היום בין {from} ל־{to}", image: "/ready-slides/daily-water.jpg", from: true, to: true, defaults: { from: "09:00", to: "11:00" } },
  { id: "daily-elevator", category: "הודעות יומיות", title: "מעלית", line: "בדיקה בין {from} ל־{to}", image: "/ready-slides/daily-elevator.jpg", from: true, to: true, defaults: { from: "10:00", to: "12:00" } },
  { id: "daily-power", category: "הודעות יומיות", title: "הפסקת חשמל", line: "היום בין {from} ל־{to}", image: "/ready-slides/daily-power.jpg", from: true, to: true, defaults: { from: "14:00", to: "14:30" } },
  { id: "fault-water", category: "הודעות יומיות", title: "תקלת מים", line: "ביום {day} בין {from} ל־{to} יש תקלת מים או עבודה יזומה בבניין.\nהמים עלולים להיפסק לזמן קצר. תודה על הסבלנות.", image: "/ready-slides/daily-water.jpg", day: "weekday", from: true, to: true, defaults: { day: "שלישי", from: "09:00", to: "12:00" } },
  { id: "fault-power", category: "הודעות יומיות", title: "תקלת חשמל", line: "ביום {day} בין {from} ל־{to} יש תקלת חשמל או עבודה יזומה בבניין.\nהחשמל עלול להיפסק לזמן קצר. בזמן ההפסקה לא משתמשים במעלית.", image: "/ready-slides/daily-power.jpg", day: "weekday", from: true, to: true, defaults: { day: "רביעי", from: "10:00", to: "13:00" } },
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
  if (id === "fault-water" || id === "fault-power") return 16;
  if (id === "daily-health" || id === "did-you-know" || id === "street-people") return 32;
  if (id === "greet-building") return 24;
  if (id === "custom-text" || id === "greet-family" || id.startsWith("nation-") || id === "greet-birthday" || id === "greet-birth" || id === "greet-barmitzvah" || id === "greet-wedding" || id === "greet-refua" || id === "greet-condolence") return 18;
  if (id.startsWith("holiday-") || id === "greet-holiday") return 14;
  if (id.startsWith("rule-")) return 12;
  return 10;
}

export function clientSetsDuration(templateId?: string) {
  return templateId === "fixed-pest";
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

export const FIXED_VIDEOS = [
  { id: "fixed-alarm", title: "אזעקה", line: "כשנשמעת אזעקה, נכנסים למרחב המוגן וסוגרים את הדלת. נשארים שם עד להודעה שאפשר לצאת.", url: "/safety/alarm.mp4?v=16", poster: "/safety/alarm.jpg?v=16", duration: 10 },
  { id: "fixed-fire-own", title: "שריפה", line: "בשריפה לא נכנסים למעלית, ויורדים במדרגות. מתקשרים לכיבוי אש במספר 102.", url: "/safety/fire.mp4?v=16", poster: "/safety/fire.jpg?v=16", duration: 10 },
  { id: "fixed-gas", title: "ריח גז", line: "אם מריחים גז, סוגרים את הברז ופותחים חלון. לא מדליקים חשמל, ומתקשרים 103.", url: "/safety/gas.mp4?v=16", poster: "/safety/gas.jpg?v=16", duration: 10 },
  { id: "fixed-quake", title: "רעידת אדמה", line: "ברעידת אדמה יוצאים לשטח פתוח, או נכנסים למרחב מוגן. לא משתמשים במעלית.", url: "/safety/quake.mp4?v=16", poster: "/safety/quake.jpg?v=16", duration: 10 },
  { id: "fixed-tidy", title: "ניקיון וסדר", line: "שומרים על לובי נקי לכולם. לא משאירים שקיות, קרטונים ועגלות במעבר.", url: "/safety/tidy.mp4?v=16", poster: "/safety/tidy.jpg?v=16", duration: 10 },
  { id: "fixed-clear", title: "מעבר פנוי", line: "המדרגות והמסדרון נשארים פתוחים תמיד. לא חוסמים אותם בחפצים, גם לא לכמה דקות.", url: "/safety/clear.mp4?v=16", poster: "/safety/clear.jpg?v=16", duration: 10 },
  { id: "fixed-pest", title: "הדברה", line: "ביום ובשעה שהלקוח בוחר. סוגרים חלונות בזמן ההדברה.", url: "/safety/pest.mp4?v=16", poster: "/safety/pest.jpg?v=16", duration: 10 },
  { id: "fixed-trash", title: "אשפה ומיחזור", line: "לא משאירים שקיות במסדרון. יורדים לחדר האשפה ומפרידים למיחזור.", url: "/safety/trash.mp4?v=17", poster: "/safety/trash.jpg?v=17", duration: 10 },
  { id: "fixed-elevator", title: "מעלית", line: "לא חוסמים את דלת המעלית, ולא שולחים ילד קטן לבד.", url: "/safety/elevator.mp4?v=17", poster: "/safety/elevator.jpg?v=17", duration: 10 },
  { id: "fixed-quiet", title: "שעות שקט", line: "בשעות המנוחה בלי שיפוץ, קידוח או מוזיקה חזקה.", url: "/safety/quiet.mp4?v=17", poster: "/safety/quiet.jpg?v=17", duration: 10 },
  { id: "fixed-guests", title: "אורחים", line: "לא פותחים את דלת הבניין לזר. משתמשים באינטרקום.", url: "/safety/guests.mp4?v=17", poster: "/safety/guests.jpg?v=17", duration: 10 },
  { id: "fixed-mda", title: "מד״א", line: "עזרה ראשונה רשמית: אדם שהתמוטט. חייגו 101", url: "https://www.youtube.com/watch?v=R8h0SwzNW2I", poster: "https://i.ytimg.com/vi/R8h0SwzNW2I/hqdefault.jpg", duration: 45 },
  { id: "fixed-oref", title: "פיקוד העורף", line: "הנחיות רשמיות, בלי כיתוב שלנו", url: "https://www.youtube.com/watch?v=5ad9OJxVSd0", poster: "https://i.ytimg.com/vi/5ad9OJxVSd0/hqdefault.jpg", duration: 94 },
  { id: "fixed-oref-room", title: "מרחב מוגן", line: "איך בוחרים מרחב מוגן. סרטון פיקוד העורף", url: "https://www.youtube.com/watch?v=Vd7hpbQatvY", poster: "https://i.ytimg.com/vi/Vd7hpbQatvY/hqdefault.jpg", duration: 151 },
  { id: "fixed-fire", title: "כיבוי אש", line: "בטיחות אש ברבי קומות. הסרטון הרשמי", url: "https://www.youtube.com/watch?v=sgnYcSj5qok", poster: "https://i.ytimg.com/vi/sgnYcSj5qok/hqdefault.jpg", duration: 152 },
] as const;
