import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { GroupMove } from "@/components/admin/GroupMove";
import { createListedScreen, deleteListedScreen } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { screenWhere } from "@/lib/access";
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
  const [screens, groups] = await Promise.all([
    prisma.screen.findMany({
      where: await screenWhere(session),
      orderBy: { id: "asc" },
      include: { group: true },
    }),
    prisma.screenGroup.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <main className="admin">
      <AdminNav />
      <h1>בניינים</h1>
      <p>כל שורה היא מסך בשטח. ירוק אומר שהמסך שלח אות ב-8 הדקות האחרונות.</p>
      <div className="table-wrap">
        <table className="screen-table">
          <thead>
            <tr>
              <th>מסך</th>
              <th>רחוב</th>
              <th>מספר</th>
              <th>עיר</th>
              <th>קבוצה</th>
              <th>סטטוס</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {screens.map((screen) => {
              const state = stateOf(screen, now);
              const street = screen.street || screen.group?.street || "";
              const number = screen.number || screen.group?.number || "";
              const city = screen.city || screen.group?.city || "";
              const editHref = screen.groupId ? `/admin/groups/${screen.groupId}?edit=1` : `/admin/screens/${screen.id}`;
              const label = state === "online" ? "מחובר" : state === "inactive" ? "כבוי" : "לא מחובר";
              return (
                <tr key={screen.id}>
                  <td data-label="מסך">{screen.id}</td>
                  <td data-label="רחוב">{street || "—"}</td>
                  <td data-label="מספר">{number || "—"}</td>
                  <td data-label="עיר">{city || "—"}</td>
                  <td data-label="קבוצה">
                    {owner ? (
                      <GroupMove screenId={screen.id} groupId={screen.groupId} groups={groups} />
                    ) : (
                      screen.group?.name || "—"
                    )}
                  </td>
                  <td data-label="סטטוס"><span className={`status ${state}`}><i />{label}</span></td>
                  <td data-label="פעולות" className="acts">
                    <a className="icon-btn" href={`/s/${screen.id}`} target="_blank">פתיחה</a>
                    <Link className="icon-btn" href={editHref}>עריכה</Link>
                    {owner ? (
                      <form action={deleteListedScreen}>
                        <input type="hidden" name="id" value={screen.id} />
                        <button className="light" type="submit">מחיקה</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {owner ? (
        <form className="card" action={createListedScreen}>
          <h2>מסך חדש</h2>
          <div className="row">
            <label>רחוב<input name="street" required /></label>
            <label>מספר<input name="number" required /></label>
            <label>עיר<input name="city" required /></label>
            <button type="submit">יצירה</button>
          </div>
        </form>
      ) : null}
    </main>
  );
}
