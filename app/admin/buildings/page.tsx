import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { ClientScreens } from "@/components/admin/ClientScreens";
import { GroupMove } from "@/components/admin/GroupMove";
import { createListedScreen, deleteListedScreen } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { screenWhere } from "@/lib/access";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { editorThemes } from "@/lib/themes";

export const dynamic = "force-dynamic";

const ONLINE_MS = 18 * 60 * 1000;
const SORTS = {
  code: "מסך",
  street: "רחוב",
  number: "מספר",
  city: "עיר",
  floor: "קומה",
  group: "קבוצה",
  status: "סטטוס",
  users: "משתמשים",
} as const;
type SortKey = keyof typeof SORTS;

function sortKey(value: string | undefined): SortKey {
  return value && value in SORTS ? value as SortKey : "code";
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, "he", { numeric: true, sensitivity: "base" });
}

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

export default async function BuildingsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; group?: string; sort?: string; dir?: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const owner = isSystemAdmin(session);
  const now = Date.now();
  const { q = "", status = "", group = "", sort: sortParam, dir: dirParam } = await searchParams;
  const query = q.trim();
  const id = Number(query);
  const sort = sortKey(sortParam);
  const dir = dirParam === "desc" ? "desc" : "asc";
  const groupId = Number(group);
  const email = session.user?.email?.trim().toLowerCase();
  if (owner) {
    await prisma.$executeRaw`
      UPDATE "Screen"
      SET name = btrim(concat_ws(', ', NULLIF(btrim(concat_ws(' ', street, number)), ''), NULLIF(btrim(city), '')), ', ')
      WHERE btrim(concat_ws(' ', street, number, city)) <> ''
        AND name IS DISTINCT FROM btrim(concat_ws(', ', NULLIF(btrim(concat_ws(' ', street, number)), ''), NULLIF(btrim(city), '')), ', ')
    `.catch(() => 0);
  }
  const [screens, groups, manager] = await Promise.all([
    prisma.screen.findMany({
      where: {
        AND: [
          await screenWhere(session),
          group === "none" ? { groupId: null } : Number.isInteger(groupId) && groupId > 0 ? { groupId } : {},
          query
            ? {
                OR: [
                  ...(Number.isInteger(id) && id > 0 ? [{ id }, { code: id }] : []),
                  { street: { contains: query, mode: "insensitive" as const } },
                  { number: { contains: query, mode: "insensitive" as const } },
                  { city: { contains: query, mode: "insensitive" as const } },
                  { floor: { contains: query, mode: "insensitive" as const } },
                  { name: { contains: query, mode: "insensitive" as const } },
                  { group: { name: { contains: query, mode: "insensitive" as const } } },
                  { users: { some: { email: { contains: query, mode: "insensitive" as const } } } },
                ],
              }
            : {},
        ],
      },
      orderBy: { id: "asc" },
      include: {
        group: true,
        heartbeat: true,
        users: { select: { name: true, email: true, role: true }, orderBy: { email: "asc" } },
        slides: { orderBy: { sort: "asc" } },
        notices: { orderBy: { id: "desc" } },
      },
    }),
    prisma.screenGroup.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    !owner && email
      ? prisma.groupManager.findFirst({
          where: { user: { email: { equals: email, mode: "insensitive" } } },
          select: { groupId: true },
        })
      : Promise.resolve(null),
  ]);
  const rank: Record<string, string> = { online: "0", offline: "1", inactive: "2" };
  const listed = screens
    .map((screen) => {
      const state = stateOf(screen, now);
      return {
        screen,
        state,
        street: screen.street || screen.group?.street || "",
        number: screen.number || screen.group?.number || "",
        city: screen.city || screen.group?.city || "",
        floor: screen.floor || "לובי",
        groupName: screen.group?.name || "",
        people: assignedUsers(screen.users),
      };
    })
    .filter((row) => status === "online" ? row.state === "online" : status === "offline" ? row.state !== "online" : true)
    .sort((a, b) => {
      const value = (row: typeof a) => {
        if (sort === "code") return String(row.screen.code || row.screen.id);
        if (sort === "street") return row.street;
        if (sort === "number") return row.number;
        if (sort === "city") return row.city;
        if (sort === "floor") return row.floor;
        if (sort === "group") return row.groupName;
        if (sort === "status") return rank[row.state];
        return row.people.map((user) => user.email).join(" ");
      };
      const left = value(a);
      const right = value(b);
      if (!left && !right) return (a.screen.code || a.screen.id) - (b.screen.code || b.screen.id);
      if (!left) return 1;
      if (!right) return -1;
      return (dir === "desc" ? -compareText(left, right) : compareText(left, right)) || (a.screen.code || a.screen.id) - (b.screen.code || b.screen.id);
    });
  const listQuery = new URLSearchParams();
  if (query) listQuery.set("q", query);
  if (status === "online" || status === "offline") listQuery.set("status", status);
  if (group) listQuery.set("group", group);
  const columnHref = (column: SortKey) => {
    const next = new URLSearchParams(listQuery);
    next.set("sort", column);
    next.set("dir", sort === column && dir === "asc" ? "desc" : "asc");
    return `/admin/buildings?${next}`;
  };
  const head = (column: SortKey) => (
    <Link className={sort === column ? "is-on" : ""} href={columnHref(column)}>
      {SORTS[column]}{sort === column ? (dir === "asc" ? " ↑" : " ↓") : ""}
    </Link>
  );

  return (
    <main className="admin">
      <AdminNav />
      <h1>{owner ? "בניינים" : "המסכים שלי"}</h1>
      {owner ? (
      <form className="card search-slim search-board" action="/admin/buildings">
        <div className="row">
          <label>חיפוש<input name="q" defaultValue={query} placeholder="רחוב, עיר, קומה, קבוצה, מייל או מספר מסך" /></label>
          <label>סטטוס
            <select name="status" defaultValue={status === "online" || status === "offline" ? status : ""}>
              <option value="">הכל</option>
              <option value="online">מחובר</option>
              <option value="offline">לא מחובר</option>
            </select>
          </label>
          <label>קבוצה
            <select name="group" defaultValue={group}>
              <option value="">כל הקבוצות</option>
              <option value="none">בלי קבוצה</option>
              {groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>מיון לפי
            <select name="sort" defaultValue={sort}>
              {(Object.keys(SORTS) as SortKey[]).map((key) => <option key={key} value={key}>{SORTS[key]}</option>)}
            </select>
          </label>
          <label>כיוון
            <select name="dir" defaultValue={dir}>
              <option value="asc">מהקטן לגדול</option>
              <option value="desc">מהגדול לקטן</option>
            </select>
          </label>
          <button type="submit">הצגה</button>
        </div>
        <p className="found">מציג {listed.length} מסכים</p>
      </form>
      ) : null}
      {owner ? (
        <form className="card" action={createListedScreen}>
          <h2>מסך חדש</h2>
          <div className="row">
            <label>רחוב<input name="street" required /></label>
            <label>מספר<input name="number" required /></label>
            <label>עיר<input name="city" required /></label>
            <label>קומה<input name="floor" defaultValue="לובי" /></label>
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
      {owner ? (
      <div className="table-wrap">
        <table className="screen-table">
          <thead>
            <tr>
              <th>{head("code")}</th>
              <th>{head("street")}</th>
              <th>{head("number")}</th>
              <th>{head("city")}</th>
              <th>{head("floor")}</th>
              <th>{head("group")}</th>
              <th>{head("status")}</th>
              <th>{head("users")}</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {listed.length === 0 ? <tr><td colSpan={9}>אין מסך שמתאים לחיפוש.</td></tr> : null}
            {listed.map(({ screen, state, street, number, city, people }) => {
              const editHref = `/admin/screens/${screen.id}`;
              const label = state === "online" ? "מחובר" : state === "inactive" ? "כבוי" : "לא מחובר";
              return (
                <tr key={screen.id}>
                  <td data-label="מסך">{screen.code || screen.id}</td>
                  <td data-label="רחוב"><Link href={editHref}>{street || "—"}</Link></td>
                  <td data-label="מספר">{number || "—"}</td>
                  <td data-label="עיר">{city || "—"}</td>
                  <td data-label="קומה">{screen.floor || "לובי"}</td>
                  {owner ? (
                    <td data-label="קבוצה">
                      <GroupMove screenId={screen.id} groupId={screen.groupId} groups={groups} />
                    </td>
                  ) : null}
                  {owner ? (
                    <td data-label="סטטוס">
                      <span className={`status ${state === "online" ? "online" : "offline"}`} title={label} aria-label={label}><i /></span>
                    </td>
                  ) : null}
                  <td data-label="משתמשים">
                    {people.length ? people.map((user) => <span key={user.email} className="assigned-user">{user.email}</span>) : "—"}
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
          manager={Boolean(manager)}
          musicPeers={screens.length}
          themes={await editorThemes(isSystemAdmin(session))}
          returnTo={query ? `/admin/buildings?q=${encodeURIComponent(query)}` : "/admin/buildings"}
          rows={[...screens].sort((a, b) => (a.groupId || 0) - (b.groupId || 0) || a.listSort - b.listSort || a.id - b.id).map((screen) => ({
            id: screen.id,
            code: screen.code,
            name: screen.name,
            street: screen.street || screen.group?.street || "",
            number: screen.number || screen.group?.number || "",
            city: screen.city || screen.group?.city || "",
            floor: screen.floor || "לובי",
            theme: screen.theme,
            logoUrl: screen.logoUrl,
            faultPhone: screen.faultPhone,
            faultLink: screen.faultLink,
            faultQrUrl: screen.faultQrUrl,
            newsSource: screen.newsSource,
            newsCount: screen.newsCount,
            tickerSeconds: screen.tickerSeconds,
            newsTicker: screen.newsTicker,
            feedMode: screen.feedMode,
            musicPlaylist: screen.musicPlaylist,
            people: assignedUsers(screen.users).map((user) => user.email),
            slides: screen.slides,
            notices: screen.notices,
          }))}
        />
      )}
    </main>
  );
}
