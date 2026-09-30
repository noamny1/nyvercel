import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ScreenEditor } from "@/components/admin/ScreenEditor";
import { addScreenToGroup, removeScreen } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const { id } = await params;
  const group = await prisma.screenGroup.findUnique({
    where: { id: Number(id) },
    include: {
      screens: { orderBy: { id: "asc" } },
      slides: { orderBy: { sort: "asc" } },
      notices: { orderBy: { id: "desc" } },
    },
  });
  if (!group) notFound();

  return (
    <main className="admin">
      <p><Link href="/admin">כל הקבוצות</Link></p>
      <h1>{group.name}</h1>
      <ScreenEditor screen={group} slides={group.slides} notices={group.notices} scope="group" />
      <section className="card">
        <h2>מסכים בקבוצה</h2>
        <p>כל מסך נפתח בכתובת משלו ומציג את תוכן הקבוצה.</p>
        {group.screens.map((screen) => (
          <div className="row" key={screen.id} style={{ marginTop: 8 }}>
            <span>{screen.name}</span>
            <a href={`/s/${screen.id}`} target="_blank">/s/{screen.id}</a>
            <form action={removeScreen}>
              <input type="hidden" name="id" value={screen.id} />
              <input type="hidden" name="groupId" value={group.id} />
              <button className="light" type="submit">הסרה</button>
            </form>
          </div>
        ))}
        <form className="row" action={addScreenToGroup} style={{ marginTop: 12 }}>
          <input type="hidden" name="groupId" value={group.id} />
          <label>מסך חדש<input name="name" required placeholder="לובי" /></label>
          <button type="submit">הוספה</button>
        </form>
      </section>
    </main>
  );
}
