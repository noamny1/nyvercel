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
  const users = query
    ? await prisma.user.findMany({
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
    : [];

  return (
    <main className="admin">
      <AdminNav />
      <h1>משתמשים</h1>
      <p>יוצרים לקוח, או מחפשים משתמש קיים לפי שם או אימייל.</p>
      <UsersPanel
        query={query}
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
