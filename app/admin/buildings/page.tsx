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

export default async function BuildingsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const owner = isSystemAdmin(session);
  const now = Date.now();
  const { q = "" } = await searchParams;
  const query = q.trim();
  const id = Number(query);
  const [screens, groups] = await Promise.all([
    prisma.screen.findMany({
      where: {
        AND: [
          await screenWhere(session),
          query
            ? {
                OR: [
                  ...(Number.isInteger(id) && id > 0 ? [{ id }] : []),
                  { street: { contains: query, mode: "insensitive" } },
                  { number: { contains: query, mode: "insensitive" } },
                  { city: { contains: query, mode: "insensitive" } },
                  { name: { contains: query, mode: "insensitive" } },
                ],
              }
            : {},
        ],
      },
      orderBy: { id: "asc" },
      take: 30,
      include: { group: true },
    }),
    prisma.screenGroup.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <main className="admin">
      <AdminNav />
      <h1>בניינים</h1>
      <p>מוצגים עד 30 מסכים. לחיפוש מדויק מקלידים רחוב, עיר או מספר מסך.</p>
      <form className="card" action="/admin/buildings">
        <div className="row">
          <label>חיפוש בניין<input name="q" defaultValue={query} placeholder="רחוב, עיר או מספר מסך" /></label>
          <button type="submit">חיפוש</button>
        </div>
      </form>
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
              const editHref = `/admin/screens/${screen.id}`;
              const label = state === "online" ? "מחובר" : state === "inactive" ? "כבוי" : "לא מחובר";
              return (
                <tr key={screen.id}>
                  <td data-label="מסך">{screen.id}</td>
                  <td data-label="רחוב"><Link href={editHref}>{street || "—"}</Link></td>
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
            <label>קבוצה
              <select name="groupId" defaultValue="">
                <option value="">בלי קבוצה</option>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </label>
            <button type="submit">יצירה</button>
          </div>
        </form>
      ) : null}
    </main>
  );
}
