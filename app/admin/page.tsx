import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { groupWhere } from "@/lib/access";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { createGroup, deleteGroup, renameGroup } from "./actions";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const owner = isSystemAdmin(session);
  const groups = await prisma.screenGroup.findMany({
    where: await groupWhere(session),
    orderBy: { id: "asc" },
    include: { _count: { select: { screens: true } } },
  });

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