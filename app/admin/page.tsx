import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { groupWhere } from "@/lib/access";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { createGroup, deleteGroup, renameGroup, setGroupLogo, setGroupUser } from "./actions";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

function leadUser(screens: { users: { id: number }[] }[]) {
  const counts = new Map<number, number>();
  for (const screen of screens) {
    for (const user of screen.users) counts.set(user.id, (counts.get(user.id) || 0) + 1);
  }
  let best = 0;
  let picked = 0;
  for (const [id, count] of counts) {
    if (count > best) {
      best = count;
      picked = id;
    }
  }
  return picked ? String(picked) : "";
}

export default async function AdminHome() {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const owner = isSystemAdmin(session);
  if (!owner) redirect("/admin/buildings");
  const [groups, clients, starter] = await Promise.all([
    prisma.screenGroup.findMany({
      where: await groupWhere(session),
      orderBy: { id: "asc" },
      include: {
        _count: { select: { screens: true } },
        screens: { select: { users: { where: { role: "client" }, select: { id: true } } } },
      },
    }),
    prisma.user.findMany({ where: { role: "client" }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
    prisma.screen.findFirst({
      where: { OR: [{ name: "נועם בדיקה 33" }, { name: { startsWith: "נועם בדיקה 33," } }, { street: "נועם בדיקה", number: "33" }] },
      select: { logoUrl: true, group: { select: { logoUrl: true } } },
    }),
  ]);
  const fallback = starter?.logoUrl || starter?.group?.logoUrl || "";
  if (fallback) {
    const missing = groups.filter((group) => !group.logoUrl).map((group) => group.id);
    if (missing.length) {
      await prisma.screenGroup.updateMany({ where: { id: { in: missing } }, data: { logoUrl: fallback } });
      for (const group of groups) if (!group.logoUrl) group.logoUrl = fallback;
    }
  }

  return (
    <main className="admin">
      <AdminNav />
      <h1>ניהול קבוצות מסכים</h1>
      <p>קבוצה היא שם בלבד. את הכתובות יוצרים בלשונית בניינים ומשייכים משם.</p>
      <div className="screens">
        {groups.map((group) => (
            <div key={group.id}>
              <span className="screen-title">
                <Link href={`/admin/groups/${group.id}`}>{group.name}</Link>
                <small>{group._count.screens} מסכים</small>
              </span>
              {owner ? (
                <span className="screen-actions">
                  <form action={setGroupLogo}>
                    <input type="hidden" name="id" value={group.id} />
                    {group.logoUrl ? <img src={group.logoUrl} alt="" width={72} height={32} style={{ objectFit: "contain" }} /> : null}
                    <input name="file" type="file" accept="image/*" aria-label="לוגו הקבוצה" required />
                    <button className="light" type="submit">לוגו</button>
                  </form>
                  <form action={setGroupUser}>
                    <input type="hidden" name="id" value={group.id} />
                    <select name="userId" defaultValue={leadUser(group.screens)} aria-label="משתמש הקבוצה">
                      <option value="">בלי משתמש</option>
                      {clients.map((user) => (
                        <option key={user.id} value={user.id}>{user.name || user.email}</option>
                      ))}
                    </select>
                    <button className="light" type="submit">משתמש</button>
                  </form>
                  <form action={renameGroup}>
                    <input type="hidden" name="id" value={group.id} />
                    <input name="name" defaultValue={group.name} aria-label="שם הקבוצה" required />
                    <button className="light" type="submit">שמירת שם</button>
                  </form>
                  <form action={deleteGroup}>
                    <input type="hidden" name="id" value={group.id} />
                    <button className="light" type="submit">מחיקה</button>
                  </form>
                </span>
              ) : null}
            </div>
        ))}
      </div>
      {owner ? (
        <form className="card" action={createGroup}>
          <h2>קבוצה חדשה</h2>
          <div className="row">
            <label>שם הקבוצה<input name="name" required placeholder="דיין אחזקות" /></label>
            <button type="submit">יצירה</button>
          </div>
        </form>
      ) : null}
    </main>
  );
}