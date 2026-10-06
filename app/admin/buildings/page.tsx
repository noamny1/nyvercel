import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { ClientScreens } from "@/components/admin/ClientScreens";
import { GroupMove } from "@/components/admin/GroupMove";
import { createListedScreen, deleteListedScreen } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { screenWhere } from "@/lib/access";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const ONLINE_MS = 8 * 60 * 1000;

function assignedUsers(users: { name: string; email: string; role: string }[]) {
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return users.filter((user) => {
    const email = user.email.trim().toLowerCase();
    return user.role !== "owner" && user.name !== "owner" && email !== "noam6683@gmail.com" && email !== admin;
  });
}

function stateOf(screen: { active: boolean; heartbeat: { at: Date } | null }, now: number) {
  if (!screen.active) return "inactive";
  if (screen.heartbeat && now - screen.heartbeat.at.getTime() <= ONLINE_MS) return "online";
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
                  ...(Number.isInteger(id) && id > 0 ? [{ id }, { code: id }] : []),
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
      include: {
        group: true,
        heartbeat: true,
        users: { select: { name: true, email: true, role: true }, orderBy: { email: "asc" } },
        slides: { orderBy: { sort: "asc" } },
        notices: { orderBy: { id: "desc" } },
      },
    }),
    prisma.screenGroup.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <main className="admin">
      <AdminNav />
      <h1>{owner ? "בניינים" : "המסכים שלי"}</h1>
      {owner ? (
      <form className="card search-slim" action="/admin/buildings">
        <div className="row">
          <label>חיפוש<input name="q" defaultValue={query} placeholder="רחוב, עיר או מספר מסך" /></label>
          <button type="submit">חיפוש</button>
        </div>
      </form>
      ) : null}
      {owner ? (
      <div className="table-wrap">
        <table className="screen-table">
          <thead>
            <tr>
              <th>מסך</th>
              <th>רחוב</th>
              <th>מספר</th>
              <th>עיר</th>
              {owner ? <th>קבוצה</th> : null}
              {owner ? <th>סטטוס</th> : null}
              <th>משתמשים</th>
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
              const people = assignedUsers(screen.users);
              return (
                <tr key={screen.id}>
                  <td data-label="מסך">{screen.code || screen.id}</td>
                  <td data-label="רחוב"><Link href={editHref}>{street || "—"}</Link></td>
                  <td data-label="מספר">{number || "—"}</td>
                  <td data-label="עיר">{city || "—"}</td>
                  {owner ? (
                    <td data-label="קבוצה">
                      <GroupMove screenId={screen.id} groupId={screen.groupId} groups={groups} />
                    </td>
                  ) : null}
                  {owner ? <td data-label="סטטוס"><span className={`status ${state}`}><i />{label}</span></td> : null}
                  <td data-label="משתמשים">
                    {people.length ? people.map((user) => <span key={user.email} className="assigned-user">{user.name || user.email}</span>) : "—"}
                  </td>
                  <td data-label="פעולות" className="acts">
                    <a className="icon-btn" href={`/s/${screen.code || screen.id}`} target="_blank">פתיחה</a>
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
      ) : (
        <ClientScreens
          musicPeers={screens.length}
          returnTo={query ? `/admin/buildings?q=${encodeURIComponent(query)}` : "/admin/buildings"}
          rows={screens.map((screen) => ({
            id: screen.id,
            code: screen.code,
            name: screen.name,
            street: screen.street || screen.group?.street || "",
            number: screen.number || screen.group?.number || "",
            city: screen.city || screen.group?.city || "",
            theme: screen.theme,
            logoUrl: screen.logoUrl,
            newsSource: screen.newsSource,
            newsCount: screen.newsCount,
            tickerSeconds: screen.tickerSeconds,
            newsTicker: screen.newsTicker,
            feedMode: screen.feedMode,
            musicPlaylist: screen.musicPlaylist,
            people: assignedUsers(screen.users).map((user) => user.name || user.email),
            slides: screen.slides,
            notices: screen.notices,
          }))}
        />
      )}
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
