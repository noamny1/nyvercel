import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { createBuilding, deleteBuilding } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BuildingsPage() {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const buildings = await prisma.building.findMany({ orderBy: { id: "asc" }, include: { groups: true } });

  return (
    <main className="admin">
      <AdminNav />
      <h1>בניינים</h1>
      <p>בניין הוא היישוב מהמערכת הישנה. קבוצת מסכים משויכת אליו.</p>
      {buildings.map((building) => (
        <div className="card row" key={building.id}>
          <span>{[building.street, building.number, building.city].filter(Boolean).join(" ") || building.name}</span>
          <span>{building.groups.length} קבוצות</span>
          <form action={deleteBuilding}>
            <input type="hidden" name="id" value={building.id} />
            <button className="light" type="submit">מחיקה</button>
          </form>
        </div>
      ))}
      <form className="card" action={createBuilding}>
        <h2>בניין חדש</h2>
        <div className="row">
          <label>רחוב<input name="street" required /></label>
          <label>מספר<input name="number" required /></label>
          <label>עיר<input name="city" required /></label>
          <button type="submit">יצירה</button>
        </div>
      </form>
    </main>
  );
}
