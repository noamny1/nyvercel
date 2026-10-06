import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { musicSilenced } from "@/lib/flags";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { refreshAllScreens, setGlobalMusic } from "./actions";

export const dynamic = "force-dynamic";

export default async function ManagePage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  if (!isSystemAdmin(session)) redirect("/admin/buildings");
  const { done } = await searchParams;
  const silenced = await musicSilenced();

  return (
    <main className="admin">
      <AdminNav />
      <h1>ניהול</h1>
      <p>הרענון והמוזיקה חלים על כל המסכים. כיבוי המוזיקה לא משנה את מה שהלקוח בחר.</p>
      {done === "refresh" ? <p>כל המסכים יתרעננו בדקה הקרובה.</p> : null}
      {done === "music" ? <p>{silenced ? "המוזיקה כבויה בכל המסכים. הבחירה של כל לקוח נשמרה." : "המוזיקה חזרה רק למסכים שהלקוח הגדיר אצלם מוזיקה."}</p> : null}
      <form className="card" action={refreshAllScreens}>
        <h2>מסכים</h2>
        <p>טוען מחדש את כל המסכים המחוברים, בלי לשנות שקפים או הגדרות.</p>
        <button type="submit">רענון כל המסכים</button>
      </form>
      <form className="card" action={setGlobalMusic}>
        <h2>מוזיקה</h2>
        <p>
          {silenced
            ? "המוזיקה כבויה כרגע מטעם המערכת. לקוח שהגדיר אצלו בלי מוזיקה יישאר בלי מוזיקה גם אחרי ההחזרה."
            : "המוזיקה פועלת לפי מה שכל לקוח הגדיר. כיבוי כאן משתיק את כולם בלי למחוק את הבחירה שלהם."}
        </p>
        <input type="hidden" name="off" value={silenced ? "0" : "1"} />
        <button type="submit">{silenced ? "החזרת המוזיקה" : "כיבוי מוזיקה בכל המסכים"}</button>
      </form>
    </main>
  );
}
