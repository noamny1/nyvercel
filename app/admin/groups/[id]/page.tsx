import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ScreenEditor } from "@/components/admin/ScreenEditor";
import { AdminNav } from "@/components/admin/AdminNav";
import { deleteAddress, moveAddress } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { screenWhere } from "@/lib/access";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function addressOf(street: string, number: string, city: string) {
  const place = [street, number].filter(Boolean).join(" ");
  return [place, city].filter(Boolean).join(", ");
}

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const owner = isSystemAdmin(session);
  const { id } = await params;
  const { edit } = await searchParams;
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
  const allowed = owner ? null : new Set((await prisma.screen.findMany({ where: await screenWhere(session), select: { id: true } })).map((screen) => screen.id));
  const screens = owner ? group.screens : group.screens.filter((screen) => allowed?.has(screen.id));
  if (!owner && screens.length === 0) notFound();
  const others = groups.filter((item) => item.id !== group.id);

  return (
    <main className="admin">
      <AdminNav />
      <p><Link href="/admin">כל הקבוצות</Link></p>
      <h1>{group.name}</h1>
      <section className="card">
        <h2>מסכים משויכים</h2>
        {screens.length === 0 ? <p>אין עדיין כתובת בקבוצה. יוצרים כתובת בלשונית בניינים ומשייכים אותה לכאן.</p> : null}
        <div className="screens">
          {screens.map((screen) => {
            const street = screen.street || group.street;
            const number = screen.number || group.number;
            const city = screen.city || group.city;
            const label = addressOf(street, number, city) || screen.name;
            return (
              <div key={screen.id}>
                <span className="screen-title">
                  מסך {screen.code || screen.id}
                  <small>{label}</small>
                </span>
                <span className="screen-actions">
                  <a href={`/s/${screen.code || screen.id}`} target="_blank">פתיחה</a>
                  {owner && others.length > 0 ? (
                    <form action={moveAddress}>
                      <input type="hidden" name="screenId" value={screen.id} />
                      <input type="hidden" name="groupId" value={group.id} />
                      <input type="hidden" name="label" value={label} />
                      <input type="hidden" name="street" value={street} />
                      <input type="hidden" name="number" value={number} />
                      <input type="hidden" name="city" value={city} />
                      <select name="targetGroupId" defaultValue={others[0]?.id || ""} aria-label="קבוצה אחרת">
                        {others.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                      <button className="light" type="submit">העברה</button>
                    </form>
                  ) : null}
                  {owner ? (
                    <form action={deleteAddress}>
                      <input type="hidden" name="screenId" value={screen.id} />
                      <input type="hidden" name="groupId" value={group.id} />
                      <input type="hidden" name="label" value={label} />
                      <button className="light" type="submit">מחיקה</button>
                    </form>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <p><Link href={edit ? `/admin/groups/${group.id}` : `/admin/groups/${group.id}?edit=1`}>{edit ? "סגירת עריכת התוכן" : "עריכת תוכן הקבוצה"}</Link></p>
      {edit ? <ScreenEditor screen={group} slides={group.slides} notices={group.notices} scope="group" buildings={buildings} feeds={feeds} newsTuning={owner} /> : null}
    </main>
  );
}
