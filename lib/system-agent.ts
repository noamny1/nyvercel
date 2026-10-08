import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export type AgentFinding = {
  area: "אבטחה" | "ביצועים" | "אתר שיווקי" | "מסכי לקוח";
  level: "high" | "mid" | "ok";
  title: string;
  detail: string;
};

export type AgentReport = {
  at: string;
  summary: string;
  findings: AgentFinding[];
};

const MARKETING = ["/", "/privacy", "/terms", "/contact", "/accessibility"];

function place(screen: { name: string; street: string; city: string; code: number | null }) {
  const address = [screen.street, screen.city].filter(Boolean).join(" ");
  return `${screen.name || address || "מסך"}${screen.code ? ` (${screen.code})` : ""}`;
}

async function siteOrigin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  if (!host) return "";
  const proto = requestHeaders.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export async function runSystemAgent(): Promise<AgentReport> {
  const findings: AgentFinding[] = [];
  const now = Date.now();
  const screens = await prisma.screen.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      street: true,
      city: true,
      code: true,
      logoUrl: true,
      newsCount: true,
      heartbeat: { select: { at: true } },
      users: { select: { id: true } },
      slides: { where: { active: true }, select: { kind: true, imageUrl: true } },
    },
  });
  const stale = screens.filter((screen) => !screen.heartbeat || now - screen.heartbeat.at.getTime() > 3 * 60 * 1000);
  const noCode = screens.filter((screen) => !screen.code);
  const noLogo = screens.filter((screen) => !screen.logoUrl);
  const noUser = screens.filter((screen) => screen.users.length === 0);
  const heavy = screens.filter((screen) => screen.slides.length > 15);
  const youtube = screens.reduce((sum, screen) => sum + screen.slides.filter((slide) => slide.kind === "youtube").length, 0);
  const videos = screens.reduce((sum, screen) => sum + screen.slides.filter((slide) => /\.mp4($|\?)/i.test(slide.imageUrl)).length, 0);
  const heavyNews = screens.filter((screen) => screen.newsCount > 12);

  if (stale.length === 0) {
    findings.push({ area: "מסכי לקוח", level: "ok", title: "כל המסכים הפעילים מחוברים", detail: `${screens.length} מסכים דיווחו דופק ב־3 הדקות האחרונות.` });
  } else {
    const names = stale.slice(0, 6).map(place).join(", ");
    findings.push({
      area: "מסכי לקוח",
      level: "high",
      title: `${stale.length} מסכים לא מחוברים עכשיו`,
      detail: `${names}${stale.length > 6 ? " ועוד" : ""}. כדאי לבדוק שהאפליקציה פתוחה, שיש אינטרנט, ושהקופסה לא נשארה אחרי סגירה ידנית.`,
    });
  }
  if (noCode.length) {
    findings.push({ area: "מסכי לקוח", level: "mid", title: "מסכים בלי מספר מסך", detail: `${noCode.slice(0, 6).map(place).join(", ")}. בלי מספר אי אפשר לפתוח אותם באפליקציה של הסטרימר.` });
  }
  if (noUser.length) {
    findings.push({ area: "אבטחה", level: "mid", title: "מסכים בלי משתמש לקוח", detail: `${noUser.slice(0, 6).map(place).join(", ")}. כדאי לשייך לקוח, כדי שרק הוא ינהל את המסך.` });
  }
  if (heavy.length) {
    findings.push({ area: "ביצועים", level: "mid", title: "מסכים עם הרבה שקפים", detail: `${heavy.slice(0, 6).map((screen) => `${place(screen)} · ${screen.slides.length}`).join(", ")}. מעל 15 שקפים מעמיס על הקופסה. עדיף להשאיר סרטונים קצרים ופחות שקפים פעילים יחד.` });
  } else {
    findings.push({ area: "ביצועים", level: "ok", title: "עומס השקפים סביר", detail: "אין מסך פעיל עם יותר מ־15 שקפים." });
  }
  if (youtube) {
    findings.push({ area: "ביצועים", level: "mid", title: "סרטוני יוטיוב אצל לקוחות", detail: `${youtube} שקפים טוענים יוטיוב מתוך הדפדפן של הקופסה. זה כבד יותר מקובץ mp4 שלנו, ולפעמים נתקע על X96.` });
  }
  if (videos) {
    findings.push({ area: "ביצועים", level: "ok", title: "סרטוני mp4 במסכים", detail: `${videos} סרטונים מקומיים. הם מתאימים לסטרימר כל עוד הם קצרים וברזולוציית 1080.` });
  }
  if (heavyNews.length) {
    findings.push({ area: "ביצועים", level: "mid", title: "יותר מדי ידיעות למסך", detail: `${heavyNews.slice(0, 6).map(place).join(", ")} מושכים מעל 12 כותרות. 8 מספיקות לגלגל ולא מכבידות על הרשת.` });
  }
  if (noLogo.length) {
    findings.push({ area: "אתר שיווקי", level: "mid", title: "מסכים בלי לוגו", detail: `${noLogo.slice(0, 6).map(place).join(", ")}. לוגו הלקוח חסר בתמה, והמסך נראה פחות מקצועי.` });
  }

  const secretReady = Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET);
  const cronReady = Boolean(process.env.CRON_SECRET);
  const mailReady = Boolean(process.env.RESEND_API_KEY);
  const blobReady = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  findings.push({
    area: "אבטחה",
    level: secretReady ? "ok" : "high",
    title: secretReady ? "מפתח ההתחברות מוגדר" : "חסר מפתח התחברות",
    detail: secretReady ? "העוגייה של מנהל המערכת חתומה." : "בלי AUTH_SECRET אפשר לזייף כניסה לניהול. צריך להגדיר אותו בשרת.",
  });
  findings.push({
    area: "אבטחה",
    level: cronReady ? "ok" : "high",
    title: cronReady ? "עדכון החדשות נעול" : "עדכון החדשות פתוח",
    detail: cronReady ? "רק משימת השרת יכולה לרענן חדשות." : "בלי CRON_SECRET כל אחד יכול להפעיל את רענון החדשות. צריך להגדיר את המפתח.",
  });
  if (!mailReady) findings.push({ area: "אבטחה", level: "mid", title: "שליחת המייל לא מחוברת", detail: "RESEND_API_KEY חסר, ולכן פרטי התחברות ללקוח לא יישלחו מהמערכת." });
  if (!blobReady) findings.push({ area: "אבטחה", level: "high", title: "אחסון הקבצים לא מחובר", detail: "בלי BLOB_READ_WRITE_TOKEN אי אפשר להעלות לוגו, שקפים או תמונות למסך." });

  const origin = await siteOrigin();
  if (!origin) {
    findings.push({ area: "אתר שיווקי", level: "mid", title: "כתובת האתר לא זוהתה", detail: "הסוכן לא הצליח לבדוק את דפי השיווק מהבקשה הזו." });
  } else {
    const pages = await Promise.all(MARKETING.map(async (path) => {
      const started = Date.now();
      try {
        const response = await fetch(`${origin}${path}`, { cache: "no-store", redirect: "manual" });
        return { path, status: response.status, ms: Date.now() - started, headers: response.headers };
      } catch {
        return { path, status: 0, ms: Date.now() - started, headers: null };
      }
    }));
    const broken = pages.filter((page) => page.status < 200 || page.status >= 400);
    if (broken.length) {
      findings.push({ area: "אתר שיווקי", level: "high", title: "דפים שלא נפתחים", detail: broken.map((page) => `${page.path} (${page.status || "בלי מענה"})`).join(", ") });
    } else {
      const slow = pages.filter((page) => page.ms > 1500);
      findings.push({
        area: "אתר שיווקי",
        level: slow.length ? "mid" : "ok",
        title: slow.length ? "דפי השיווק נפתחים לאט" : "דפי השיווק נפתחים",
        detail: pages.map((page) => `${page.path} · ${page.ms}ms`).join(" · "),
      });
    }
    const home = pages.find((page) => page.path === "/");
    const missing = ["strict-transport-security", "content-security-policy", "x-content-type-options", "referrer-policy"].filter((name) => !home?.headers?.get(name));
    if (home?.headers && missing.length) {
      findings.push({
        area: "אבטחה",
        level: "mid",
        title: "חסרות כותרות אבטחה באתר",
        detail: `בדף הבית חסרות: ${missing.join(", ")}. הן מקשות על הטמעה זרה ועל דליפת כתובת כשיוצאים מהאתר.`,
      });
    } else if (home?.headers) {
      findings.push({ area: "אבטחה", level: "ok", title: "כותרות האבטחה של האתר קיימות", detail: "HSTS, CSP, סוג התוכן ומדיניות ההפניה מוגדרים בדף הבית." });
    }
  }

  const order = { high: 0, mid: 1, ok: 2 };
  findings.sort((a, b) => order[a.level] - order[b.level]);
  const highs = findings.filter((item) => item.level === "high").length;
  return {
    at: new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }),
    summary: highs ? `נמצאו ${highs} נושאים שכדאי לטפל בהם קודם.` : "לא נמצאה בעיה דחופה. יש כמה שיפורים שאפשר לעשות בהמשך.",
    findings,
  };
}
