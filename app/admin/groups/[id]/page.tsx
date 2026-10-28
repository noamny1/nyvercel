import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ScreenEditor } from "@/components/admin/ScreenEditor";
import { AdminNav } from "@/components/admin/AdminNav";
import { GroupScreenList } from "@/components/admin/GroupScreenList";
import { deleteAddress, moveAddress, renameGroup, reorderGroupScreens } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { screenWhere } from "@/lib/access";
import { NEWS_SOURCES } from "@/lib/news-sources";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { editorThemes } from "@/lib/themes";

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
        screens: { orderBy: [{ listSort: "asc" }, { id: "asc" }] },
        memberships: { include: { screen: true }, orderBy: { screenId: "asc" } },
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
  const primaryIds = new Set(group.screens.map((screen) => screen.id));
  const attached = [
    ...group.screens.map((screen) => ({ screen, shared: false })),
    ...group.memberships
      .filter((link) => !primaryIds.has(link.screen.id))
      .map((link) => ({ screen: link.screen, shared: true })),
  ];
  const screens = owner ? attached : attached.filter((item) => allowed?.has(item.screen.id));
  if (!owner && screens.length === 0) notFound();
  const others = groups.filter((item) => item.id !== group.id);

  return (
    <main className="admin">
      <AdminNav />
      <p><Link href="/admin">כל הקבוצות</Link></p>
      {owner ? (
        <form className="card group-name" action={renameGroup}>
          <input type="hidden" name="id" value={group.id} />
          <label>שם הקבוצה<input name="name" defaultValue={group.name} required /></label>
          <button type="submit">עדכון שם</button>
        </form>
      ) : <h1>{group.name}</h1>}
      <section className="card">
        <h2>מסכים משויכים</h2>
        <GroupScreenList
          groupId={group.id}
          owner={owner}
          others={others}
          moveAddress={moveAddress}
          deleteAddress={deleteAddress}
          saveOrder={reorderGroupScreens}
          rows={screens.map(({ screen, shared }) => {
            const street = screen.street || group.street;
            const number = screen.number || group.number;
            const city = screen.city || group.city;
            return {
              id: screen.id,
              code: screen.code,
              street,
              number,
              city,
              floor: screen.floor || "לובי",
              label: addressOf(street, number, city) || screen.name,
              shared,
            };
          })}
        />
      </section>
      <p><Link href={edit ? `/admin/groups/${group.id}` : `/admin/groups/${group.id}?edit=1`}>{edit ? "סגירת עריכת התוכן" : "עריכת תוכן הקבוצה"}</Link></p>
      {edit ? <ScreenEditor screen={group} slides={group.slides} notices={group.notices} scope="group" buildings={buildings} feeds={[...NEWS_SOURCES, ...feeds.filter((feed) => !NEWS_SOURCES.some((item) => item.id === feed.id))]} newsTuning={owner} themes={await editorThemes(owner)} /> : null}
    </main>
  );
}
