import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { ScreenEditor } from "@/components/admin/ScreenEditor";
import { deleteUpdate, saveUpdate } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { screenWhere } from "@/lib/access";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function line(screen: { id: number; street: string; number: string; city: string; name: string; group: { street: string; number: string; city: string } | null }) {
  const place = [screen.street || screen.group?.street || "", screen.number || screen.group?.number || ""].filter(Boolean).join(" ");
  return [place, screen.city || screen.group?.city || ""].filter(Boolean).join(", ") || screen.name || `מסך ${screen.id}`;
}

export default async function ScreenPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const { id } = await params;
  const where = await screenWhere(session);
  const screen = await prisma.screen.findFirst({
    where: { id: Number(id), ...where },
    include: {
      group: true,
      slides: { orderBy: { sort: "asc" } },
      notices: { orderBy: { id: "desc" } },
      updates: { orderBy: { id: "desc" }, include: { screens: { select: { id: true } } } },
    },
  });
  if (!screen) notFound();
  const screens = await prisma.screen.findMany({ where, orderBy: { id: "asc" }, include: { group: true } });
  const owner = isSystemAdmin(session);

  return (
    <main className="admin">
      <AdminNav />
      <p><Link href="/admin/buildings">כל הבניינים</Link></p>
      <h1>{line(screen)}</h1>
      <section className="card">
        <h2>הודעות בניין</h2>
        <p>הודעה מופיעה במסכים שמסומנים. אפשר לעדכן או למחוק אותה מכאן.</p>
        {screen.updates.map((update) => (
          <form key={update.id} action={saveUpdate}>
            <input type="hidden" name="id" value={update.id} />
            <input type="hidden" name="returnId" value={screen.id} />
            <label>טקסט<textarea name="text" defaultValue={update.text} required /></label>
            <div className="picks">
              {screens.map((item) => (
                <label key={item.id}>
                  <input type="checkbox" name="screenId" value={item.id} defaultChecked={update.screens.some((chosen) => chosen.id === item.id)} />
                  מסך {item.id} · {line(item)}
                </label>
              ))}
            </div>
            <div className="row">
              <button type="submit">שמירה</button>
              <button className="light" formAction={deleteUpdate} type="submit">מחיקה</button>
            </div>
          </form>
        ))}
        <form action={saveUpdate}>
          <input type="hidden" name="returnId" value={screen.id} />
          <label>הודעה חדשה<textarea name="text" required placeholder="המעלית לא פעילה היום" /></label>
          <div className="picks">
            {screens.map((item) => (
              <label key={item.id}>
                <input type="checkbox" name="screenId" value={item.id} defaultChecked={item.id === screen.id} />
                מסך {item.id} · {line(item)}
              </label>
            ))}
          </div>
          <button type="submit">הוספה</button>
        </form>
      </section>
      {owner ? <ScreenEditor screen={screen} slides={screen.slides} notices={screen.notices} /> : null}
    </main>
  );
}
