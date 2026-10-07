import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { saveClientThemes } from "@/app/admin/themes/actions";
import { clientThemeIds, THEMES } from "@/lib/themes";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ThemesPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  if (!isSystemAdmin(session)) redirect("/admin/buildings");
  const { done } = await searchParams;
  const enabled = await clientThemeIds();

  return (
    <main className="admin">
      <AdminNav />
      <h1>תימות</h1>
      <p>כאן מחליטים אילו תמות הלקוחות רואים ויכולים לבחור. תמה שלא מסומנת לא מופיעה אצלם, ושום מסך לא משתנה לבד.</p>
      {done === "1" ? <p>הבחירה נשמרה.</p> : null}
      <form className="card" action={saveClientThemes}>
        <div className="theme-picks">
          {THEMES.map((theme) => (
            <label className="theme-pick" key={theme.id}>
              <input type="checkbox" name="theme" value={theme.id} defaultChecked={enabled.includes(theme.id)} />
              <span>
                <strong>{theme.name}</strong>
                <small>{theme.note}</small>
              </span>
            </label>
          ))}
        </div>
        <button type="submit">שמירה</button>
      </form>
    </main>
  );
}
