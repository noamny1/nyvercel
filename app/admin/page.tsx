import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { createScreen } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  const screens = await prisma.screen.findMany({ orderBy: { id: "asc" } });

  return (
    <main className="admin">
      <h1>מסכים</h1>
      <p>המסך בבניין נפתח בכתובת <b>/s/מספר</b>.</p>
      <div className="screens">
        {screens.map((screen) => (
          <Link key={screen.id} href={`/admin/screens/${screen.id}`}>
            <span>{screen.name}</span>
            <span>/s/{screen.id}</span>
          </Link>
        ))}
      </div>
      <form className="card" action={createScreen}>
        <h2>מסך חדש</h2>
        <div className="row">
          <label>שם<input name="name" required placeholder="לובי" /></label>
          <label>רחוב<input name="street" required /></label>
          <label>מספר<input name="number" required /></label>
          <label>עיר<input name="city" required /></label>
          <button type="submit">יצירה</button>
        </div>
      </form>
    </main>
  );
}
