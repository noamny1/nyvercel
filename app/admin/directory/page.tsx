import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { addFloor, addRoom, deleteFloor } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const groups = await prisma.screenGroup.findMany({
    orderBy: { id: "asc" },
    include: { floors: { include: { rooms: true }, orderBy: { id: "asc" } } },
  });

  return (
    <main className="admin">
      <AdminNav />
      <h1>קומות וחדרים</h1>
      {groups.map((group) => (
        <section className="card" key={group.id}>
          <h2>{group.name}</h2>
          {group.floors.map((floor) => (
            <div key={floor.id} style={{ marginTop: 10 }}>
              <div className="row">
                <strong>{floor.name}</strong>
                <form action={deleteFloor}>
                  <input type="hidden" name="id" value={floor.id} />
                  <button className="light" type="submit">מחיקת קומה</button>
                </form>
              </div>
              {floor.rooms.map((room) => (
                <div key={room.id}>{room.name}{room.detail ? ` · ${room.detail}` : ""}</div>
              ))}
              <form className="row" action={addRoom}>
                <input type="hidden" name="floorId" value={floor.id} />
                <input name="name" placeholder="חדר" required />
                <input name="detail" placeholder="פירוט" />
                <button type="submit">חדר</button>
              </form>
            </div>
          ))}
          <form className="row" action={addFloor} style={{ marginTop: 12 }}>
            <input type="hidden" name="groupId" value={group.id} />
            <input name="name" placeholder="קומה" required />
            <button type="submit">קומה</button>
          </form>
        </section>
      ))}
    </main>
  );
}
