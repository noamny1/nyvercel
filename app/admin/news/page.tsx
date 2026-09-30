import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { deleteFeed, saveFeed } from "@/app/admin/actions";
import { NEWS_SOURCES } from "@/lib/news";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  for (const source of NEWS_SOURCES) {
    await prisma.feed.upsert({ where: { id: source.id }, update: {}, create: source });
  }
  const feeds = await prisma.feed.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="admin">
      <AdminNav />
      <h1>מקורות חדשות</h1>
      {feeds.map((feed) => (
        <div className="card row" key={feed.id}>
          <span>{feed.name}</span>
          <span>{feed.url}</span>
          <form action={deleteFeed}>
            <input type="hidden" name="id" value={feed.id} />
            <button className="light" type="submit">מחיקה</button>
          </form>
        </div>
      ))}
      <form className="card" action={saveFeed}>
        <h2>מקור חדש</h2>
        <div className="row">
          <label>קוד<input name="id" required placeholder="channel14" /></label>
          <label>שם<input name="name" required /></label>
          <label>כתובת RSS<input name="url" required /></label>
          <button type="submit">שמירה</button>
        </div>
      </form>
    </main>
  );
}
