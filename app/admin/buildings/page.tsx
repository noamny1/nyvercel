import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { createListedScreen, deleteListedScreen } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const ONLINE_MS = 8 * 60 * 1000;

function stateOf(screen: { active: boolean; lastPing: Date | null }, now: number) {
  if (!screen.active) return "inactive";
  if (screen.lastPing && now - screen.lastPing.getTime() <= ONLINE_MS) return "online";
  return "offline";
}

export default async function BuildingsPage() {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const owner = isSystemAdmin(session);
  const now = Date.now();
  const screens = await prisma.screen.findMany({
    orderBy: { id: "asc" },
    include: { group: true },
  });

  return (
    <main className="admin">
      <AdminNav />
      <h1>בניינים</h1>
      <p>כל שורה היא מסך בשטח. ירוק אומר שהמסך שלח אות ב-8 הדקות האחרונות.</p>
      <div className="screen-table">
        <div className="screen-head">
          <span>מסך</span>
          <span>רחוב</span>
          <span>מספר</span>
          <span>עיר</span>
          <span>סטטוס</span>
          <span>פעולות</span>
        </div>
        {screens.map((screen) => {
          const state = stateOf(screen, now);
          const street = screen.street || screen.group?.street || "";
          const number = screen.number || screen.group?.number || "";
          const city = screen.city || screen.group?.city || "";
          const editHref = screen.groupId ? `/admin/groups/${screen.groupId}?edit=1` : `/admin/screens/${screen.id}`;
          const label = state === "online" ? "מחובר" : state === "inactive" ? "כבוי" : "לא מחובר";
          return (
            <article className="screen-row" key={screen.id}>
              <span data-label="מסך">{screen.id}</span>
              <span data-label="רחוב">{street || "—"}</span>
              <span data-label="מספר">{number || "—"}</span>
              <span data-label="עיר">{city || "—"}</span>
              <span data-label="סטטוס" className={`status ${state}`}><i />{label}</span>
              <span className="acts">
                <a className="icon-btn" href={`/s/${screen.id}`} target="_blank">פתיחה</a>
                <Link className="icon-btn" href={editHref}>עריכה</Link>
                {owner ? (
                  <form action={deleteListedScreen}>
                    <input type="hidden" name="id" value={screen.id} />
                    <button className="light" type="submit">מחיקה</button>
                  </form>
                ) : null}
              </span>
            </article>
          );
        })}
      </div>
      <form className="card" action={createListedScreen}>
        <h2>מסך חדש</h2>
        <div className="row">
          <label>רחוב<input name="street" required /></label>
          <label>מספר<input name="number" required /></label>
          <label>עיר<input name="city" required /></label>
          <button type="submit">יצירה</button>
        </div>
      </form>
    </main>
  );
}
