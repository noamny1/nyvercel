import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { groupWhere } from "@/lib/access";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { GroupTools } from "@/components/admin/GroupTools";
import { createGroup, deleteGroup, removeGroupUser, setGroupLogo, setGroupPromo, setGroupUser, syncGroupLogos } from "./actions";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

function memberName(user: { email: string }) {
  return user.email;
}

export default async function AdminHome() {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const owner = isSystemAdmin(session);
  if (!owner) redirect("/admin/buildings");
  const where = await groupWhere(session);
  const [listed, clients, starter] = await Promise.all([
    prisma.screenGroup.findMany({
      where,
      orderBy: { id: "asc" },
      include: {
        _count: { select: { screens: true, memberships: true } },
        screens: { select: { users: { where: { role: "client" }, select: { id: true } } } },
        groupLinks: {
          where: { user: { role: "client" } },
          select: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    }).catch(() => null),
    prisma.user.findMany({ where: { role: "client" }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
    prisma.screen.findFirst({
      where: { OR: [{ name: "נועם בדיקה 33" }, { name: { startsWith: "נועם בדיקה 33," } }, { street: "נועם בדיקה", number: "33" }] },
      select: { logoUrl: true, group: { select: { logoUrl: true } } },
    }),
  ]);
  const groups = listed || (await prisma.screenGroup.findMany({
    where,
    orderBy: { id: "asc" },
    include: {
      _count: { select: { screens: true } },
      screens: { select: { users: { where: { role: "client" }, select: { id: true } } } },
    },
  })).map((group) => ({ ...group, groupLinks: [] as { user: { id: number; name: string; email: string } }[], _count: { ...group._count, memberships: 0 } }));
  const fallback = starter?.logoUrl || starter?.group?.logoUrl || "";
  if (fallback) {
    const missing = groups.filter((group) => !group.logoUrl).map((group) => group.id);
    if (missing.length) {
      await prisma.screenGroup.updateMany({ where: { id: { in: missing } }, data: { logoUrl: fallback } });
      for (const group of groups) if (!group.logoUrl) group.logoUrl = fallback;
    }
  }
  for (const group of groups) {
    const members = group.groupLinks.map((link) => link.user);
    const known = new Set(members.map((user) => user.id));
    const extra = [...new Set(group.screens.flatMap((screen) => screen.users.map((user) => user.id)))].filter((id) => !known.has(id));
    if (extra.length) {
      await prisma.groupManager.createMany({ data: extra.map((userId) => ({ groupId: group.id, userId })), skipDuplicates: true }).catch(() => null);
      members.push(...clients.filter((user) => extra.includes(user.id)));
    }
    members.sort((a, b) => memberName(a).localeCompare(memberName(b), "he"));
    group.groupLinks.splice(0, group.groupLinks.length, ...members.map((user) => ({ user })));
  }
  await syncGroupLogos(groups.map((group) => ({ id: group.id, logoUrl: group.logoUrl })));

  return (
    <main className="admin">
      <AdminNav />
      <h1>ניהול קבוצות מסכים</h1>
      <p>נכנסים לשם הקבוצה כדי לשנות אותו. כאן מגדירים לוגו, סרטון תדמית ומשתמש.</p>
      <div className="screens">
        {groups.map((group) => (
            <div className="group-row" key={group.id}>
              <Link className="screen-title" href={`/admin/groups/${group.id}`}>
                <b>{group.name || "קבוצה ללא שם"}</b>
                <small>{group._count.screens + (group._count.memberships || 0)} מסכים</small>
              </Link>
              {owner ? (
                <span className="group-tools">
                  <GroupTools
                    groupId={group.id}
                    logoUrl={group.logoUrl}
                    promoUrl={group.promoUrl}
                    members={group.groupLinks.map((link) => ({ id: link.user.id, email: link.user.email }))}
                    clients={clients}
                    saveLogo={setGroupLogo}
                    savePromo={setGroupPromo}
                    saveUser={setGroupUser}
                    removeUser={removeGroupUser}
                  />
                  <form action={deleteGroup}>
                    <input type="hidden" name="id" value={group.id} />
                    <button className="light" type="submit">מחיקת קבוצה</button>
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