import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { deleteUpdate, saveUpdate } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { screenWhere } from "@/lib/access";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function line(screen: { id: number; street: string; number: string; city: string; name: string; group: { street: string; number: string; city: string } | null }) {
  const place = [screen.street || screen.group?.street || "", screen.number || screen.group?.number || ""].filter(Boolean).join(" ");
  return [place, screen.city || screen.group?.city || ""].filter(Boolean).join(", ") || screen.name || `מסך ${screen.id}`;
}

export default async function UpdatesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const { id } = await params;
  const screenId = Number(id);
  const where = await screenWhere(session);
  const [current, screens] = await Promise.all([
    prisma.screen.findFirst({ where: { id: screenId, ...where }, include: { group: true, updates: { orderBy: { id: "desc" }, include: { screens: { select: { id: true } } } } } }),
    prisma.screen.findMany({ where, orderBy: { id: "asc" }, include: { group: true } }),
  ]);
  if (!current) notFound();

  return (
    <main className="admin">
      <AdminNav />
      <p><Link href="/admin/buildings">כל הבניינים</Link></p>
      <h1>עדכונים · מסך {current.id}</h1>
      <p>{line(current)}. עדכון יכול להופיע גם במסכים נוספים שמסומנים.</p>
      {current.updates.map((update) => (
        <form className="card" key={update.id} action={saveUpdate}>
          <input type="hidden" name="id" value={update.id} />
          <input type="hidden" name="returnId" value={current.id} />
          <label>טקסט העדכון<textarea name="text" defaultValue={update.text} required /></label>
          <div className="picks">
            {screens.map((screen) => (
              <label key={screen.id}>
                <input type="checkbox" name="screenId" value={screen.id} defaultChecked={update.screens.some((item) => item.id === screen.id)} />
                מסך {screen.id} · {line(screen)}
              </label>
            ))}
          </div>
          <div className="row">
            <button type="submit">שמירה</button>
            <button className="light" formAction={deleteUpdate} type="submit">מחיקה</button>
          </div>
        </form>
      ))}
      <form className="card" action={saveUpdate}>
        <h2>עדכון חדש</h2>
        <input type="hidden" name="returnId" value={current.id} />
        <label>טקסט העדכון<textarea name="text" required placeholder="המעלית לא פעילה היום" /></label>
        <div className="picks">
          {screens.map((screen) => (
            <label key={screen.id}>
              <input type="checkbox" name="screenId" value={screen.id} defaultChecked={screen.id === current.id} />
              מסך {screen.id} · {line(screen)}
            </label>
          ))}
        </div>
        <button type="submit">הוספה</button>
      </form>
    </main>
  );
}
