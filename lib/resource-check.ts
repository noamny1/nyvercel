import { list } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { sendAdviceMail } from "@/lib/mail";

const GB = 1024 * 1024 * 1024;

export type ResourceReport = {
  lines: string[];
  advice: string;
  subject: string;
};

function asNumber(value: unknown) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return Number(value || 0);
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} קילובייט`;
  if (bytes < GB) return `${(bytes / (1024 * 1024)).toFixed(1)} מגה`;
  return `${(bytes / GB).toFixed(2)} גיגה`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}

async function blobUsage() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { bytes: 0, files: 0, partial: false, missing: true };
  let cursor: string | undefined;
  let bytes = 0;
  let files = 0;
  let pages = 0;
  let partial = false;
  do {
    const page = await list({ cursor, limit: 1000 });
    for (const blob of page.blobs) {
      bytes += blob.size || 0;
      files += 1;
    }
    cursor = page.hasMore ? page.cursor : undefined;
    pages += 1;
    if (cursor && pages >= 20) {
      partial = true;
      cursor = undefined;
    }
  } while (cursor);
  return { bytes, files, partial, missing: false };
}

export async function checkResources(): Promise<ResourceReport> {
  const started = Date.now();
  const sizeRows = await prisma.$queryRaw<Array<{ bytes: unknown; connections: unknown }>>`
    SELECT pg_database_size(current_database()) AS bytes,
           (SELECT count(*) FROM pg_stat_activity) AS connections
  `;
  const queryMs = Date.now() - started;
  const dbBytes = asNumber(sizeRows[0]?.bytes);
  const connections = asNumber(sizeRows[0]?.connections);
  const [screens, slides, notices, online] = await Promise.all([
    prisma.screen.count({ where: { active: true } }),
    prisma.slide.count(),
    prisma.notice.count(),
    prisma.heartbeat.count({ where: { at: { gt: new Date(Date.now() - 8 * 60 * 1000) } } }),
  ]);
  let storage = { bytes: 0, files: 0, partial: false, missing: false };
  let storageError = "";
  try {
    storage = await blobUsage();
  } catch {
    storageError = "בדיקת אחסון הקבצים נכשלה.";
  }

  const lines = [
    `זמן תגובת המסד: ${queryMs} אלפיות השנייה`,
    `גודל מסד הנתונים: ${formatBytes(dbBytes)}`,
    `חיבורים פתוחים למסד: ${connections}`,
    `מסכים פעילים: ${screens}, מתוכם מחוברים עכשיו: ${online}`,
    `שקפים: ${slides}, הודעות: ${notices}`,
  ];
  if (storage.missing) lines.push("אחסון הקבצים: לא נבדק, חסר מפתח אחסון.");
  else if (storageError) lines.push(storageError);
  else lines.push(`אחסון הקבצים: ${formatBytes(storage.bytes)} ב-${storage.files} קבצים${storage.partial ? " (הבדיקה נעצרה אחרי חלק מהקבצים, הסך גבוה יותר)" : ""}`);

  const notes: string[] = [];
  if (queryMs >= 2000) notes.push("המסד הגיב לאט. בתוכנית Launch כדאי לבטל כיבוי אוטומטי או להגדיל את המחשוב. אין צורך להחליף תוכנית רק בגלל זה.");
  if (dbBytes >= 8 * GB) notes.push("המסד גדול מ-8 גיגה. ב-Launch משלמים לפי גיגה ואין תקרת אחסון, אז אין חובה לשדרג. כדאי לבדוק אם נשארו נתונים ישנים.");
  if (!storage.missing && !storageError && storage.bytes >= 20 * GB) notes.push("אחסון הקבצים עבר 20 גיגה. עדיף למחוק קבצים ישנים לפני שחושבים על שדרוג.");
  if (connections >= 80) notes.push("יש הרבה חיבורים פתוחים למסד. כדאי להישאר על חיבור ה-pooler ולא לפתוח חיבור ישיר לכל מסך.");
  if (screens >= 1200 && queryMs >= 800) notes.push("מתקרבים ל-1500 מסכים והתגובה לא מהירה. שווה להגדיל מחשוב ב-Neon, לא לעבור ל-Scale בשלב הזה.");
  const advice = notes.length ? notes.join(" ") : "אין צורך בשדרוג. המשאבים מתאימים להיקף הנוכחי.";
  lines.push(`המלצה: ${advice}`);
  return {
    lines,
    advice,
    subject: notes.length ? "בדיקת משאבים: יש המלצה" : "בדיקת משאבים: אין צורך בשדרוג",
  };
}

export async function mailResourceReport(report: ResourceReport) {
  const to = Array.from(new Set([process.env.ADMIN_EMAIL?.trim(), "noam6683@gmail.com"].filter((item): item is string => Boolean(item))));
  const text = ["בדיקת משאבי שרת ואחסון", "", ...report.lines].join("\n");
  const items = report.lines.map((line) => `<li style="margin:0 0 8px;font-size:18px;line-height:1.7">${escapeHtml(line)}</li>`).join("");
  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;color:#252525"><p style="font-size:18px">בדיקת משאבי שרת ואחסון</p><ul style="padding:0 20px 0 0">${items}</ul></div>`;
  return sendAdviceMail({ to, replyTo: to[0] || "", subject: report.subject, text, html });
}
