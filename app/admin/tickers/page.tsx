import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { addTicker, deleteTicker } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TickersPage() {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const groups = await prisma.screenGroup.findMany({
    orderBy: { id: "asc" },
    include: { tickers: { orderBy: { id: "desc" } } },
  });

  return (
    <main className="admin">
      <AdminNav />
      <h1>טיקרים</h1>
      <p>הטקסט רץ במסך יחד עם פס החדשות.</p>
      {groups.map((group) => (
        <section className="card" key={group.id}>
          <h2>{group.name}</h2>
          {group.tickers.map((ticker) => (
            <div className="row" key={ticker.id}>
              <span>{ticker.text}</span>
              <form action={deleteTicker}>
                <input type="hidden" name="id" value={ticker.id} />
                <button className="light" type="submit">מחיקה</button>
              </form>
            </div>
          ))}
          <form className="row" action={addTicker}>
            <input type="hidden" name="groupId" value={group.id} />
            <input name="text" placeholder="טקסט לטיקר" required />
            <button type="submit">הוספה</button>
          </form>
        </section>
      ))}
    </main>
  );
}
