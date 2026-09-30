import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { setMusic } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MusicPage() {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const groups = await prisma.screenGroup.findMany({ orderBy: { id: "asc" } });

  return (
    <main className="admin">
      <AdminNav />
      <h1>מוזיקה</h1>
      <p>קישור לקובץ שמע שמתנגן במסכים של הקבוצה. נעצר אוטומטית כשאין קישור.</p>
      {groups.map((group) => (
        <form className="card row" action={setMusic} key={group.id}>
          <input type="hidden" name="id" value={group.id} />
          <strong>{group.name}</strong>
          <input name="musicUrl" defaultValue={group.musicUrl} placeholder="https://...mp3" />
          <button type="submit">שמירה</button>
        </form>
      ))}
    </main>
  );
}
