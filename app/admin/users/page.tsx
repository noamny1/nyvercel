import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { UsersPanel } from "@/components/admin/UsersPanel";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  if (!isSystemAdmin(session)) redirect("/admin");
  const [screens, users] = await Promise.all([
    prisma.screen.findMany({ orderBy: { id: "asc" }, include: { group: true } }),
    prisma.user.findMany({
      where: { role: "client" },
      orderBy: { id: "asc" },
      include: { screens: { select: { id: true } } },
    }),
  ]);

  return (
    <main className="admin">
      <AdminNav />
      <h1>משתמשים</h1>
      <p>יוצרים לקוח, משייכים לו מסכים, ומעתיקים לו קישור כניסה עם האימייל והסיסמה.</p>
      <UsersPanel
        screens={screens.map((screen) => ({
          id: screen.id,
          street: screen.street || screen.group?.street || "",
          number: screen.number || screen.group?.number || "",
          city: screen.city || screen.group?.city || "",
          name: screen.name,
        }))}
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          screenIds: user.screens.map((screen) => screen.id),
        }))}
      />
    </main>
  );
}
