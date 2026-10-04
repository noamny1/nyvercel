export type ReadySlide = {
  id: string;
  category: string;
  title: string;
  line: string;
  tone: "burgundy" | "charcoal" | "cream";
};

export const READY_CATEGORIES = [
  "הודעות וועד",
  "הודעות כלליות",
  "ברכות",
  "מועדים וחגים",
  "הודעות יומיות",
  "זכויות מדייר",
] as const;

export const READY_SLIDES: ReadySlide[] = [
  { id: "vaad-meeting", category: "הודעות וועד", title: "אסיפת דיירים", line: "יום שלישי בשעה 20:00 בלובי", tone: "burgundy" },
  { id: "vaad-fee", category: "הודעות וועד", title: "דמי ועד בית", line: "התשלום מתבצע עד ה־10 בחודש", tone: "charcoal" },
  { id: "vaad-vote", category: "הודעות וועד", title: "בחירות לוועד", line: "אפשר להצביע אצל נציג הוועד", tone: "cream" },
  { id: "vaad-work", category: "הודעות וועד", title: "עבודות תחזוקה", line: "השבוע מתבצעות עבודות בגג", tone: "burgundy" },
  { id: "general-parking", category: "הודעות כלליות", title: "חניה", line: "החניה שמורה לדיירי הבניין", tone: "charcoal" },
  { id: "general-clean", category: "הודעות כלליות", title: "ניקיון", line: "ניקיון הלובי מתבצע בכל בוקר", tone: "cream" },
  { id: "general-hours", category: "הודעות כלליות", title: "קבלת קהל", line: "הוועד זמין בימים א׳–ה׳ עד 19:00", tone: "burgundy" },
  { id: "general-cameras", category: "הודעות כלליות", title: "אבטחה", line: "הלובי והחניה מצולמים", tone: "charcoal" },
  { id: "greet-shabbat", category: "ברכות", title: "שבת שלום", line: "מאחלים לכל הדיירים שבת שקטה", tone: "burgundy" },
  { id: "greet-mazal", category: "ברכות", title: "מזל טוב", line: "ברכות למשפחה החדשה בבניין", tone: "cream" },
  { id: "greet-welcome", category: "ברכות", title: "ברוכים הבאים", line: "שמחים לארח אתכם בלובי", tone: "charcoal" },
  { id: "greet-holiday", category: "ברכות", title: "חג שמח", line: "הבניין מאחל חג שמח", tone: "burgundy" },
  { id: "holiday-rosh", category: "מועדים וחגים", title: "שנה טובה", line: "מאחלים שנה טובה ומתוקה", tone: "burgundy" },
  { id: "holiday-kippur", category: "מועדים וחגים", title: "גמר חתימה טובה", line: "צום קל ומועיל לכל הדיירים", tone: "charcoal" },
  { id: "holiday-hanukka", category: "מועדים וחגים", title: "חנוכה שמח", line: "הדלקת נרות בלובי בשעה 17:30", tone: "cream" },
  { id: "holiday-pesach", category: "מועדים וחגים", title: "חג פסח שמח", line: "חג כשר ושמח לכל דיירי הבניין", tone: "burgundy" },
  { id: "daily-water", category: "הודעות יומיות", title: "הפסקת מים", line: "היום בין 09:00 ל־11:00", tone: "charcoal" },
  { id: "daily-elevator", category: "הודעות יומיות", title: "מעלית", line: "בדיקה בין 10:00 ל־12:00", tone: "burgundy" },
  { id: "daily-power", category: "הודעות יומיות", title: "הפסקת חשמל", line: "היום בין 14:00 ל־14:30", tone: "charcoal" },
  { id: "daily-trash", category: "הודעות יומיות", title: "פינוי אשפה", line: "הפינוי מתבצע בימים א׳, ג׳ ו־ה׳", tone: "cream" },
  { id: "rights-quiet", category: "זכויות מדייר", title: "שקט", line: "בין 14:00 ל־16:00 ומשעה 23:00", tone: "charcoal" },
  { id: "rights-shared", category: "זכויות מדייר", title: "רכוש משותף", line: "הלובי והחצר שייכים לכל הדיירים", tone: "burgundy" },
  { id: "rights-pets", category: "זכויות מדייר", title: "חיות מחמד", line: "יש לשמור על ניקיון השטחים המשותפים", tone: "cream" },
  { id: "rights-reno", category: "זכויות מדייר", title: "שיפוץ", line: "עבודות רועשות רק בין 08:00 ל־17:00", tone: "charcoal" },
];
