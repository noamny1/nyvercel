import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { groupWhere } from "@/lib/access";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { GroupTools } from "@/components/admin/GroupTools";
import { createGroup, deleteGroup, removeGroupUser, setGroupLogo, setGroupUser } from "./actions";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

function memberName(user: { name: string; email: string }) {
  return user.name || user.email;
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
        managers: { where: { role: "client" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } },
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
  for (const group of groups) {
    const known = new Set(group.managers.map((user) => user.id));
    const extra = [...new Set(group.screens.flatMap((screen) => screen.users.map((user) => user.id)))].filter((id) => !known.has(id));
    if (!extra.length) continue;
    await prisma.screenGroup.update({ where: { id: group.id }, data: { managers: { connect: extra.map((id) => ({ id })) } } });
    const added = clients.filter((user) => extra.includes(user.id));
    group.managers.push(...added);
    group.managers.sort((a, b) => memberName(a).localeCompare(memberName(b), "he"));
  }

  return (
    <main className="admin">
      <AdminNav />
      <h1>ניהול קבוצות מסכים</h1>
      <p>נכנסים לשם הקבוצה כדי לשנות אותו. כאן מגדירים לוגו ומשתמש.</p>
      <div className="screens">
        {groups.map((group) => (
            <div className="group-row" key={group.id}>
              <span className="screen-title">
                <Link href={`/admin/groups/${group.id}`}>{group.name}</Link>
                <small>{group._count.screens} מסכים</small>
              </span>
              {owner ? (
                <span className="group-tools">
                  <GroupTools
                    groupId={group.id}
                    logoUrl={group.logoUrl}
                    members={group.managers.map((user) => ({ id: user.id, name: memberName(user) }))}
                    clients={clients}
                    saveLogo={setGroupLogo}
                    saveUser={setGroupUser}
                    removeUser={removeGroupUser}
                  />
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