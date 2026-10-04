import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { UsersPanel } from "@/components/admin/UsersPanel";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  if (!isSystemAdmin(session)) redirect("/admin");
  const { q = "" } = await searchParams;
  const query = q.trim();
  const [screens, users] = await Promise.all([
    prisma.screen.findMany({ orderBy: { id: "asc" }, include: { group: true } }),
    query
      ? prisma.user.findMany({
          where: {
            role: "client",
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          },
          orderBy: { name: "asc" },
          take: 8,
          include: { screens: { select: { id: true } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <main className="admin">
      <AdminNav />
      <h1>משתמשים</h1>
      <p>יוצרים לקוח, או מחפשים משתמש קיים לפי שם או אימייל.</p>
      <UsersPanel
        query={query}
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
