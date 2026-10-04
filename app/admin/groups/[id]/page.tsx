import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ScreenEditor } from "@/components/admin/ScreenEditor";
import { AdminNav } from "@/components/admin/AdminNav";
import { addAddress, clearGroupAddress, moveScreen, removeScreen } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
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
  const others = groups.filter((item) => item.id !== group.id);
  const rows: { key: string; label: string; screenId: number | null }[] = [];
  for (const screen of group.screens) {
    const own = addressOf(screen.street, screen.number, screen.city);
    if (own) rows.push({ key: `s-${screen.id}`, label: own, screenId: screen.id });
  }
  const groupLabel = addressOf(group.street, group.number, group.city);
  if (groupLabel && !rows.some((row) => row.label === groupLabel)) {
    const blank = group.screens.find((screen) => !addressOf(screen.street, screen.number, screen.city));
    rows.unshift({ key: blank ? `s-${blank.id}` : "group", label: groupLabel, screenId: blank?.id ?? null });
  }

  return (
    <main className="admin">
      <AdminNav />
      <p><Link href="/admin">כל הקבוצות</Link></p>
      <h1>{group.name}</h1>
      <section className="card">
        <h2>כתובות</h2>
        {rows.length === 0 ? <p>אין עדיין כתובות בקבוצה.</p> : null}
        <div className="screens">
          {rows.map((row) => (
            <div key={row.key}>
              <span>{row.label}</span>
              {owner ? (
                <span className="screen-actions">
                  {others.length > 0 && row.screenId ? (
                    <form action={moveScreen}>
                      <input type="hidden" name="id" value={row.screenId} />
                      <input type="hidden" name="groupId" value={group.id} />
                      <select name="targetGroupId" defaultValue={others[0]?.id || ""} aria-label="קבוצה אחרת">
                        {others.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                      <button className="light" type="submit">העברה</button>
                    </form>
                  ) : null}
                  {row.screenId ? (
                    <form action={removeScreen}>
                      <input type="hidden" name="id" value={row.screenId} />
                      <input type="hidden" name="groupId" value={group.id} />
                      <button className="light" type="submit">מחיקה</button>
                    </form>
                  ) : (
                    <form action={clearGroupAddress}>
                      <input type="hidden" name="groupId" value={group.id} />
                      <button className="light" type="submit">מחיקה</button>
                    </form>
                  )}
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <form className="row" action={addAddress} style={{ marginTop: 12 }}>
          <input type="hidden" name="groupId" value={group.id} />
          <label>רחוב<input name="street" required /></label>
          <label>מספר<input name="number" required /></label>
          <label>עיר<input name="city" required /></label>
          <button type="submit">הוספת כתובת</button>
        </form>
      </section>
      <p><Link href={edit ? `/admin/groups/${group.id}` : `/admin/groups/${group.id}?edit=1`}>{edit ? "סגירת עריכת התוכן" : "עריכת תוכן הקבוצה"}</Link></p>
      {edit ? <ScreenEditor screen={group} slides={group.slides} notices={group.notices} scope="group" buildings={buildings} feeds={feeds} /> : null}
    </main>
  );
}
