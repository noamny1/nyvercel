import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ScreenEditor } from "@/components/admin/ScreenEditor";
import { AdminNav } from "@/components/admin/AdminNav";
import { addScreenToGroup, moveScreen, removeScreen } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function addressOf(street: string, number: string, city: string) {
  const place = [street, number].filter(Boolean).join(" ");
  return [place, city].filter(Boolean).join(", ");
}

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const owner = isSystemAdmin(session);
  const { id } = await params;
  const [group, buildings, feeds, groups] = await Promise.all([
    prisma.screenGroup.findUnique({
      where: { id: Number(id) },
      include: {
        screens: { orderBy: { id: "asc" } },
        slides: { orderBy: { sort: "asc" } },
        notices: { orderBy: { id: "desc" } },
      },
    }),
    prisma.building.findMany({ orderBy: { name: "asc" } }),
    prisma.feed.findMany({ orderBy: { name: "asc" } }),
    prisma.screenGroup.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!group) notFound();
  const others = groups.filter((item) => item.id !== group.id);

  return (
    <main className="admin">
      <AdminNav />
      <p><Link href="/admin">כל הקבוצות</Link></p>
      <h1>{group.name}</h1>
      <p>{addressOf(group.street, group.number, group.city) || "אין כתובת לקבוצה"}</p>
      <section className="card">
        <h2>מסכים בקבוצה</h2>
        <p>המסכים האלה משויכים לכתובת של {group.name}.</p>
        {group.screens.length === 0 ? <p>אין עדיין מסכים בקבוצה.</p> : null}
        <div className="screens">
          {group.screens.map((screen) => {
            const address = addressOf(screen.street, screen.number, screen.city) || addressOf(group.street, group.number, group.city);
            return (
              <div key={screen.id}>
                <span className="screen-title">
                  {screen.name}
                  <small>{address || "אין כתובת"}</small>
                </span>
                <span className="screen-actions">
                  <a href={`/s/${screen.id}`} target="_blank">/s/{screen.id}</a>
                  {owner && others.length > 0 ? (
                    <form action={moveScreen}>
                      <input type="hidden" name="id" value={screen.id} />
                      <input type="hidden" name="groupId" value={group.id} />
                      <select name="targetGroupId" defaultValue={others[0]?.id || ""} aria-label="קבוצה אחרת">
                        {others.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                      <button className="light" type="submit">העברה</button>
                    </form>
                  ) : null}
                  {owner ? (
                    <form action={removeScreen}>
                      <input type="hidden" name="id" value={screen.id} />
                      <input type="hidden" name="groupId" value={group.id} />
                      <button className="light" type="submit">מחיקה</button>
                    </form>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
        <form className="row" action={addScreenToGroup} style={{ marginTop: 12 }}>
          <input type="hidden" name="groupId" value={group.id} />
          <label>מסך חדש<input name="name" required placeholder="לובי" /></label>
          <button type="submit">הוספה</button>
        </form>
      </section>
      <ScreenEditor screen={group} slides={group.slides} notices={group.notices} scope="group" buildings={buildings} feeds={feeds} />
    </main>
  );
}
