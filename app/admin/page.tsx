import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { createGroup } from "./actions";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const groups = await prisma.screenGroup.findMany({
    orderBy: { id: "asc" },
    include: { screens: { select: { id: true } } },
  });
  const loose = await prisma.screen.findMany({
    where: { groupId: null },
    orderBy: { id: "asc" },
  });

  return (
    <main className="admin">
      <AdminNav />
      <h1>ניהול קבוצות מסכים</h1>
      <p>קבוצה אחת משמשת כמה מסכים באותו בניין. שינוי בקבוצה מתעדכן בכולם.</p>
      <div className="screens">
        {groups.map((group) => {
          const place = [group.street, group.number].filter(Boolean).join(" ");
          const address = [place, group.city].filter(Boolean).join(", ");
          return (
            <Link key={group.id} href={`/admin/groups/${group.id}`}>
              <span className="screen-title">
                {group.name}
                <small>{address || "אין כתובת"}</small>
              </span>
              <span>{group.screens.length} מסכים</span>
            </Link>
          );
        })}
      </div>
      <form className="card" action={createGroup}>
        <h2>קבוצה חדשה</h2>
        <div className="row">
          <label>שם<input name="name" required placeholder="מגדלי האור" /></label>
          <label>רחוב<input name="street" required /></label>
          <label>מספר<input name="number" required /></label>
          <label>עיר<input name="city" required /></label>
          <button type="submit">יצירה</button>
        </div>
      </form>
      {loose.length > 0 ? (
        <section className="card">
          <h2>מסכים בלי קבוצה</h2>
          <div className="screens">
            {loose.map((screen) => (
              <Link key={screen.id} href={`/admin/screens/${screen.id}`}>
                <span>{screen.name}</span>
                <span>/s/{screen.id}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
