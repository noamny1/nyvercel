import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { listBackups } from "@/modules/backup/store";
import { restoreScreenBackup, saveBackupNow } from "./actions";

export const dynamic = "force-dynamic";

function when(value: Date | string) {
  return new Date(value).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", dateStyle: "short", timeStyle: "short" });
}

export default async function BackupsPage({ searchParams }: { searchParams: Promise<{ done?: string; note?: string; slides?: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  if (!isSystemAdmin(session)) redirect("/admin/buildings");
  const query = await searchParams;
  const copies = await listBackups().catch(() => []);

  return (
    <main className="admin">
      <AdminNav />
      <h1>גיבויים</h1>
      <p>נשמר אוטומטית פעמיים ביום, בערך ב־10:00 וב־22:00 שעון ישראל. בקיץ זה שעה מאוחר יותר. כל עותק נשמר 21 יום.</p>
      <p>כל עותק כולל שקפים, הודעות, עדכונים, קומות וחדרים, לוגו, מוזיקה, חדשות, תמה, כתובת, קבוצות, משתמשים והבחירות של מנהל המערכת. תמונות ומוזיקה עצמן נשארות באחסון. הגיבוי לא כולל צילומי מסך מרחוק.</p>
      {query.done === "saved" ? <p>הגיבוי נשמר.</p> : null}
      {query.done === "restored" ? <p>המסך הוחזר. {query.slides || 0} שקפים.</p> : null}
      {query.done === "fail" ? <p>הגיבוי לא נשמר.</p> : null}
      {query.done === "bad" ? <p>חסר קוד מסך או עותק.</p> : null}
      {query.done === "miss" ? <p>{query.note || "לא נמצא מסך להחזרה."}</p> : null}
      <form action={saveBackupNow}>
        <button type="submit">שמור גיבוי עכשיו</button>
      </form>
      <h2>החזרת מסך אחד</h2>
      <p>זה מחזיר את התוכן והבחירות של המסך לנקודה שנבחרה. הקבוצה שלו לא משתנה, אלא אם מסמנים גם את המשתמשים.</p>
      <form className="card" action={restoreScreenBackup}>
        <label>קוד מסך<input name="code" inputMode="numeric" required /></label>
        <label>עותק
          <select name="backup" required defaultValue={copies[0]?.url || ""}>
            {copies.map((copy) => (
              <option key={copy.url} value={copy.url}>{when(copy.uploadedAt)} · {Math.max(1, Math.round(copy.size / 1024))}KB</option>
            ))}
          </select>
        </label>
        <label className="choice-apply"><input type="checkbox" name="users" value="1" /> החזר גם את שיוך המשתמשים</label>
        <button type="submit">החזר את המסך</button>
      </form>
      <h2>עותקים</h2>
      {copies.length ? (
        <ul>
          {copies.map((copy) => <li key={copy.pathname}>{when(copy.uploadedAt)}</li>)}
        </ul>
      ) : <p>עדיין אין עותק. לחצו על שמור גיבוי עכשיו.</p>}
    </main>
  );
}
